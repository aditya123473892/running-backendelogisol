const express = require("express");
const router = express.Router();
const authController = require("../controller/authcontroller");
const otpController = require("../controller/otpcontroller");

router.post("/signup", authController.signup);

// OTP-based login with password
router.post("/request-otp", otpController.sendOtpAfterPassword); // Step 1
router.post("/verify-otp", otpController.verifyOtpAndLogin);     // Step 2

module.exports = router;
