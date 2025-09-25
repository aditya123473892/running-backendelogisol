const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 587, // or 587 for STARTTLS
  secure: false, // true for 465, false for 587
  auth: {
    user: "resend", // This is always "resend" for Resend API
    pass: process.env.RESEND_API_KEY, // Your Resend API key (starts with re_)
  },
});

module.exports = transporter;
