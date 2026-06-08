exports.home = (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Welcome</title>
</head>
<body style="
margin:0;
font-family:Arial;
background:#eef2ff;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
">
<div style="
background:white;
padding:40px;
border-radius:16px;
box-shadow:0 6px 20px rgba(0,0,0,0.1);
text-align:center;
width:320px;
">
<h2 style="margin-bottom:30px;">Welcome</h2>
<button onclick="goStudent()" style="
width:100%;
padding:12px;
margin-bottom:15px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Student Login
</button>
<button onclick="goTeacher()" style="
width:100%;
padding:12px;
margin-bottom:15px;
background:#16a34a;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Teacher Login
</button>
<button onclick="goToLogin('admin')" style="
width:100%;
padding:12px;
margin-top:10px;
background:#111827;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Admin Login
</button>
</div>
<script>
function goStudent(){
window.location.replace("/student-entry");
}
function goTeacher(){
window.location.replace("/login");
}
function goToLogin(role){
window.location.replace("/login?role=" + role);
}
</script>
</body>
</html>
`);
};
exports.loginPage = (req, res) => {
  const role = req.query.role || "teacher";
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
<h2 style="margin-bottom:20px;">${role.charAt(0).toUpperCase() + role.slice(1)} Login</h2>
<input id="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;"><br>
<input id="password" type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:20px;"><br>
<button onclick="login()" style="
width:100%;
padding:10px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
margin-bottom:10px;
">
Login
</button>
</div>
<script>
localStorage.clear();
window.addEventListener("pageshow", function(event){
  if(event.persisted){
    window.location.reload();
  }
});
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
function login(){
const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();
if(!email || !password){
alert("Enter email and password");
return;
}
fetch("/login", {
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
if(data.error){
alert(getErrorMessage(data.error));
return;
}
localStorage.setItem("user", JSON.stringify(data.user));
if(data.student){
localStorage.setItem("student", JSON.stringify(data.student));
}
if(data.user.role === "admin"){
window.location.replace("/school-dashboard");
}
else if(data.user.role === "teacher"){
window.location.replace("/teacher");
}
else{
window.location.replace("/my-tests");
}
});
}
</script>
</body>
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
<button onclick="register()" style="
width:100%;
padding:10px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
margin-bottom:10px;
">
Register
</button>
<button onclick="goLogin()" style="
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
<h2 style="margin-bottom:20px;">Admin Login</h2>
<input id="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;"><br>
<input id="password" type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:20px;"><br>
<button onclick="loginAdmin()" style="
width:100%;
padding:10px;
background:#111827;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Login
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
function loginAdmin(){
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;
fetch("/login", {
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({ email,password })
})
.then(res => res.json())
.then(data => {
if(data.error){
alert(getErrorMessage(data.error));
return;
}
if(data.user.role !== "admin"){
alert("Not an admin account");
return;
}
localStorage.setItem("user", JSON.stringify(data.user));
window.location.replace("/school-dashboard");
});
}
</script>
</body>
`);
};