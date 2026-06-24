const path = require("path");
exports.home = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "landing.html"));
};
exports.bookDemo = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "book-demo.html"));
};
exports.privacyPolicy = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "privacy.html"));
};
exports.loginPage = (req, res) => {
  const rawRole = String(req.query.role || "").trim().toLowerCase();
  const selectedRole = ["admin", "teacher"].includes(rawRole)
    ? rawRole
    : "";
  const isRoleForm = Boolean(selectedRole);
  const pageTitle = selectedRole === "admin"
    ? "Admin Login"
    : selectedRole === "teacher"
      ? "Teacher Login"
      : "Welcome to WZDM";
  const pageSubtitle = selectedRole === "admin"
    ? "Sign in to manage school setup, users, classes, and subjects."
    : selectedRole === "teacher"
      ? "Sign in to create tests, assign assessments, and view reports."
      : "Please select your account type to continue.";
  const badgeText = selectedRole === "admin"
    ? "A"
    : selectedRole === "teacher"
      ? "T"
      : "W";
  const roleScriptValue = JSON.stringify(selectedRole || "all");
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} | WZDM</title>
<style>
  :root {
    --bg: #f8fafc;
    --bg-soft: #eef2ff;
    --card: #ffffff;
    --text: #0f172a;
    --muted: #64748b;
    --border: #e2e8f0;
    --primary: #e0633a;
    --primary-dark: #3730a3;
    --shadow: 0 18px 45px rgba(15, 23, 42, 0.10);
    --radius: 18px;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Arial, Helvetica, sans-serif;
    color: var(--text);
    background:
      radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 34%),
      radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.10), transparent 30%),
      linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  }
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 72px;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }
  .toplink {
    color: var(--primary);
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
  }
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 18px 48px;
  }
  .card {
    width: 100%;
    max-width: 480px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 30px;
  }
  .badge {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
    font-size: 24px;
    font-weight: 800;
  }
  h1 {
    margin: 0;
    text-align: center;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  .subtitle {
    margin: 10px auto 26px;
    max-width: 360px;
    text-align: center;
    color: var(--muted);
    line-height: 1.5;
    font-size: 15px;
  }
  .role-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .role-card {
    width: 100%;
    border: 1px solid var(--border);
    background: white;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  .role-card:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }
  .role-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .role-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--bg-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex: 0 0 auto;
  }
  .role-title {
    display: block;
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
  }
  .role-copy {
    display: block;
    margin-top: 3px;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.35;
  }
  .arrow {
    color: var(--muted);
    font-weight: 800;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .field label {
    display: block;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 7px;
    color: #334155;
  }
  .field input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 13px 14px;
    font-size: 15px;
    outline: none;
    background: white;
  }
  .field input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
  }
  .primary-btn {
    width: 100%;
    border: none;
    border-radius: 12px;
    padding: 14px;
    background: var(--primary);
    color: white;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    margin-top: 4px;
  }
  .primary-btn:hover {
    background: var(--primary-dark);
  }
  .secondary-actions {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .secondary-actions a,
  .secondary-actions button {
    border: none;
    background: transparent;
    color: var(--primary);
    cursor: pointer;
    text-decoration: none;
    font-size: 14px;
    font-weight: 800;
  }
  .help-text {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
  .error {
    display: none;
    margin: 0 0 14px;
    padding: 11px 12px;
    border-radius: 12px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 13px;
    font-weight: 700;
    text-align: left;
  }
  .footer {
    padding: 18px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }
  @media (max-width: 520px) {
    .topbar {
      padding: 0 18px;
    }
    .card {
      padding: 24px 18px;
    }
    h1 {
      font-size: 25px;
    }
  }
</style>
</head>
<body>
<div class="page">
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">W</div>
      <div>WZDM</div>
    </div>
    <a class="toplink" href="/platform-login">Platform Admin</a>
  </header>
  <main class="main">
    <section class="card">
      <div class="badge">${badgeText}</div>
      <h1>${pageTitle}</h1>
      <p class="subtitle">${pageSubtitle}</p>
      ${
        isRoleForm
          ? `
            <p id="errorBox" class="error"></p>
            <div class="form">
              <div class="field">
                <label for="email">Email</label>
                <input id="email" type="email" placeholder="Enter your email" autocomplete="email">
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input id="password" type="password" placeholder="Enter your password" autocomplete="current-password">
              </div>
              <button id="publicLoginButton" class="primary-btn" type="button">Login</button>
            </div>
            <div class="secondary-actions">
              <button id="publicBackToLoginButton" type="button">← Back to login options</button>
              <p class="help-text">Forgot password? Please contact your school admin.</p>
            </div>
          `
          : `
            <div class="role-list">
              <button id="studentRoleButton" class="role-card" type="button">
                <span class="role-left">
                  <span class="role-icon">S</span>
                  <span>
                    <span class="role-title">Student Login</span>
                    <span class="role-copy">Find your record and take assigned tests.</span>
                  </span>
                </span>
                <span class="arrow">›</span>
              </button>
              <button id="teacherRoleButton" class="role-card" type="button">
                <span class="role-left">
                  <span class="role-icon">T</span>
                  <span>
                    <span class="role-title">Teacher Login</span>
                    <span class="role-copy">Create tests, assign assessments, and view reports.</span>
                  </span>
                </span>
                <span class="arrow">›</span>
              </button>
              <button id="adminRoleButton" class="role-card" type="button">
                <span class="role-left">
                  <span class="role-icon">A</span>
                  <span>
                    <span class="role-title">Admin Login</span>
                    <span class="role-copy">Manage users, classes, subjects, and students.</span>
                  </span>
                </span>
                <span class="arrow">›</span>
              </button>
            </div>
            <div class="secondary-actions">
              <a href="mailto:support@wzdm.in">Need help? Contact support</a>
              <p class="help-text">New to the platform? Request a demo from the WZDM team.</p>
            </div>
          `
      }
    </section>
  </main>
  <footer class="footer">
    © 2026 WZDM Assessment Platform. All rights reserved.
  </footer>
</div>
<script>
localStorage.clear();
window.addEventListener("pageshow", function(event){
  if(event.persisted){
    window.location.reload();
  }
});
const selectedRole = ${roleScriptValue};
function showError(message){
  const errorBox = document.getElementById("errorBox");
  if(!errorBox){
    alert(message);
    return;
  }
  errorBox.style.display = "block";
  errorBox.textContent = message;
}
function getErrorMessage(errorValue){
  if(!errorValue){
    return "Something went wrong";
  }
  if(typeof errorValue === "string"){
    return errorValue;
  }
  if(errorValue.message){
    return errorValue.message;
  }
  if(errorValue.code && errorValue.message){
    return errorValue.code + ": " + errorValue.message;
  }
  return "Something went wrong";
}
  const publicLoginButton = document.getElementById("publicLoginButton");
if(publicLoginButton){
  publicLoginButton.addEventListener("click", login);
}

const publicBackToLoginButton = document.getElementById("publicBackToLoginButton");
if(publicBackToLoginButton){
  publicBackToLoginButton.addEventListener("click", function(){
    window.location.replace("/login");
  });
}

const studentRoleButton = document.getElementById("studentRoleButton");
if(studentRoleButton){
  studentRoleButton.addEventListener("click", goStudent);
}

const teacherRoleButton = document.getElementById("teacherRoleButton");
if(teacherRoleButton){
  teacherRoleButton.addEventListener("click", goTeacher);
}

const adminRoleButton = document.getElementById("adminRoleButton");
if(adminRoleButton){
  adminRoleButton.addEventListener("click", goAdmin);
}
function goStudent(){
  window.location.replace("/student-entry");
}
function goTeacher(){
  window.location.replace("/login?role=teacher");
}
function goAdmin(){
  window.location.replace("/login?role=admin");
}
function login(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!email || !password){
    showError("Enter email and password");
    return;
  }
  fetch("/login", {
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
      showError(getErrorMessage(data.error));
      return;
    }
    if(selectedRole === "admin" && data.user.role !== "admin"){
      showError("This is not an admin account.");
      return;
    }
    if(selectedRole === "teacher" && data.user.role !== "teacher"){
      showError("This is not a teacher account.");
      return;
    }
    localStorage.setItem("user", JSON.stringify(data.user));
    if(data.student){
      localStorage.setItem("student", JSON.stringify(data.student));
    }
    if(data.user.role === "admin"){
      window.location.replace("/school-dashboard");
      return;
    }
    if(data.user.role === "teacher"){
      window.location.replace("/teacher");
      return;
    }
    window.location.replace("/my-tests");
  })
  .catch(() => {
    showError("Login failed");
  });
}
</script>
</body>
</html>
`);
};
exports.registerPage = (req, res) => {
  res.send(`
