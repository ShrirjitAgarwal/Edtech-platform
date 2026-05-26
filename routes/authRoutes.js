const express = require("express");
const router = express.Router();
const User = require("../models/User");
const School = require("../models/School");
const bcrypt = require("bcrypt");
const authController = require("../controllers/authController");
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
// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  const {
  name,
  email,
  password,
  role,
  class: studentClass,
  teacherId,
  schoolCode
} = req.body;
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "teacher").trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (normalizedRole === "admin") {
      return res.status(403).json({
        error: "Admin accounts must be created by an existing admin"
      });
    }

    if (!["teacher", "student"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
if(existing){
  return res.json({ error: "User already exists" });
}
let school = null;

if (schoolCode) {
  school = await School.findOne({
    code: String(schoolCode).trim().toUpperCase()
  });
}

if (!school) {
  return res.status(400).json({
    error: "Valid school code required"
  });
}

// 🔐 HASH PASSWORD
const hashedPassword = await bcrypt.hash(password, 10);

const user = await User.create({
  name: String(name || "").trim(),
  email: normalizedEmail,
  password: hashedPassword,
  role: normalizedRole,
  class: studentClass,
  teacherId,
  schoolId: String(school._id),
  schoolCode: school.code
});
    res.json({
  status: "created",
  user,
  school
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---------- LOGIN ----------
console.log("AUTH LOGIN HIT");
router.post("/login", loginLimiter, async (req, res) => {
  const emailInput = (req.body.email || "").trim().toLowerCase();
const passwordInput = (req.body.password || "").trim();
  try {
const user = await User.findOne({ email: emailInput });
console.log("EMAIL INPUT:", emailInput);
console.log("USER FOUND:", !!user);

if (!user) {
  return res.status(401).json({ error: "Invalid credentials" });
}
let isMatch = false;
// 🔍 CHECK IF PASSWORD IS HASHED
if (user.password.startsWith("$2b$")) {
  // ✅ NEW USERS (HASHED)
  isMatch = await bcrypt.compare(passwordInput, user.password);
} else {
  // ⚠️ OLD USERS (PLAIN TEXT)
  isMatch = passwordInput === user.password;
  if (isMatch) {
    // 🔐 UPGRADE TO HASH
    const newHashed = await bcrypt.hash(passwordInput, 10);
    user.password = newHashed;
    await user.save();
    console.log("Password upgraded to bcrypt");
  }
}
// ❌ INVALID PASSWORD
if (!isMatch) {
  return res.status(401).json({ error: "Invalid credentials" });
}
    const jwt = require("jsonwebtoken");
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
// 🔥 ADD THIS
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
  console.log("MATCHED STUDENT:", studentData);
}
res.cookie("authToken", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// 🔁 UPDATED RESPONSE
res.json({
  status: "success",
  token,
  user: safeUser,
  student: studentData
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post(
  "/register-teacher",
  authController.registerTeacher
);
router.post("/logout", (req, res) => {
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