require("dotenv").config();
const express = require("express");
const connectDB = require("./data/config/db");
// MODELS (direct usage)
const User = require("./models/User");
const Student = require("./models/Student");
const ClassModel = require("./models/Class");
// REGISTER OTHER MODELS
require("./models/Test");
require("./models/Result");
require("./models/Assignment"); // ✅ ADD THIS
require("./models/ClassSubject");
const app = express();
app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));
const testRoutes = require("./routes/testRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const jwt = require("jsonwebtoken");
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "No token" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
// ---------- SIDEBAR ----------
function sidebar(active = "") {
  return `
<div style="
  width:240px;
  background:#1e293b;
  color:white;
  padding:20px 16px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
">

  <div>
    <h2 style="margin-bottom:25px;">Teacher</h2>

    <div onclick="go('/teacher')" style="
      padding:12px 14px;
      border-radius:8px;
      margin-bottom:10px;
      cursor:pointer;
      ${active === "dashboard" ? "background:#334155;font-weight:600;" : ""}
    "
    onmouseover="this.style.background='#334155'"
    onmouseout="this.style.background='${active === "dashboard" ? "#334155" : "transparent"}'">
      Dashboard
    </div>

    <div onclick="toggleManage()" style="
      padding:12px 14px;
      border-radius:8px;
      cursor:pointer;
    "
    onmouseover="this.style.background='#334155'"
    onmouseout="this.style.background='transparent'">
      Manage ▼
    </div>

    <div id="manageMenu" style="display:block;margin-left:6px;">
      <div onclick="go('/library')" style="
        padding:10px 12px;
        border-radius:6px;
        cursor:pointer;
        ${active === "library" ? "background:#334155;font-weight:600;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "library" ? "#334155" : "transparent"}'">
        Library
      </div>

      <div onclick="go('/teacher-tests')" style="
        padding:10px 12px;
        border-radius:6px;
        cursor:pointer;
        ${active === "tests" ? "background:#334155;font-weight:600;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "tests" ? "#334155" : "transparent"}'">
        Tests
      </div>

      <div onclick="go('/classes')" style="
        padding:10px 12px;
        border-radius:6px;
        cursor:pointer;
        ${active === "classes" ? "background:#334155;font-weight:600;" : ""}
      "
      onmouseover="this.style.background='#334155'"
      onmouseout="this.style.background='${active === "classes" ? "#334155" : "transparent"}'">
        Classes
      </div>
    </div>
  </div>

  <div>
    <div onclick="logout()" style="
      padding:12px 14px;
      border-radius:8px;
      cursor:pointer;
      color:#f87171;
    "
    onmouseover="this.style.background='#7f1d1d';this.style.color='white'"
    onmouseout="this.style.background='transparent';this.style.color='#f87171'">
      Logout
    </div>
  </div>

</div>
`;
}
// ---------- GLOBAL LAYOUT ----------
function layout(content, active = "") {
  return `
  <body style="margin:0;font-family:Arial;">
    <div style="display:flex;height:100vh;">
      
      ${sidebar(active)}

      <div style="
        flex:1;
        padding:30px;
        background:#eef2ff;
        overflow:auto;
      ">
        ${content}
      </div>

    </div>

    <script>
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user || user.role !== "teacher") {
        window.location.replace("/");
      }

      function go(path){
        window.location.replace(path);
      }

      function logout(){
        localStorage.clear();
        window.location.replace("/");
      }

      function toggleManage(){
        const menu = document.getElementById("manageMenu");
        if (!menu) return;
        menu.style.display =
          menu.style.display === "none" ? "block" : "none";
      }
    </script>
  </body>
  `;
}
// ---------- NAVBAR ----------
function navbar() {
return `
<div style="
position:fixed;
top:0;
left:0;
width:100%;
z-index:1000;
background:#333;
padding:10px;
display:flex;
gap:10px;
box-sizing:border-box;
">
    <button onclick="go('/')" class="nav-btn">Home</button>
    <button onclick="go('/teacher-tests')" class="nav-btn">Tests</button>
    <button onclick="go('/library')" class="nav-btn">Library</button>
    <button onclick="go('/teacher')" class="nav-btn">Teacher</button>
    <button onclick="go('/bulk-upload')" class="nav-btn">Bulk Upload</button>
    <button onclick="go('/dashboard')" class="nav-btn">Dashboard</button>
    <button onclick="logout()" class="nav-btn logout">Logout</button>
</div>
<style>
.nav-btn {
 padding:8px 14px;
 background:white;
 color:black;
 border:none;
 border-radius:6px;
 cursor:pointer;
}
.nav-btn:hover { background:#ddd; }
.logout { background:#ff4d4d; color:white; }
</style>
<script>
function go(path){
 window.location.replace(path);
}
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
function downloadReport(){
console.log("DOWNLOAD CLICKED");
 const params = new URLSearchParams(window.location.search);
 const studentId = params.get("studentId");
 const user = JSON.parse(localStorage.getItem("user") || "null");
 if(!studentId || !user){
   alert("Missing data");
   return;
 }
 fetch("/download-report", {
   method: "POST",
   headers: {"Content-Type":"application/json"},
   body: JSON.stringify({
     studentId,
   })
 })
 .then(res => {
   if(!res.ok){
     throw new Error("Failed to fetch report");
   }
   return res.blob();
 })
 .then(blob => {
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = "report.csv";
   a.click();
 })
 .catch(err => {
   alert("Error downloading report");
   console.error(err);
 });
}
</script>
 `;
}
// ---------- HOME ----------
app.get("/", (req, res) => {
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
function adminLogin(){
 window.location.replace("/admin-login");
}
function goToLogin(role){
  window.location.replace("/login?role=" + role);
}
 </script>
</body>
</html>
 `);
});
// ---------- LOGIN ----------
app.get("/login", (req, res) => {
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
       <button onclick="goRegister()" style="
         width:100%;
         padding:10px;
         background:#10b981;
         color:white;
         border:none;
         border-radius:8px;
         cursor:pointer;
       ">
         Create Account
       </button>
     </div>
<script>
function login(){
 const email = document.getElementById("email").value;
 const password = document.getElementById("password").value;
 fetch("/login", {
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify({ email, password })
 })
 .then(res => res.json())
 .then(data => {
   if(data.error){
     alert(data.error);
     return;
   }
   // ✅ STORE USER
   localStorage.setItem("user", JSON.stringify(data.user));
   localStorage.setItem("token", data.token);
   if(data.student){
  localStorage.setItem("student", JSON.stringify(data.student));
}
// ✅ REDIRECT BASED ON ROLE
if(data.user.role === "admin"){
  window.location.replace("/school-dashboard?token=" + data.token);
}
else if(data.user.role === "teacher"){
  window.location.replace("/teacher");
}
else{
  window.location.replace("/teacher-tests");
}
 });
}
</script>
   </body>
 `);
});
// ---------- ADMIN LOGIN ----------
app.get("/admin-login", (req, res) => {
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
function loginAdmin(){
 console.log("LOGIN CLICKED");
 const email = document.getElementById("email").value;
 const password = document.getElementById("password").value;
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
   console.log("LOGIN RESPONSE:", data);
   if(data.error){
     alert(data.error);
     return;
   }
   if(data.user.role !== "admin"){
     alert("Not an admin account");
     return;
   }
   localStorage.setItem("user", JSON.stringify(data.user));
   window.location.replace("/school-dashboard?token=" + data.token);
 })
 .catch(err => {
   console.error(err);
   alert("Login failed");
 });
}
</script>
</body>
 `);
});
// ---------- REGISTER ----------
app.get("/register", (req, res) => {
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
       </select>
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
       function register(){
         const name = document.getElementById("name").value;
         const email = document.getElementById("email").value;
         const password = document.getElementById("password").value;
         const role = document.getElementById("role").value;
         if(!name || !email || !password){
           alert("All fields are required");
           return;
         }
         fetch("/register", {
           method:"POST",
           headers:{ "Content-Type":"application/json" },
           body: JSON.stringify({
             name,
             email,
             password,
             role
           })
         })
         .then(res => res.json())
         .then(data => {
           if(data.error){
             alert(data.error);
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
});
// ---------- TEACHER PANEL ----------
app.get("/teacher", async (req, res) => {
  try {
    const Test = require("./models/Test");
    const Student = require("./models/Student");
    const ClassModel = require("./models/Class");
    const allTests = await Test.find();
    const allStudents = await Student.find();
    const allClasses = await ClassModel.find();
    res.send(`
 <body style="margin:0;font-family:Arial;">
 <script>