<body style="margin:0;background:#eef2ff;font-family:Arial;">
<div style="
max-width:400px;
margin:100px auto;
background:white;
padding:30px;
border-radius:12px;
box-shadow:0 4px 12px rgba(0,0,0,0.1);
text-align:center;
">
<h2 style="margin-bottom:20px;">Register</h2>
<input id="name" placeholder="Full Name" style="width:100%;padding:10px;margin-bottom:10px;"><br>
<input id="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;"><br>
<input id="password" type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:20px;"><br>
<input type="hidden" id="role" value="teacher">
<button id="registerButton" style="
width:100%;
padding:10px;
background:#e0633a;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
margin-bottom:10px;
">
Register
</button>
<button id="registerBackToLoginButton" style="
width:100%;
padding:10px;
background:#6b7280;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Back to Login
</button>
</div>
<script>
function getErrorMessage(errorValue){
if(!errorValue){
return "Something went wrong";
}
if(typeof errorValue === "string"){
return errorValue;
}
if(errorValue.message){
return errorValue.message;
}
if(errorValue.code && errorValue.message){
return errorValue.code + ": " + errorValue.message;
}
return "Something went wrong";
}
const registerButton = document.getElementById("registerButton");
if(registerButton){
  registerButton.addEventListener("click", register);
}

const registerBackToLoginButton = document.getElementById("registerBackToLoginButton");
if(registerBackToLoginButton){
  registerBackToLoginButton.addEventListener("click", goLogin);
}
function register(){
const name = document.getElementById("name").value;
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;
const role = document.getElementById("role").value;
fetch("/register", {
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({ name,email,password,role })
})
.then(res => res.json())
.then(data => {
if(data.error){
alert(getErrorMessage(data.error));
return;
}
alert("Account created! Please login.");
window.location.replace("/login");
});
}
function goLogin(){
window.location.replace("/login");
}
</script>
</body>
`);
};
exports.adminLoginPage = (req, res) => {
  res.redirect("/login?role=admin");
};