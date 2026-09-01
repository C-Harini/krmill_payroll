const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");          // ✅ FIX 1
const { Op } = require("sequelize");         // ✅ FIX 3
const crypto = require("crypto");            // ✅ For secure password reset tokens
const db = require("../models");

const User = db.User;

/* =========================
   NORMAL LOGIN (EMAIL/PASSWORD)
========================= */
const login = async (req, res) => {
  console.log("Received login request with body:", req.body); // Debug log
  try {
    const { identifier, password } = req.body;

    // 1️⃣ Find user by email OR phone number
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phoneNumber: identifier }
        ]
      }
    });

    // 2️⃣ User not found
    if (!user) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    // 3️⃣ Check status
    if (user.status !== "Active") {
      return res.status(403).json({ msg: "User account is inactive" });
    }

    // 4️⃣ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid email or password" });
    }

    // 5️⃣ Update last login
    user.lastLogin = new Date();
    await user.save();

    // 6️⃣ Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        companyId: user.companyId,
        employeeId: user.employeeId
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      msg: "Login successful",
      token
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};



/* =========================
   FORGOT PASSWORD
========================= */
const forgotPassword = async (req, res) => {
  console.log("Received forgot password request with body:", req.body);
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // For security, return generic success even if user not found,
      // but log it for easier development
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({
        msg: "If a user with this email exists, a password reset link has been sent."
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour expiry

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    console.log("-----------------------------------------");
    console.log(`PASSWORD RESET REQUEST FOR: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("-----------------------------------------");

    return res.status(200).json({
      msg: "If a user with this email exists, a password reset link has been sent.",
      // Expose reset link in response in development environment for easier testing
      resetLink: process.env.NODE_ENV !== "production" ? resetLink : undefined
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

/* =========================
   RESET PASSWORD
========================= */
const resetPassword = async (req, res) => {
  console.log("Received reset password request with body:", req.body);
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ msg: "Token and new password are required" });
    }

    // Find active user with valid token and not expired
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({ msg: "Password has been reset successfully" });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

/* ✅ FIX 2: EXPORT ALL */
module.exports = {
  login,
  forgotPassword,
  resetPassword
};
