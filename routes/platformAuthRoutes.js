const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/auth");
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
 if(data.user && data.user.mustChangePassword){
   window.location.replace("/platform-change-password");
   return;
 }
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
  schoolCode: null,
  mustChangePassword: !!user.mustChangePassword
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
router.post("/platform-admins", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "platform_admin") {
      return res.status(403).json({
        error: "Platform admin access required"
      });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required"
      });
    }

    const existing = await User.findOne({
      email
    });

    if (existing) {
      return res.status(409).json({
        error: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

 const platformAdmin = await User.create({
   name,
   email,
   password: hashedPassword,
   role: "platform_admin",
   schoolId: null,
   schoolCode: null,
   mustChangePassword: true,
   createdBy: String(req.user.id || req.user._id || ""),
   createdByName: req.user.email || "Platform Admin"
 });

    res.json({
      status: "created",
      user: {
        _id: platformAdmin._id,
        name: platformAdmin.name,
        email: platformAdmin.email,
        role: platformAdmin.role,
        schoolId: null,
        schoolCode: null
      }
    });
  } catch (err) {
    console.error("CREATE PLATFORM ADMIN ERROR:", err);
    res.status(500).json({
      error: "Failed to create platform admin"
    });
  }
});
router.get("/platform-change-password", authMiddleware, async (req, res) => {
  if (!req.user || req.user.role !== "platform_admin") {
    return res.status(403).send("Platform admin access required");
  }

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
    <h1 style="margin-top:0;">Change Password</h1>
    <p style="color:#64748b;">
      Please set a permanent password before continuing.
    </p>
    <input
      id="newPassword"
      placeholder="New password"
      type="password"
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
      id="confirmPassword"
      placeholder="Confirm new password"
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
      onclick="changePassword()"
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
      Save Password
    </button>
    <p id="error" style="color:#dc2626;font-weight:600;"></p>
  </div>
</div>
<script>
function changePassword(){
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if(!newPassword || !confirmPassword){
    document.getElementById("error").textContent = "Both password fields are required";
    return;
  }

  if(newPassword !== confirmPassword){
    document.getElementById("error").textContent = "Passwords do not match";
    return;
  }

  fetch("/platform-change-password", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      newPassword,
      confirmPassword
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
    document.getElementById("error").textContent = "Password update failed";
  });
}
</script>
</body>
`);
});

router.post("/platform-change-password", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "platform_admin") {
      return res.status(403).json({
        error: "Platform admin access required"
      });
    }

    const newPassword = String(req.body.newPassword || "").trim();
    const confirmPassword = String(req.body.confirmPassword || "").trim();

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Both password fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match"
      });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({
        error: "Password must be at least 10 characters"
      });
    }

    const user = await User.findOne({
      _id: req.user.id,
      role: "platform_admin"
    });

    if (!user) {
      return res.status(404).json({
        error: "Platform admin not found"
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: null,
      schoolCode: null,
      mustChangePassword: false
    };

    res.json({
      status: "password_changed",
      user: safeUser
    });
  } catch (err) {
    console.error("PLATFORM PASSWORD CHANGE ERROR:", err);
    res.status(500).json({
      error: "Failed to change password"
    });
  }
});
module.exports = router;