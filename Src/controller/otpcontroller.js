const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { pool, sql } = require("../config/dbconfig");
const { saveOtp, getOtp, deleteOtp } = require("../models/otpmodels");

// Use the new HTTP API mailer instead of SMTP
const transporter = require("../config/Mailer");

// Helper function to check if we can send to this email
const canSendToEmail = (email) => {
  // List of allowed emails for testing (add your own)
  const allowedTestEmails = [
    "adityathakur6199@gmail.com",
    "adityathakur2199@gmail.com",
    "ramnareshchaudhary108@gmail.com",
    "RIZVI.MEESAM24@GMAIL.COM",
    "ops@transplus.in",
    "vrij.kishor@transplus.in",
  ];

  // If you have a verified domain, you can send to any email
  const hasVerifiedDomain = process.env.RESEND_VERIFIED_DOMAIN === "true";

  return hasVerifiedDomain || allowedTestEmails.includes(email.toLowerCase());
};

// Step 1: Validate password → send OTP
exports.sendOtpAfterPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Check if we can send emails to this address
    if (!canSendToEmail(email)) {
      return res.status(403).json({
        message:
          "Email service is in testing mode. Please contact administrator or use a verified email address.",
        success: false,
        code: "EMAIL_RESTRICTED",
      });
    }

    // Lookup user
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM users WHERE email = @email");

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    saveOtp(email, otp, expiresAt);

    try {
      // Send email using HTTP API
      await transporter.sendMail({
        from: "onboarding@resend.dev", // Using Resend's test domain
        to: email,
        subject: "Your Secure Login Code",
        text: `Your OTP is ${otp}. It expires in 5 minutes. If you didn't request this, please ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔐 Security Code</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your one-time password</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px; text-align: center;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">
                Hello! Enter this verification code to complete your secure login:
              </p>
              
              <!-- OTP Display -->
              <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; margin: 30px 0; display: inline-block;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2d3748; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>
              
              <!-- Warning Box -->
              <div style="background: #fef3cd; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; text-align: left; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.4;">
                  <strong>⏰ Important:</strong><br>
                  • This code expires in <strong>5 minutes</strong><br>
                  • Don't share this code with anyone<br>
                  • If you didn't request this, ignore this email
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Having trouble? Contact our support team for assistance.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                This email was sent from a secure system. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`✅ OTP sent successfully to ${email} via HTTP API`);
      res.json({
        message: "OTP sent to your email",
        success: true,
      });
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);

      // Handle specific Resend errors
      if (
        emailError.message.includes("403") &&
        emailError.message.includes("testing emails")
      ) {
        return res.status(403).json({
          message:
            "Email service is in testing mode. Please verify your domain in Resend dashboard or contact administrator.",
          success: false,
          code: "DOMAIN_NOT_VERIFIED",
          hint: "Visit resend.com/domains to verify your domain",
        });
      }

      // Other error handling
      let errorMessage = "Failed to send OTP. Please try again.";

      if (emailError.message.includes("Invalid `from` field")) {
        errorMessage = "Email configuration error. Please contact support.";
      } else if (emailError.message.includes("401")) {
        errorMessage =
          "Email service authentication failed. Please try again later.";
      }

      res.status(500).json({
        message: errorMessage,
        success: false,
        // Only show detailed error in development
        ...(process.env.NODE_ENV === "development" && {
          error: emailError.message,
        }),
      });
    }
  } catch (err) {
    console.error("❌ General error:", err);
    res.status(500).json({
      message: "Server error. Please try again.",
      success: false,
    });
  }
};

// Step 2: Verify OTP → generate JWT (unchanged)
exports.verifyOtpAndLogin = async (req, res) => {
  const { email, otp } = req.body;

  console.log("Received OTP verification request:", {
    email,
    otpLength: otp?.length,
  });

  // Validate input
  if (!email || !otp) {
    console.log("Missing email or OTP");
    return res.status(400).json({
      message: "Email and OTP are required",
      success: false,
    });
  }

  const data = getOtp(email);
  console.log(
    "OTP data from store:",
    data ? { hasData: true, expiresAt: new Date(data.expiresAt) } : null
  );

  if (!data) {
    console.log("OTP not found for email:", email);
    return res.status(400).json({
      message: "OTP not found or expired. Please request a new OTP",
      success: false,
    });
  }

  if (Date.now() > data.expiresAt) {
    console.log("OTP expired for email:", email);
    deleteOtp(email);
    return res.status(400).json({
      message: "OTP expired. Please request a new OTP",
      success: false,
    });
  }

  // Ensure both OTPs are strings and trimmed for comparison
  const receivedOtp = String(otp).trim();
  const storedOtp = String(data.otp).trim();

  console.log("OTP comparison:", {
    receivedLength: receivedOtp.length,
    storedLength: storedOtp.length,
    match: receivedOtp === storedOtp,
  });

  if (receivedOtp !== storedOtp) {
    console.log("Invalid OTP provided");
    return res.status(400).json({
      message: "Invalid OTP. Please try again",
      success: false,
    });
  }

  // OTP is valid → issue JWT
  console.log("OTP verified successfully, deleting from store");
  deleteOtp(email);

  try {
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT id, name, email, role FROM users WHERE email = @email");

    if (result.recordset.length === 0) {
      console.log("User not found after OTP verification");
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const user = result.recordset[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    console.log("✅ Login successful, sending response");
    res.json({
      message: "Login successful",
      success: true,
      token,
      user,
    });
  } catch (err) {
    console.error("❌ Database error during OTP verification:", err);
    res.status(500).json({
      message: "Server error during login",
      success: false,
    });
  }
};
