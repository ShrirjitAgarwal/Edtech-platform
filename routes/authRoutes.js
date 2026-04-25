const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  const { name, email, password, role, class: studentClass, teacherId } = req.body;
  try {
    const existing = await User.findOne({ email });
if(existing){
  return res.json({ error: "User already exists" });
}
// 🔐 HASH PASSWORD
const hashedPassword = await bcrypt.hash(password, 10);
const user = await User.create({
  name,
  email,
  password: hashedPassword,
  role: role || "teacher",
  class: studentClass,
  teacherId
});
    res.json({ status: "created", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---------- LOGIN ----------
console.log("AUTH LOGIN HIT");
router.post("/login", async (req, res) => {
  const emailInput = (req.body.email || "").trim().toLowerCase();
const passwordInput = (req.body.password || "").trim();
  try {
const user = await User.findOne({ email: emailInput });
console.log("EMAIL INPUT:", emailInput);
console.log("USER FOUND:", user);
if (user) {
  console.log("ENTERED PASSWORD:", passwordInput);
  console.log("HASH IN DB:", user.password);
}
if (!user) {
  return res.status(401).json({ error: "Invalid credentials" });
}
// 🔐 COMPARE HASHED PASSWORD
console.log("USER FOUND:", !!user);
console.log("RAW INPUT PASSWORD:", `"${passwordInput}"`);
console.log("HASH FROM DB:", user.password);
// create new hash just for comparison (debug only)
const testHash = await bcrypt.hash(passwordInput, 10);
console.log("NEW HASH OF INPUT:", testHash);
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
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
const safeUser = {
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
};
// 🔥 ADD THIS
const Student = require("../models/Student");
let studentData = null;
if (user.role === "student") {
  console.log("LOGIN USER:", {
    id: user._id,
    email: user.email,
    name: user.name
  });
  const allStudents = await Student.find();
  console.log("ALL STUDENTS:", allStudents);
  studentData = await Student.findOne({
    $or: [
      { userId: user._id },
      { email: user.email },
      { name: user.name }
    ]
  });
  console.log("MATCHED STUDENT:", studentData);
}
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
module.exports = router;