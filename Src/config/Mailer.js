const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// HTTP API version - works on Render free tier (no SMTP ports needed)
class ResendMailer {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.apiUrl = "https://api.resend.com/emails";
  }

  async sendMail(mailOptions) {
    try {
      // Use native fetch (Node.js 18+) or install node-fetch for older versions
      const fetch = global.fetch || require("node-fetch");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: mailOptions.from || "onboarding@resend.dev",
          to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Resend API error response:", errorData);
        throw new Error(`Resend API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("✅ Email sent successfully via HTTP API:", result.id);

      // Return nodemailer-compatible response for existing code compatibility
      return {
        messageId: result.id,
        response: `250 Message queued as ${result.id}`,
        accepted: [mailOptions.to],
        rejected: [],
        pending: [],
        envelope: {
          from: mailOptions.from,
          to: [mailOptions.to],
        },
      };
    } catch (error) {
      console.error("❌ Resend HTTP API error:", error.message);
      throw error;
    }
  }

  // Add compatibility method for any existing transporter.verify() calls
  async verify() {
    try {
      if (!this.apiKey) {
        throw new Error("RESEND_API_KEY not found in environment variables");
      }

      // Simple API test - you could enhance this with a test email
      const fetch = global.fetch || require("node-fetch");
      const response = await fetch("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("✅ Resend API connection verified");
        return true;
      } else {
        throw new Error(`API verification failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Resend API verification failed:", error.message);
      throw error;
    }
  }
}

module.exports = new ResendMailer();