function protectTeacher(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user || user.role !== "teacher"){
    window.location.replace("/");
  }
}
protectTeacher();
// 🔁 FORCE RELOAD IF FROM CACHE
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
 </script>
 <div style="display:flex;min-height:100vh;">
   <!-- SIDEBAR -->
${sidebar("dashboard")}
   <!-- CONTENT -->
   <div style="
     flex:1;
     padding:30px;
     background:#eef2ff;
     overflow:auto;
   ">
     <h1 style="margin-bottom:20px;">Dashboard</h1>
     <div id="stats"></div>
   </div>
 </div>
<script>
window.onload = function(){
 const user = JSON.parse(localStorage.getItem("user") || "null");
 if(!user){
   return window.location.replace("/");
 }
 const teacherId = user._id || user.id;
 const tests = ${JSON.stringify(allTests)};
 const students = ${JSON.stringify(allStudents)};
 const classes = ${JSON.stringify(allClasses)};
 const myTests = tests.filter(t =>
   String(t.teacherId) === String(teacherId)
 );
 const myStudents = students.filter(s =>
   String(s.teacherId) === String(teacherId)
 );
 const myClasses = classes.filter(c =>
   String(c.teacherId) === String(teacherId)
 );
 const html = \`
<div style="
 display:flex;
 gap:20px;
 margin:20px 0 30px 0;
 flex-wrap:wrap;
">
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   min-width:150px;
   box-shadow:0 4px 10px rgba(0,0,0,0.05);
   display:flex;
   flex-direction:column;
   align-items:center;
   justify-content:center;
 ">
   <h3 style="margin-bottom:10px;">Students</h3>
   <p style="font-size:32px;font-weight:700;margin:0;">0</p>
 </div>
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   min-width:150px;
   box-shadow:0 4px 10px rgba(0,0,0,0.05);
   display:flex;
   flex-direction:column;
   align-items:center;
   justify-content:center;
 ">
   <h3 style="margin-bottom:10px;">Classes</h3>
   <p style="font-size:32px;font-weight:700;margin:0;">0</p>
 </div>
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   min-width:150px;
   box-shadow:0 4px 10px rgba(0,0,0,0.05);
   display:flex;
   flex-direction:column;
   align-items:center;
   justify-content:center;
 ">
   <h3 style="margin-bottom:10px;">Tests</h3>
   <p style="font-size:32px;font-weight:700;margin:0;">0</p>
 </div>
</div>
 \`;
 document.getElementById("stats").innerHTML = html;
 document.querySelectorAll("#stats p")[0].innerText = myStudents.length;
 document.querySelectorAll("#stats p")[1].innerText = myClasses.length;
 document.querySelectorAll("#stats p")[2].innerText = myTests.length;
};
function go(path){
 window.location.replace(path);
}

function toggleManage(){
 const menu = document.getElementById("manageMenu");
 if (!menu) return;
 menu.style.display =
   menu.style.display === "none" ? "block" : "none";
}
window.toggleManage = function(){
 const menu = document.getElementById("manageMenu");
 if (menu.style.display === "none" || menu.style.display === "") {
   menu.style.display = "block";
 } else {
   menu.style.display = "none";
 }
};
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
</script>
 </body>
 `);
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});
// ---------- ROUTES ----------
app.use("/", testRoutes);        // 🔥 FIRST (your APIs live here)
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
// ---------- VIEW STUDENTS ----------
app.get("/students", async (req, res) => {
 try {
   const studentsRaw = await Student.find();
// ✅ FORCE CLEAN SERIALIZATION
const students = studentsRaw.map(s => ({
 name: s.name,
 class: s.class,
 studentId: s.studentId,
 teacherId: String(s.teacherId)
}));
   const User = require("./models/User");
   const teachers = await User.find({ role: "teacher" });
   res.send(`
     <body style="font-family:Arial;background:#eef2ff;padding:20px;">
       <h1>Students</h1>
       <table border="1" cellpadding="10" style="background:white;border-collapse:collapse;">
         <tr>
           <th>Name</th>
           <th>Class</th>
           <th>Student ID</th>
           <th>Teacher</th>
         </tr>
         <tbody id="studentBody"></tbody>
       </table>
       <script>
         const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
  window.location.replace("/");
}
         const teacherId = user._id;
         const students = ${JSON.stringify(students)};
         const teachers = ${JSON.stringify(teachers)};
         // ✅ CREATE teacherId → name map
         let teacherMap = {};
         teachers.forEach(t => {
           teacherMap[t._id] = t.name;
         });
         // ✅ FILTER STUDENTS BY TEACHER
         const filtered = students.filter(s => String(s.teacherId) === String(teacherId));
const rows = filtered.map(s => \`
 <tr style="cursor:pointer;" onclick="goStudent('\${s.studentId}')">
   <td>\${s.name}</td>
   <td>\${s.class}</td>
   <td>\${s.studentId}</td>
   <td>\${teacherMap[s.teacherId] || "Unknown"}</td>
 </tr>
\`).join("");
         document.getElementById("studentBody").innerHTML =
           rows || "<tr><td colspan='4'>No students found</td></tr>";
           function goStudent(studentId){
 window.location.replace("/student?studentId=" + studentId);
}
       </script>
     </body>
   `);
 } catch (err) {
   console.error(err);
   res.send("Error loading students");
 }
});
const Result = require("./models/Result");
// ---------- VIEW CLASSES ----------
app.get("/classes", async (req, res) => {
 try {
   const ClassModel = require("./models/Class");
   const Student = require("./models/Student");
   const User = require("./models/User");

   const classes = await ClassModel.find();
   const students = await Student.find();
   const teachers = await User.find({ role: "teacher" });

   res.send(`
<body style="margin:0;font-family:Arial;">

<script>
function go(path){ window.location.replace(path); }

function toggleManage(){
 const m = document.getElementById("manageMenu");
 if(!m) return;
 m.style.display = m.style.display === "block" ? "none" : "block";
}

function logout(){
 localStorage.clear();
 window.location.replace("/");
}

function protectTeacher(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user || user.role !== "teacher"){
    window.location.replace("/");
  }
}
protectTeacher();

window.addEventListener("pageshow", function (event) {
  if (event.persisted) window.location.reload();
});
</script>

<div style="display:flex;height:100vh;">
  ${sidebar("classes")}

  <div style="flex:1;padding:30px;background:#eef2ff;">
    <h1>Classes</h1>

    <select id="classFilter">
      <option value="all">All Classes</option>
    </select>

    <div id="classContainer"></div>
  </div>
</div>

<script>
window.onload = function(){
 const user = JSON.parse(localStorage.getItem("user") || "null");
 if(!user) return window.location.replace("/");

 const teacherId = user._id || user.id;

 const classesData = ${JSON.stringify(classes)};
 const studentsData = ${JSON.stringify(students)};
 const teachersData = ${JSON.stringify(teachers)};

 let teacherMap = {};
 teachersData.forEach(t => {
   teacherMap[t._id] = t.name;
 });

 const teacherClasses = classesData.filter(c =>
   String(c.teacherId) === String(teacherId)
 );

 const classFilter = document.getElementById("classFilter");

 const uniqueClassNames = [...new Set(teacherClasses.map(c => c.name))];

 uniqueClassNames.forEach(name => {
   const opt = document.createElement("option");
   opt.value = name;
   opt.textContent = name;
   classFilter.appendChild(opt);
 });

 const selectedClass = localStorage.getItem("selectedClass") || "all";
 classFilter.value = selectedClass;

 const filteredClasses = teacherClasses.filter(c => {
   if (selectedClass === "all") return true;
   return c.name === selectedClass;
 });

 let html = "";

 filteredClasses.forEach(c => {
   const classStudents = studentsData.filter(s =>
     s.class === c.name &&
     String(s.teacherId) === String(teacherId)
   );

   const studentList = classStudents.length === 0
     ? "<p style='color:gray;'>No students</p>"
     : classStudents.map(function(s){
         return '<div onclick="viewStudent(\\'' + s.studentId + '\\')" ' +
           'style="background:#f8fafc;padding:10px;margin:5px 0;border-radius:8px;cursor:pointer;">' +
           '<div><b>' + (s.name || "No Name") + '</b></div>' +
           '<div style="font-size:12px;">ID: ' + s.studentId + '</div>' +
           '</div>';
       }).join("");

   html += \`
     <div style="background:white;padding:20px;margin:15px 0;border-radius:12px;">
       <h2>Class: \${c.name}</h2>
       <p><b>Teacher:</b> \${teacherMap[c.teacherId] || "Unknown"}</p>
       <p><b>Students:</b> \${classStudents.length}</p>
       \${studentList}
     </div>
   \`;
 });

 classFilter.addEventListener("change", e => {
   localStorage.setItem("selectedClass", e.target.value);
   location.reload();
 });

 document.getElementById("classContainer").innerHTML =
   html || "<p>No classes found</p>";
};

function viewStudent(studentId){
  window.location.replace("/student?studentId=" + studentId);
}
</script>

</body>
`);
 } catch (err) {
   console.error(err);
   res.send("Error loading classes");
 }
});
// ---------- DOWNLOAD REPORT (CSV) ----------
app.post("/download-report", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.body;
    const Result = require("./models/Result");
    if (!studentId) {
      return res.status(400).json({ error: "Missing studentId" });
    }
    const teacherId = req.user.id;
    const results = await Result.find({
      studentId: String(studentId),
      teacherId: String(teacherId)
    });
    if (!results || results.length === 0) {
      return res.status(404).json({ error: "No results found" });
    }
    let csv = "Test Name,Score,Total,Percentage,Date\n";
    results.forEach(r => {
      const percent = r.total
        ? Math.round((r.score / r.total) * 100)
        : 0;
      const date = r.date
        ? new Date(r.date).toLocaleString()
        : "";
      csv += `"${r.testName || ""}",${r.score},${r.total},${percent}%,${date}\n`;
    });
    const safeStudentId = encodeURIComponent(String(studentId || "unknown"));
    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report_${safeStudentId}.xls"`
    );
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});
// ---------- ADMIN: MAP CLASS + SUBJECT → TEACHER ----------
app.post("/admin/map-class-subject", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }
    const ClassSubject = require("./models/ClassSubject");
    const { className, subject, teacherId } = req.body;
    const normalizedClass = String(className || "").trim();
