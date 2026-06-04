const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const platformLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many platform login attempts. Please try again after 15 minutes."
  }
});
router.get("/platform-login", (req, res) => {
  res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
  <div style="
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:24px;
    box-sizing:border-box;
  ">
    <div style="
      width:100%;
      max-width:420px;
      background:white;
      padding:28px;
      border-radius:16px;
      box-shadow:0 8px 20px rgba(0,0,0,0.08);
    ">
      <h1 style="margin-top:0;">Platform Admin Login</h1>
      <p style="color:#64748b;">
        Use this only for platform-level school setup and administration.
      </p>
      <input
        id="email"
        placeholder="Email"
        type="email"
        style="
          width:100%;
          padding:12px;
          margin-bottom:12px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          box-sizing:border-box;
        "
      />
      <input
        id="password"
        placeholder="Password"
        type="password"
        style="
          width:100%;
          padding:12px;
          margin-bottom:16px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          box-sizing:border-box;
        "
      />
      <button
        onclick="platformLogin()"
        style="
          width:100%;
          padding:12px;
          background:#1e293b;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        "
      >
        Login
      </button>
      <p id="error" style="color:#dc2626;font-weight:600;"></p>
    </div>
  </div>
<script>
function platformLogin(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!email || !password){
    document.getElementById("error").textContent = "Email and password are required";
    return;
  }
  fetch("/platform-login", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      document.getElementById("error").textContent = data.error;
      return;
    }
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.replace("/platform/schools");
  })
  .catch(() => {
    document.getElementById("error").textContent = "Login failed";
  });
}
</script>
</body>
`);
});
router.post("/platform-login", platformLoginLimiter, async (req, res) => {
  try {
    const emailInput = String(req.body.email || "").trim().toLowerCase();
    const passwordInput = String(req.body.password || "").trim();
    if (!emailInput || !passwordInput) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }
    const user = await User.findOne({
      email: emailInput,
      role: "platform_admin"
    });
    if (!user) {
      return res.status(401).json({
        error: "Invalid platform admin credentials"
      });
    }
    const isMatch = String(user.password || "").startsWith("$2")
      ? await bcrypt.compare(passwordInput, user.password)
      : passwordInput === user.password;
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid platform admin credentials"
      });
    }
    if (!String(user.password || "").startsWith("$2")) {
      user.password = await bcrypt.hash(passwordInput, 10);
      await user.save();
    }
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        schoolId: null,
        schoolCode: null
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: null,
      schoolCode: null
    };
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      status: "success",
      token,
      user: safeUser
    });
  } catch (err) {
    console.error("PLATFORM LOGIN ERROR:", err);
    res.status(500).json({
      error: "Platform login failed"
    });
  }
});
module.exports = router;