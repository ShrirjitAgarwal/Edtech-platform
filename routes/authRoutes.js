const express = require("express");
const router = express.Router();
const User = require("../models/User");
const School = require("../models/School");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const crypto = require("crypto");
const RevokedToken = require("../models/RevokedToken");
const {
  logAuditEvent
} = require("../services/auditLogger");
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes."
  }
});
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many registration attempts. Please try again after 15 minutes."
  }
});
const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8q7pFEd5QxjZ2vZp7PvWjW7M8mKxNe";
function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}
// ---------- REGISTER ----------
// Public self-registration is disabled.
// Teachers/admins must be created by an authorized school admin.
// Platform admins must be created through the platform admin setup flow.
router.post("/register", registerLimiter, async (req, res) => {
  await logAuditEvent(req, {
    event: "public_registration_blocked",
    status: "failed",
    metadata: {
      email: String(req.body.email || "").trim().toLowerCase(),
      requestedRole: String(req.body.role || "").trim().toLowerCase(),
      schoolCode: String(req.body.schoolCode || "").trim().toUpperCase()
    },
    error: "Public registration disabled"
  });
  return res.status(403).json({
    error: "Public registration is disabled. Please contact your school admin."
  });
});
// ---------- LOGIN ----------
router.post("/login", loginLimiter, async (req, res) => {
  const emailInput = (req.body.email || "").trim().toLowerCase();
  const passwordInput = (req.body.password || "").trim();
  try {
    const user = await User.findOne({ email: emailInput });
    const passwordHashForCompare =
      user && String(user.password || "").startsWith("$2b$")
        ? user.password
        : DUMMY_PASSWORD_HASH;
    let isMatch = await bcrypt.compare(passwordInput, passwordHashForCompare);
    if (user && !String(user.password || "").startsWith("$2b$")) {
      isMatch = passwordInput === user.password;
      if (isMatch) {
        const newHashed = await bcrypt.hash(passwordInput, 10);
        user.password = newHashed;
        await user.save();
      }
    }
    if (!user || !isMatch) {
      await logAuditEvent(req, {
        event: "login_failed",
        status: "failed",
        actor: user || null,
        metadata: {
          email: emailInput,
          reason: user ? "password_mismatch" : "user_not_found"
        },
        error: "Invalid credentials"
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.role === "platform_admin") {
      await logAuditEvent(req, {
        event: "login_failed",
        status: "failed",
        actor: user,
        metadata: {
          email: emailInput,
          reason: "platform_admin_used_normal_login"
        },
        error: "Use platform admin login"
      });
      return res.status(403).json({
        error: "Use platform admin login"
      });
    }
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || null,
        schoolCode: user.schoolCode || null
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || null,
      schoolCode: user.schoolCode || null
    };
    const Student = require("../models/Student");
    let studentData = null;
    if (user.role === "student") {
      studentData = await Student.findOne({
        $or: [
          { userId: user._id },
          { email: user.email },
          { name: user.name }
        ]
      });
    }
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    await logAuditEvent(req, {
      event: "login_success",
      status: "success",
      actor: user,
      metadata: {
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || null,
        schoolCode: user.schoolCode || null
      }
    });
    res.json({
      status: "success",
      token,
      user: safeUser,
      student: studentData
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
router.post(
  "/register-teacher",
  authController.registerTeacher
);
router.post("/logout", async (req, res) => {
  const token =
    (req.cookies && req.cookies.authToken) ||
    (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null
    );
  let logoutActor = null;
  if (token) {
    try {
      logoutActor = jwt.verify(token, process.env.JWT_SECRET);
      const tokenHash = hashToken(token);
      const expiresAt = logoutActor.exp
        ? new Date(logoutActor.exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt > new Date()) {
        await RevokedToken.updateOne(
          {
            tokenHash
          },
          {
            $setOnInsert: {
              tokenHash,
              userId: logoutActor.id || null,
              role: logoutActor.role || null,
              expiresAt
            }
          },
          {
            upsert: true
          }
        );
      }
    } catch (err) {
      logoutActor = null;
    }
  }
  await logAuditEvent(req, {
    event: "logout",
    status: "success",
    actor: logoutActor,
    metadata: {
      hadCookie: Boolean(req.cookies && req.cookies.authToken),
      hadBearerToken: Boolean(
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
      )
    }
  });
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
  res.json({
    status: "logged_out"
  });
});
module.exports = router;