const normalizedSubject = String(subject || "").trim();
    if (!normalizedClass || !normalizedSubject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    // 🔒 remove old mapping
    await ClassSubject.deleteMany({
      className: normalizedClass,
      subject: normalizedSubject
    });
    // ✅ CREATE WITH STRING teacherId (IMPORTANT FIX)
    const newMapping = await ClassSubject.create({
      className: normalizedClass,
      subject: normalizedSubject,
      teacherId: String(teacherId)
    });
    res.json({ status: "mapped", data: newMapping });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed mapping" });
  }
});
// ---------- DOWNLOAD CLASS REPORT ----------
app.post("/download-class-report", async (req, res) => {
 try {
   const { className } = req.body;
   const Result = require("./models/Result");
   if (!className) {
     return res.status(400).json({ error: "Missing className" });
   }
   const results = await Result.find({ class: className });
   if (!results.length) {
     return res.status(404).json({ error: "No data found" });
   }
   let studentMap = {};
   results.forEach(r => {
     if (!studentMap[r.studentId]) {
       studentMap[r.studentId] = {
         name: r.name,
         totalScore: 0,
         totalMarks: 0,
         attempts: 0
       };
     }
     studentMap[r.studentId].totalScore += r.score;
     studentMap[r.studentId].totalMarks += r.total;
     studentMap[r.studentId].attempts += 1;
   });
   let csv = "Name,Student ID,Average %,Attempts\n";
   Object.keys(studentMap).forEach(id => {
     const s = studentMap[id];
     const avg = s.totalMarks > 0
       ? Math.round((s.totalScore / s.totalMarks) * 100)
       : 0;
     csv += `${s.name},${id},${avg}%,${s.attempts}\n`;
   });
   const safeClass = encodeURIComponent(className);
   res.setHeader("Content-Type", "application/vnd.ms-excel");
   res.setHeader(
     "Content-Disposition",
     `attachment; filename="class_${safeClass}.xls"`
   );
   res.send("\uFEFF" + csv);
 } catch (err) {
   console.error(err);
   res.status(500).json({ error: "Failed to generate report" });
 }
});
// ---------- SUBMIT TEST ----------
app.post("/submit", async (req, res) => {
  try {
    console.log("SUBMIT DATA:", req.body);
    const Student = require("./models/Student");
    const Result = require("./models/Result");
    const ClassModel = require("./models/Class");
    const Test = require("./models/Test");
const {
  studentId,
  name = "Student " + studentId,
  testId,
  testName,
  score,
  total,
  answers
} = req.body;
    // 🔒 BASIC VALIDATION
    if (!studentId || !testId) {
      return res.status(400).json({
        error: "Missing studentId or testId"
      });
    }
    // 🔒 PREVENT RE-ATTEMPT
    const alreadySubmitted = await Result.findOne({
      studentId: String(studentId),
      testId: String(testId)
    });
    if (alreadySubmitted) {
      return res.status(403).json({
        error: "Test already attempted"
      });
    }
    // 🔒 VALIDATE TEST
    const testDoc = await Test.findById(testId);
    if (!testDoc) {
      return res.status(400).json({ error: "Invalid test" });
    }
    const studentClass = String(testDoc.className).trim().toUpperCase();
    const realTeacherId = String(testDoc.teacherId);
// ===============================
// ✅ STEP 1: VALIDATE STUDENT (NO CREATION)
// ===============================
const student = await Student.findOne({ studentId });

if (!student) {
  return res.status(403).json({
    error: "Student not registered. Contact teacher."
  });
}

// 🔒 OPTIONAL: class consistency check
if (String(student.class) !== String(studentClass)) {
  return res.status(403).json({
    error: "Student not assigned to this class"
  });
}
    // ===============================
    // ✅ STEP 3: SAVE RESULT
    // ===============================
    try {
      await Result.create({
        studentId,
        name,
        class: studentClass,
        testId: String(testId),
        testName,
        teacherId: realTeacherId,
        score,
        total,
        answers: answers || []
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(403).json({
          error: "Test already attempted"
        });
      }
      console.error("SUBMIT ERROR:", err);
      return res.status(500).json({
        error: "Failed to save result"
      });
    }
    // ✅ SUCCESS
    res.json({ status: "saved" });
  } catch (err) {
    console.error("FINAL SUBMIT ERROR:", err);
    res.status(500).json({ error: "Failed to save result" });
  }
});
// ---------- RESULT PAGE ----------
app.get("/result", async (req, res) => {
  const { testId, studentId } = req.query;
  const Result = require("./models/Result");
  let result;
  try {
    result = await Result.findOne({
      testId: String(testId),
      studentId: String(studentId)
    });
  } catch (err) {
    console.error(err);
  }
  if (!result) {
    return res.send("<h2>No result found</h2>");
  }
const answersHTML = (result.answers || []).map(a => {
  const correct = a.isCorrect;
  return `
    <div style="
      margin:12px 0;
      padding:15px;
      border-radius:10px;
      background:${correct ? "#ecfdf5" : "#fef2f2"};
      border:1px solid ${correct ? "#16a34a" : "#dc2626"};
    ">
      <div style="font-weight:600;margin-bottom:6px;">
        Question ${a.questionId}
      </div>
      <div style="font-size:14px;margin-bottom:4px;">
        Your Answer: <b>${a.selected || "N/A"}</b>
      </div>
      <div style="font-size:14px;margin-bottom:4px;">
        Correct Answer: <b>${a.correctAnswer || "-"}</b>
      </div>
      <div style="
        font-size:13px;
        font-weight:600;
        color:${correct ? "#16a34a" : "#dc2626"};
      ">
        ${correct ? "Correct" : "Incorrect"}
      </div>
    </div>
  `;
}).join("");
  res.send(`
    <body style="font-family:Arial;background:#eef2ff;padding:20px;">
      <h1>Test Details</h1>
<div style="
  background:white;
  padding:15px;
  border-radius:10px;
  margin-bottom:20px;
">
  <b>Score:</b> ${result.score} / ${result.total}<br>
  <b>Percentage:</b> ${Math.round((result.score / result.total) * 100)}%
</div>
      <p><b>Score:</b> ${result.score} / ${result.total}</p>
      <h3>Answers</h3>
      ${answersHTML}
      <br>
      <button onclick="window.history.back()">Back</button>
    </body>
  `);
});
// ---------- STUDENT DETAIL PAGE ----------
app.get("/student", async (req, res) => {
 const { studentId } = req.query;
 const Result = require("./models/Result");
 let results = [];
 try {
   results = await Result.find({ studentId: String(studentId) });
 } catch (err) {
   console.error(err);
 }
 if (!results || results.length === 0) {
   return res.send("<h2>No results found for this student</h2>");
 }
 // sort by latest first
 results = results.reverse();
 const student = results[0]; // latest attempt
const resultsHTML = results.map(r => {
  const percent = r.total
    ? Math.round((r.score / r.total) * 100)
    : 0;
  const date = r.date
    ? new Date(r.date).toLocaleString()
    : "N/A";
return `
  <div 
    onclick="viewResult('${r.testId}')"
    style="
      background:white;
      padding:20px;
      margin:15px 0;
      border-radius:12px;
      box-shadow:0 2px 6px rgba(0,0,0,0.05);
      cursor:pointer;
    "
  >
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:18px;font-weight:600;">
        ${r.testName || "Unnamed Test"}
      </div>
      <div style="
        font-size:14px;
        font-weight:600;
        color:${percent >= 70 ? "#16a34a" : percent >= 40 ? "#ca8a04" : "#dc2626"};
      ">
        ${percent}%
      </div>
    </div>
    <div style="margin-top:10px;font-size:14px;color:#555;">
      Score: <b>${r.score}/${r.total}</b>
    </div>
    <div style="font-size:12px;color:#888;margin-top:4px;">
      ${date}
    </div>
  </div>
`;
}).join("");
res.send(`
 <body style="font-family:Arial;background:#eef2ff;padding:20px;">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
     <h1 style="margin:0;">Student Details</h1>
     <button onclick="downloadReport()" style="
       padding:10px 16px;
       background:#4f46e5;
       color:white;
       border:none;
       border-radius:8px;
       cursor:pointer;
       font-weight:600;
     ">
       Download Report
     </button>
   </div>
   <p><b>Name:</b> ${student.name}</p>
   <p><b>Class:</b> ${student.class}</p>
   <p><b>Student ID:</b> ${student.studentId}</p>
   <h2>Performance History</h2>
   ${resultsHTML}
   <script>
   function viewResult(testId){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  window.location.replace(
    "/result?testId=" + testId + "&studentId=" + studentId
  );
}
window.downloadReport = function(){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  if(!studentId){
    alert("Missing student ID");
    return;
  }
  fetch("/download-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      studentId
    })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error("Server error");
    }
    return res.blob();
  })
  .then(blob => {
    if (!blob || blob.size === 0) {
      throw new Error("Empty file");
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  })
  .catch(err => {
    console.error("DOWNLOAD ERROR:", err);
    alert("Download failed");
  });
}
   </script>
 </body>
`);
});
// ---------- REGISTER TEACHER ----------
app.post("/register-teacher", (req, res) => {
 const { readJSON, writeJSON } = require("./utils/file");
 const teachers = readJSON("data/teachers.json");
 const { id, password } = req.body;
 if(!id || !password){
   return res.json({ error: "Missing fields" });
 }
 const exists = teachers.find(t => t.id === id);
 if(exists){
   return res.json({ error: "Teacher already exists" });
 }
 teachers.push({ id, password });
 writeJSON("data/teachers.json", teachers);
 res.json({ status: "registered" });
});
// ---------- SERVER ----------
const startServer = async () => {
 await connectDB();
 console.log("Test user created");   // 👈 HERE
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
};
// ---------- SCHOOL DASHBOARD ----------
app.get("/school-dashboard", async (req, res) => {
 try {
  const token = req.query.token;
if (!token) {
  return res.status(401).send("No token");
}
const jwt = require("jsonwebtoken");
let decoded;
try {
  decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  return res.status(401).send("Invalid token");
}
if (decoded.role !== "admin") {
  return res.send("Access denied");
}
   const Student = require("./models/Student");
   const ClassModel = require("./models/Class");
   const Test = require("./models/Test");
   const Assignment = require("./models/Assignment");
   const Result = require("./models/Result");
   const students = await Student.find();
   const classes = await ClassModel.find();
   const tests = await Test.find();
   const assignments = await Assignment.find();
   const results = await Result.find();
   // ✅ BUILD ASSIGNMENT MAP (class → assigned students)
let assignmentMap = {};
assignments.forEach(a => {
 const cls = a.class || "Unknown";
 if (!assignmentMap[cls]) {
   assignmentMap[cls] = new Set();
 }
 if (a.studentId) {
   assignmentMap[cls].add(String(a.studentId));
 }
});
   // ✅ CLASS PERFORMANCE MAP
let classMap = {};
results.forEach(r => {
 const cls = r.class || "Unknown";
 if (!classMap[cls]) {
   classMap[cls] = {
     students: new Set(),
     totalScore: 0,
     totalMarks: 0,
     attempts: 0
   };
 }
 classMap[cls].students.add(r.studentId);
 classMap[cls].totalScore += r.score;
 classMap[cls].totalMarks += r.total;
 classMap[cls].attempts += 1;
});
let classRows = "";
let classInsights = [];
Object.keys(classMap).forEach(cls => {
 const data = classMap[cls];
 const avg = data.totalMarks > 0
   ? Math.round((data.totalScore / data.totalMarks) * 100)
   : 0;
 // ✅ NEW: completion %
const assignedCount = assignmentMap[cls]?.size || 0;
const attemptedCount = data.students.size;
const completion = assignedCount > 0
 ? Math.round((attemptedCount / assignedCount) * 100)
 : 0;
 // ✅ NEW: color coding
 let bgColor = "white";
 if (completion < 50) bgColor = "#fee2e2";      // red
 else if (completion < 75) bgColor = "#fef3c7"; // yellow
 else bgColor = "#dcfce7";                      // green
classInsights.push({
 className: cls,
 completion: completion
});
 classRows += `
   <tr onclick="goToClass('${cls}')"
       style="cursor:pointer;background:${bgColor};">
     <td style="font-weight:600;color:#4f46e5;text-align:center;">${cls}</td>
     <td>${data.students.size}</td>
     <td>${avg}%</td>
     <td>${data.attempts}</td>
     <td><b>${completion}%</b></td>
   </tr>
 `;
});
// ✅ SORT LOWEST COMPLETION FIRST
classInsights.sort((a, b) => a.completion - b.completion);
// ✅ PICK TOP 3 PROBLEM CLASSES
const problemClasses = classInsights.slice(0, 3);
let problemHtml = "";
problemClasses.forEach(c => {
 let color = "#16a34a"; // green
 if (c.completion < 50) color = "#dc2626";      // red
 else if (c.completion < 75) color = "#ca8a04"; // yellow
 problemHtml += `
   <div style="
     display:flex;
     justify-content:space-between;
     padding:10px 0;
     border-bottom:1px solid #eee;
   ">
     <span style="font-weight:600;">${c.className}</span>
     <span style="color:${color};font-weight:700;">
       ${c.completion}%
     </span>
   </div>
 `;
});
   // BASIC COUNTS
   const totalStudents = students.length;
   const totalClasses = classes.length;
   const totalTests = tests.length;
// ✅ UNIQUE STUDENTS ASSIGNED
const assignedStudents = new Set();
assignments.forEach(a => {
 if(a.studentId){
   assignedStudents.add(String(a.studentId));
 }
});
// ✅ UNIQUE STUDENTS ATTEMPTED
const attemptedStudents = new Set();
results.forEach(r => {
 if(r.studentId){
   attemptedStudents.add(String(r.studentId));
 }
});
const assignedCount = assignedStudents.size;
const attemptedCount = attemptedStudents.size;
   // PERFORMANCE DISTRIBUTION
   let low = 0, mid = 0, high = 0;
   results.forEach(r => {
     const percent = (r.score / r.total) * 100;
     if (percent < 50) low++;
     else if (percent <= 80) mid++;
     else high++;
   });
res.send(`
<body style="margin:0;font-family:Arial;">
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user || user.role !== "admin"){
  window.location.replace("/");
}
</script>
<div style="display:flex;height:100vh;">
 <!-- SIDEBAR -->
<div style="
  width:240px;
  background:#1e293b;
  color:white;
  padding:20px 16px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
">

  <!-- TOP -->
  <div>
    <h2 style="margin-bottom:25px;">Admin</h2>

    <div onclick="go('/school-dashboard')" style="
      padding:12px 14px;
      border-radius:8px;
      margin-bottom:10px;
      cursor:pointer;
      transition:all 0.2s;
    "
    onmouseover="this.style.background='#334155'"
    onmouseout="this.style.background='transparent'">
      Dashboard
    </div>
  </div>

  <!-- BOTTOM -->
  <div>
    <div onclick="logout()" style="
      padding:12px 14px;
      border-radius:8px;
      cursor:pointer;
      color:#f87171;
      transition:all 0.2s;
    "
    onmouseover="this.style.background='#7f1d1d';this.style.color='white'"
    onmouseout="this.style.background='transparent';this.style.color='#f87171'">
      Logout
    </div>
  </div>

</div>
 <!-- CONTENT -->
 <div style="flex:1;padding:30px;background:#eef2ff;overflow:auto;">
   <h1>School Dashboard</h1>
   <div style="
 background:white;
 padding:20px;
 border-radius:12px;
 margin-top:20px;
 box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
 <h3>🚨 Top Problem Classes</h3>
 ${problemHtml || "<p style='color:gray;'>No data</p>"}
</div>
   <!-- CLASS PERFORMANCE -->
   <div style="
     background:white;
     padding:20px;
     border-radius:12px;
     margin-top:20px;
   ">
     <h3>Class Performance</h3>
<table border="1" cellpadding="10" style="
 width:100%;
 border-collapse:collapse;
 margin-top:10px;
 text-align:center;
">
 <tr style="background:#f1f5f9;">
   <th>Class</th>
   <th>Students</th>
   <th>Avg Score</th>
   <th>Attempts</th>
   <th>Completion</th>
 </tr>
 ${classRows || "<tr><td colspan='5'>No data</td></tr>"}
</table>
   </div>
   <!-- CARDS (FIXED CENTERED) -->
   <div style="
     display:flex;
     gap:20px;
     margin:20px 0 30px 0;
     flex-wrap:wrap;
   ">
     <div style="
       background:white;
       padding:20px;
       border-radius:12px;
       min-width:150px;
       box-shadow:0 4px 10px rgba(0,0,0,0.05);
       display:flex;
       flex-direction:column;
       align-items:center;
       justify-content:center;
     ">
<h3 style="margin-bottom:10px;color:#64748b;">Students</h3>
<p id="studentsCount" style="font-size:32px;font-weight:700;margin:0;">
 0
</p>
</div>
<div style="
 background:white;
 padding:20px;
 border-radius:12px;
 min-width:150px;
 box-shadow:0 4px 10px rgba(0,0,0,0.05);
 display:flex;
 flex-direction:column;
 align-items:center;
 justify-content:center;
">
 <h3 style="margin-bottom:10px;color:#64748b;">Classes</h3>
 <p id="classesCount" style="font-size:32px;font-weight:700;margin:0;">
   0
 </p>
</div>
<div style="
 background:white;
 padding:20px;
 border-radius:12px;
 min-width:150px;
 box-shadow:0 4px 10px rgba(0,0,0,0.05);
 display:flex;
 flex-direction:column;
 align-items:center;
 justify-content:center;
">
 <h3 style="margin-bottom:10px;color:#64748b;">Tests</h3>
 <p id="testsCount" style="font-size:32px;font-weight:700;margin:0;">
   0
 </p>
</div>
   </div>
   <!-- COVERAGE -->
   <div style="
     background:white;
     padding:20px;
     border-radius:12px;
     margin-top:20px;
     box-shadow:0 4px 10px rgba(0,0,0,0.05);
   ">
     <h3>Student Coverage</h3>
     <p>Assigned: ${assignedCount}</p>
     <p>Attempted: ${attemptedCount}</p>
   </div>
   <!-- PERFORMANCE -->
   <div style="
     background:white;
     padding:20px;
     border-radius:12px;
     margin-top:20px;
     box-shadow:0 4px 10px rgba(0,0,0,0.05);
   ">
     <h3>Performance Distribution</h3>
     <p>Below 50%: ${low}</p>
     <p>50–80%: ${mid}</p>
     <p>Above 80%: ${high}</p>
   </div>
 </div>
</div>
<script>
function go(path){ window.location.replace(path); }
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
function goToClass(cls){
window.location.replace("/admin-class?class=" + encodeURIComponent(cls));
}
</script>
</body>
`);
 } catch (err) {
   console.error(err);
   res.send("Error loading dashboard");
 }
});
// ---------- ADMIN CLASS VIEW ----------
app.get("/admin-class", authMiddleware, async (req, res) => {
 try {
  if (req.user.role !== "admin") {
  return res.send("Access denied");
}
   let className = req.query.class;
   className = String(className || "").trim();
   const Result = require("./models/Result");
   const Assignment = require("./models/Assignment");
   const Student = require("./models/Student");
   const results = await Result.find({ class: className });
   // ✅ assigned students
   const assignments = await Assignment.find({ class: className });
   // ✅ all students in class
   const students = await Student.find({ class: className });
   // ✅ attempted students
   const attemptedSet = new Set(results.map(r => String(r.studentId)));
   // ✅ assigned students
   const assignedSet = new Set(assignments.map(a => String(a.studentId)));
   // ---------- MISSING STUDENTS ----------
   let missingStudents = [];
   if (assignedSet.size > 0) {
     students.forEach(s => {
       if (
         assignedSet.has(String(s.studentId)) &&
         !attemptedSet.has(String(s.studentId))
       ) {
         missingStudents.push(s);
       }
     });
   }
   let missingHtml = "";
   missingStudents.forEach(s => {
     missingHtml += `
       <div style="
         padding:10px;
         border-bottom:1px solid #eee;
         display:flex;
         justify-content:space-between;
       ">
         <span>${s.name} (${s.studentId})</span>
         <span style="color:#dc2626;font-weight:600;">
           Not Attempted
         </span>
       </div>
     `;
   });
   // ---------- STUDENT PERFORMANCE ----------
   let studentMap = {};
   results.forEach(r => {
     if (!studentMap[r.studentId]) {
       studentMap[r.studentId] = {
         name: r.name,
         totalScore: 0,
         totalMarks: 0,
         attempts: 0
       };
     }
     studentMap[r.studentId].totalScore += r.score;
     studentMap[r.studentId].totalMarks += r.total;
     studentMap[r.studentId].attempts += 1;
   });
   let rows = "";
   let lowPerformers = [];
   Object.keys(studentMap).forEach(id => {
     const s = studentMap[id];
     const avg = s.totalMarks > 0
       ? Math.round((s.totalScore / s.totalMarks) * 100)
       : 0;
     // ✅ LOW PERFORMERS
     if (avg < 40) {
       lowPerformers.push({
         id,
         name: s.name,
         avg
       });
     }
     rows += `
       <tr onclick="goToStudent('${id}')" style="cursor:pointer;">
         <td style="font-weight:600;color:#4f46e5;text-align:center;">${s.name}</td>
         <td>${id}</td>
         <td>${avg}%</td>
         <td>${s.attempts}</td>
       </tr>
     `;
   });
   // ---------- LOW PERFORMERS UI ----------
   let lowHtml = "";
   lowPerformers.forEach(s => {
     lowHtml += `
       <div style="
         display:flex;
         justify-content:space-between;
         padding:10px 0;
         border-bottom:1px solid #eee;
       ">
         <span>${s.name} (${s.id})</span>
         <span style="color:#dc2626;font-weight:700;">
           ${s.avg}%
         </span>
       </div>
     `;
   });
res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<div style="padding:30px;">
 <h1>Class: ${className}</h1>
 <!-- MISSING STUDENTS -->
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   margin-top:20px;
   margin-bottom:20px;
   box-shadow:0 4px 10px rgba(0,0,0,0.05);
 ">
   <h3>❗ Students Not Attempted</h3>
   ${missingHtml || "<p style='color:gray;'>All students attempted</p>"}
 </div>
 <!-- LOW PERFORMERS -->
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   margin-bottom:20px;
   box-shadow:0 4px 10px rgba(0,0,0,0.05);
 ">
   <h3>⚠️ Low Performers (&lt; 40%)</h3>
   ${lowHtml || "<p style='color:gray;'>No low performers</p>"}
 </div>
 <!-- TABLE -->
 <table border="1" cellpadding="10" style="
   width:100%;
   border-collapse:collapse;
   margin-top:20px;
   background:white;
   text-align:center;
 ">
   <tr style="background:#f1f5f9;">
     <th>Name</th>
     <th>Student ID</th>
     <th>Avg Score</th>
     <th>Attempts</th>
   </tr>
   ${rows || "<tr><td colspan='4'>No data</td></tr>"}
 </table>
 <!-- BUTTONS -->
 <button onclick="downloadClassReport()" style="
   margin-top:20px;
   margin-right:10px;
   padding:10px 16px;
   background:#16a34a;
   color:white;
   border:none;
   border-radius:8px;
   cursor:pointer;
 ">
   Download Class Report
 </button>
 <button onclick="goBack()" style="
   margin-top:20px;
   padding:10px 16px;
   background:#4f46e5;
   color:white;
   border:none;
   border-radius:8px;
   cursor:pointer;
 ">
   Back
 </button>
</div>
<script>
function downloadClassReport(){
 fetch("/download-class-report", {
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify({
     className: "${className}"
   })
 })
 .then(res => res.blob())
 .then(blob => {
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = "class_report.xls";
   a.click();
 })
 .catch(err => {
   console.error(err);
   alert("Download failed");
 });
}
function goBack(){
 window.location.replace("/school-dashboard");
}
function goToStudent(id){
 window.location.replace("/admin-student?studentId=" + encodeURIComponent(id));
}
</script>
</body>
`);
 } catch (err) {
   console.error(err);
   res.send("Error loading class");
 }
});
// ---------- ADMIN STUDENT VIEW ----------
app.get("/admin-student", authMiddleware, async (req, res) => {
 try {
  if (req.user.role !== "admin") {
  return res.send("Access denied");
}
   const studentId = req.query.studentId;
   const Result = require("./models/Result");
   const results = await Result.find({ studentId });
   if (!results.length) {
     return res.send("<h2>No data found</h2>");
   }
   const student = results[0];
   let rows = results.map(r => {
     const percent = Math.round((r.score / r.total) * 100);
     const date = r.date
       ? new Date(r.date).toLocaleString()
       : "N/A";
     return `
       <div style="
         background:white;
         padding:15px;
         margin:10px 0;
         border-radius:10px;
       ">
         <b>Test:</b> ${r.testName}<br>
         <b>Score:</b> ${r.score}/${r.total} (${percent}%)<br>
         <b>Date:</b> ${date}
       </div>
     `;
   }).join("");
   res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<div style="padding:30px;max-width:800px;margin:auto;">
 <h1>Student Report</h1>
 <div style="
   background:white;
   padding:20px;
   border-radius:12px;
   margin-bottom:20px;
 ">
   <p><b>Name:</b> ${student.name}</p>
   <p><b>Student ID:</b> ${studentId}</p>
   <p><b>Class:</b> ${student.class || "N/A"}</p>
 </div>
 <h3>Performance History</h3>
 ${rows}
 <button onclick="downloadReport()" style="
   margin-top:20px;
   padding:10px 16px;
   background:#4f46e5;
   color:white;
   border:none;
   border-radius:8px;
   cursor:pointer;
 ">
   Download Report
 </button>
 <br><br>
 <button onclick="goBack()" style="
   padding:10px 16px;
   background:#64748b;
   color:white;
   border:none;
   border-radius:8px;
   cursor:pointer;
 ">
   Back
 </button>
</div>
<script>
function goBack(){
 window.history.back();
}
window.downloadReport = function(){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  if(!studentId){
    alert("Missing student ID");
    return;
  }
  fetch("/download-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      studentId: studentId
    })
  })
  .then(res => {
    if(!res.ok){
      throw new Error("Failed");
    }
    return res.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  })
  .catch(() => {
    alert("Download failed");
  });
}
</script>
</body>
   `);
 } catch (err) {
   console.error(err);
   res.send("Error loading student");
 }
});
startServer();
