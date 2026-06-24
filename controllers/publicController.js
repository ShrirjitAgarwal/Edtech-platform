const path = require("path");
exports.home = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "landing.html"));
};
exports.bookDemo = (req, res) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com assets.calendly.com",
      "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com assets.calendly.com",
      "img-src 'self' data: https://calendly.com https://*.calendly.com",
      "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com fonts.googleapis.com fonts.gstatic.com",
      "connect-src 'self' https://calendly.com",
      "frame-src https://calendly.com",
      "worker-src 'self' blob:"
    ].join("; ")
  );
  res.sendFile(path.join(__dirname, "..", "public", "book-demo.html"));
};
exports.privacyPolicy = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "privacy.html"));
};
exports.loginPage = (req, res) => {
  const rawRole = String(req.query.role || "").trim().toLowerCase();
  const selectedRole = ["admin", "teacher"].includes(rawRole) ? rawRole : "";
  const isRoleForm = Boolean(selectedRole);
  const pageTitle = selectedRole === "admin"
    ? "Admin sign in"
    : selectedRole === "teacher"
    ? "Teacher sign in"
    : "Sign in to Wzdm.in";
  const pageSubtitle = selectedRole === "admin"
    ? "Sign in to manage school setup, users, classes, and subjects."
    : selectedRole === "teacher"
    ? "Sign in to create tests, assign assessments, and view reports."
    : "Select your account type to continue.";
  const cardIcon = selectedRole === "admin"
    ? "ti-building"
    : selectedRole === "teacher"
    ? "ti-chalkboard"
    : "ti-login";
  const roleScriptValue = JSON.stringify(selectedRole || "all");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} — Wzdm.in</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.7.0/dist/tabler-icons.min.css">
<style>
  :root{
    --ink:#11161d;
    --ink-soft:#1b232e;
    --slate:#3a4654;
    --mist:#e8eaed;
    --paper:#f6f4ef;
    --line:rgba(255,255,255,0.10);
    --line-dark:rgba(17,22,29,0.10);
    --accent:#e0633a;
    --gold:#d8b46a;
    --sans:'Inter',system-ui,sans-serif;
    --display:'Fraunces',Georgia,serif;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:var(--sans);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1140px;margin:0 auto;padding:0 28px}

  nav{position:sticky;top:0;z-index:50;background:rgba(17,22,29,0.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
  .brand{font-family:var(--display);font-size:23px;font-weight:600;color:#fff;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px}
  .brand .dot{width:11px;height:11px;border-radius:3px;background:var(--accent);display:inline-block}
  .navlinks{display:flex;gap:30px;align-items:center}
  .navlinks a{color:var(--mist);font-size:14.5px;font-weight:400;transition:color .2s}
  .navlinks a:hover{color:#fff}
  .navbtn{background:var(--accent);color:#fff !important;padding:9px 18px;border-radius:8px;font-weight:500;font-size:14.5px;transition:transform .15s,background .2s}
  .navbtn:hover{background:#c9542e;transform:translateY(-1px)}
  .navbtn-ghost{border:1px solid rgba(255,255,255,0.22);color:#fff !important;padding:8px 16px;border-radius:8px;font-weight:500;font-size:14.5px;transition:border-color .2s,background .2s}
  .navbtn-ghost:hover{border-color:rgba(255,255,255,0.45);background:rgba(255,255,255,0.06)}
  .nav-dropdown{position:relative;display:flex;align-items:center}
  .nav-drop-btn{background:none;border:none;color:var(--mist);font-size:14.5px;font-weight:400;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:var(--sans);padding:0;transition:color .2s;line-height:1}
  .nav-drop-btn:hover{color:#fff}
  .nav-drop-menu{position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%);background:#1b232e;border:1px solid var(--line);border-radius:11px;padding:6px;min-width:172px;display:none;flex-direction:column;gap:2px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,0.4)}
  .nav-dropdown:hover .nav-drop-menu,.nav-dropdown:focus-within .nav-drop-menu{display:flex}
  .nav-drop-menu a{color:#c4ccd6;font-size:14px;padding:9px 13px;border-radius:7px;transition:background .15s,color .15s;display:flex;align-items:center;gap:8px}
  .nav-drop-menu a:hover{background:rgba(255,255,255,0.08);color:#fff}
  @media(max-width:760px){.navlinks a:not(.navbtn){display:none}.nav-dropdown{display:none}}

  main{flex:1;display:flex;align-items:center;justify-content:center;padding:52px 28px 64px}

  .card{width:100%;max-width:460px;background:#fff;border:1px solid var(--line-dark);border-radius:16px;padding:36px 32px;box-shadow:0 4px 32px rgba(17,22,29,0.08)}
  .card-icon{width:48px;height:48px;border-radius:13px;background:#fbeee7;color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 20px}
  .card-title{font-family:var(--display);font-size:26px;font-weight:600;letter-spacing:-0.02em;text-align:center;margin-bottom:8px;color:var(--ink)}
  .card-sub{font-size:14.5px;color:var(--slate);text-align:center;margin-bottom:28px;line-height:1.5}

  .role-list{display:flex;flex-direction:column;gap:10px}
  .role-card{width:100%;border:1px solid var(--line-dark);background:#fff;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;text-align:left;transition:border-color .15s,transform .15s,box-shadow .15s;font-family:var(--sans)}
  .role-card:hover{border-color:var(--accent);transform:translateY(-1px);box-shadow:0 6px 20px rgba(17,22,29,0.07)}
  .role-left{display:flex;align-items:center;gap:13px}
  .role-ic{width:40px;height:40px;border-radius:11px;background:#fbeee7;color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto}
  .role-title{display:block;font-size:15px;font-weight:600;color:var(--ink)}
  .role-copy{display:block;margin-top:2px;font-size:13px;color:var(--slate);line-height:1.35}
  .role-arrow{color:var(--slate);font-size:18px}

  .form{display:flex;flex-direction:column;gap:16px}
  .field label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:var(--ink)}
  .field input{width:100%;border:1px solid var(--line-dark);border-radius:10px;padding:12px 14px;font-size:15px;outline:none;font-family:var(--sans);color:var(--ink);background:#fff;transition:border-color .2s,box-shadow .2s}
  .field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(224,99,58,0.12)}
  .btn-submit{width:100%;border:none;border-radius:10px;padding:13px;background:var(--accent);color:#fff;font-size:15.5px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:background .2s,transform .15s;margin-top:2px}
  .btn-submit:hover{background:#c9542e;transform:translateY(-1px)}

  .error{display:none;margin:0 0 16px;padding:11px 13px;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:13.5px;border:1px solid #fecaca}

  .secondary{margin-top:20px;padding-top:18px;border-top:1px solid var(--line-dark);text-align:center}
  .secondary a,.secondary button{border:none;background:transparent;color:var(--accent);cursor:pointer;text-decoration:none;font-size:14px;font-weight:500;font-family:var(--sans)}
  .secondary a:hover,.secondary button:hover{text-decoration:underline}
  .secondary p{margin:10px 0 0;color:var(--slate);font-size:13px;line-height:1.45}

  footer{background:var(--ink);color:#8b95a2;padding:52px 0 34px;border-top:1px solid var(--line)}
  .foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:36px;margin-bottom:38px}
  @media(max-width:720px){.foot-grid{grid-template-columns:1fr 1fr}}
  footer h4{color:#fff;font-size:13.5px;font-weight:600;margin-bottom:14px;letter-spacing:.02em}
  footer ul{list-style:none;display:flex;flex-direction:column;gap:9px}
  footer a{font-size:14px;color:#9aa4b1;transition:color .2s}
  footer a:hover{color:#fff}
  .foot-brand{font-family:var(--display);font-size:21px;font-weight:600;color:#fff;margin-bottom:11px;display:flex;align-items:center;gap:8px}
  .foot-brand .dot{width:10px;height:10px;border-radius:3px;background:var(--accent)}
  .foot-bottom{border-top:1px solid var(--line);padding-top:22px;display:flex;justify-content:space-between;font-size:13px;flex-wrap:wrap;gap:10px}

  @media(max-width:480px){.card{padding:28px 20px}}
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <a href="/" class="brand"><span class="dot"></span>Wzdm.in</a>
    <div class="navlinks">
      <div class="nav-dropdown">
        <button class="nav-drop-btn">Features <i class="ti ti-chevron-down" style="font-size:13px"></i></button>
        <div class="nav-drop-menu">
          <a href="/#features"><i class="ti ti-layout-dashboard"></i>What you can do</a>
          <a href="/#how"><i class="ti ti-route"></i>How it works</a>
          <a href="/#security"><i class="ti ti-shield-check"></i>Security</a>
        </div>
      </div>
      <a href="/book-demo" class="navbtn-ghost">Book a demo</a>
      <a href="/login" class="navbtn">Login</a>
    </div>
  </div>
</nav>

<main>
  <div class="card">
    <div class="card-icon"><i class="ti ${cardIcon}"></i></div>
    <h1 class="card-title">${pageTitle}</h1>
    <p class="card-sub">${pageSubtitle}</p>
    ${isRoleForm ? `
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
        <button id="publicLoginButton" class="btn-submit" type="button">Sign in</button>
      </div>
      <div class="secondary">
        <button id="publicBackToLoginButton" type="button">← All login options</button>
        <p>Forgot your password? Contact your school admin.</p>
      </div>
    ` : `
      <div class="role-list">
        <button id="studentRoleButton" class="role-card" type="button">
          <span class="role-left">
            <span class="role-ic"><i class="ti ti-user"></i></span>
            <span>
              <span class="role-title">Student</span>
              <span class="role-copy">Find your record and take assigned tests.</span>
            </span>
          </span>
          <i class="ti ti-chevron-right role-arrow"></i>
        </button>
        <button id="teacherRoleButton" class="role-card" type="button">
          <span class="role-left">
            <span class="role-ic"><i class="ti ti-chalkboard"></i></span>
            <span>
              <span class="role-title">Teacher</span>
              <span class="role-copy">Create tests, assign assessments, and view reports.</span>
            </span>
          </span>
          <i class="ti ti-chevron-right role-arrow"></i>
        </button>
        <button id="adminRoleButton" class="role-card" type="button">
          <span class="role-left">
            <span class="role-ic"><i class="ti ti-building"></i></span>
            <span>
              <span class="role-title">School admin</span>
              <span class="role-copy">Manage users, classes, subjects, and students.</span>
            </span>
          </span>
          <i class="ti ti-chevron-right role-arrow"></i>
        </button>
      </div>
      <div class="secondary">
        <a href="mailto:support@wzdm.in">Need help? Contact support</a>
        <p>New to the platform? <a href="/book-demo" style="color:var(--accent)">Book a demo</a> with the team.</p>
      </div>
    `}
  </div>
</main>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-brand"><span class="dot"></span>Wzdm.in</div>
        <p style="font-size:14px;max-width:24em">The secure online assessment platform for schools and colleges. MCQ and coding tests, role-based portals, and reporting in one place.</p>
      </div>
      <div><h4>Product</h4><ul><li><a href="/#features">Features</a></li><li><a href="/#how">How it works</a></li><li><a href="/#security">Security</a></li><li><a href="/book-demo">Book a demo</a></li><li><a href="/privacy">Privacy policy</a></li></ul></div>
      <div><h4>Get in</h4><ul><li><a href="/login">School login</a></li><li><a href="/student-entry">Student entry</a></li></ul></div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 Wzdm.in. All rights reserved.</span>
      <a href="/privacy" style="color:#9aa4b1;font-size:13px;transition:color .2s">Privacy policy</a>
    </div>
  </div>
</footer>

<script>
localStorage.clear();
window.addEventListener("pageshow", function(event){
  if(event.persisted){ window.location.reload(); }
});
const selectedRole = ${roleScriptValue};
function showError(msg){
  const box = document.getElementById("errorBox");
  if(!box){ alert(msg); return; }
  box.style.display = "block";
  box.textContent = msg;
}
function errMsg(e){
  if(!e) return "Something went wrong";
  if(typeof e === "string") return e;
  return e.message || "Something went wrong";
}
const publicLoginButton = document.getElementById("publicLoginButton");
if(publicLoginButton) publicLoginButton.addEventListener("click", login);
const publicBackToLoginButton = document.getElementById("publicBackToLoginButton");
if(publicBackToLoginButton) publicBackToLoginButton.addEventListener("click", function(){ window.location.replace("/login"); });
const studentRoleButton = document.getElementById("studentRoleButton");
if(studentRoleButton) studentRoleButton.addEventListener("click", function(){ window.location.replace("/student-entry"); });
const teacherRoleButton = document.getElementById("teacherRoleButton");
if(teacherRoleButton) teacherRoleButton.addEventListener("click", function(){ window.location.replace("/login?role=teacher"); });
const adminRoleButton = document.getElementById("adminRoleButton");
if(adminRoleButton) adminRoleButton.addEventListener("click", function(){ window.location.replace("/login?role=admin"); });
function login(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!email || !password){ showError("Enter email and password"); return; }
  fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email, password})
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){ showError(errMsg(data.error)); return; }
    if(selectedRole === "admin" && data.user.role !== "admin"){ showError("This is not an admin account."); return; }
    if(selectedRole === "teacher" && data.user.role !== "teacher"){ showError("This is not a teacher account."); return; }
    localStorage.setItem("user", JSON.stringify(data.user));
    if(data.student) localStorage.setItem("student", JSON.stringify(data.student));
    if(data.user.role === "admin"){ window.location.replace("/school-dashboard"); return; }
    if(data.user.role === "teacher"){ window.location.replace("/teacher"); return; }
    window.location.replace("/my-tests");
  })
  .catch(function(){ showError("Login failed"); });
}
</script>
</body>
</html>`);
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