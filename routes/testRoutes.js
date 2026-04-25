const express = require("express");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/file");
const jwt = require("jsonwebtoken");
const Test = require("../models/Test");
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
function navbar(){
return `
<div style="
position:fixed;
top:0;
left:0;
z-index:1000;
width:100%;
background:#333;
padding:10px;
display:flex;
gap:10px;
width:100%;
box-sizing:border-box;
">
<button onclick="go('/teacher')" class="nav-btn">Dashboard</button>
<button onclick="go('/library')" class="nav-btn">Library</button>
<button onclick="go('/teacher-tests')" class="nav-btn">Tests</button>
<button onclick="go('/classes')" class="nav-btn">Classes</button>
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
</script>
`;
}
// ---------- GET CLASSES ----------
router.get("/get-classes", async (req, res) => {
  try {
    const Student = require("../models/Student");
    let classes;
const teacherId = String(req.query.teacherId || "").trim();
if (teacherId) {
  classes = await Student.find({ teacherId }).distinct("class");
} else {
  // fallback for student-entry page
  classes = await Student.distinct("class");
}
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});
// ---------- GET STUDENTS BY CLASS ----------
router.get("/get-students", async (req, res) => {
  try {
    const { className } = req.query;
    if (!className) {
      return res.status(400).json({ error: "Class required" });
    }
    const Student = require("../models/Student");
const students = await Student.find(
  { class: className },
  { studentId: 1, name: 1, teacherId: 1, _id: 0 }
);
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});
// ---------- DATA ----------
const questions = readJSON("data/questions.json");
// ---------- TEACHER TEST LIST ----------
router.get("/teacher-tests", async (req, res) => {
  const Test = require("../models/Test");
  const tests = await Test.find();
  const content = `
    <h1 style="margin-bottom:20px;">Tests</h1>
    <button onclick="go('/create-test')" style="
      padding:14px 20px;
      background:linear-gradient(135deg,#4f46e5,#6366f1);
      color:white;
      border:none;
      border-radius:10px;
      font-weight:700;
      cursor:pointer;
      margin-bottom:15px;
      font-size:15px;
    ">
      + Create Test
    </button>
    <button onclick="deleteSelected()" style="
      margin-left:10px;
      padding:12px 16px;
      background:#dc3545;
      color:white;
      border:none;
      border-radius:8px;
      cursor:pointer;
      font-weight:600;
    ">
      Delete Selected
    </button>
    <div id="testList"></div>
    <script>
      window.onload = function(){
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const allTests = ${JSON.stringify(tests)};
        const myTests = allTests.filter(t =>
          String(t.teacherId) === String(user._id || user.id)
        );
        const html = myTests.map(t => \`
          <div style="
            background:white;
            padding:18px 20px;
            margin:15px 0;
            border-radius:12px;
            display:flex;
            justify-content:space-between;
            align-items:center;
          ">
            <div style="display:flex;align-items:center;gap:10px;">
              <input type="checkbox" class="testCheckbox" value="\${t._id}">
              <div style="font-size:18px;font-weight:600;">
                \${t.name}
              </div>
            </div>
            <div>
              <button onclick="assignTest('\${t._id}')"
                style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;margin-right:10px;cursor:pointer;">
                Assign
              </button>
              <button onclick="confirmDelete('\${t._id}')"
                style="padding:8px 12px;background:#dc3545;color:white;border:none;border-radius:8px;cursor:pointer;">
                Delete
              </button>
            </div>
          </div>
        \`).join("");
        document.getElementById("testList").innerHTML =
          html || "<p>No tests found</p>";
      };
      function assignTest(testId){
        fetch("/assign-test", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ testId })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert(data.message || "Test assigned");
        })
        .catch(() => alert("Assignment failed"));
      }
      function confirmDelete(id){
        if(!confirm("Delete test?")) return;
        fetch("/delete-test", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert("Test deleted");
          location.reload();
        })
        .catch(() => alert("Delete failed"));
      }
      function deleteSelected(){
        const selected = Array.from(
          document.querySelectorAll(".testCheckbox:checked")
        ).map(cb => cb.value);
        if(selected.length === 0){
          alert("No tests selected");
          return;
        }
        if(!confirm("Delete selected tests?")) return;
        fetch("/delete-multiple-tests", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ ids: selected })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert("Deleted successfully");
          location.reload();
        })
        .catch(() => alert("Bulk delete failed"));
      }
    </script>
  `;
  res.send(layout(content, "tests"));
});
// ---------- CREATE TEST ----------
router.get("/create-test", (req, res) => {
  const questions = readJSON("data/questions.json");
  const questionList = questions.map(q => `
    <label style="
      display:block;
      padding:10px;
      border:1px solid #ddd;
      border-radius:8px;
      margin-bottom:10px;
      cursor:pointer;
      background:white;
    ">
      <input type="checkbox" value="${q.id}" class="qbox">
      ${q.question}
    </label>
  `).join("");
  const content = `
    <h1 style="margin-bottom:20px;">Create Test</h1>
    <div style="
      max-width:700px;
      background:white;
      padding:25px;
      border-radius:12px;
      box-shadow:0 4px 12px rgba(0,0,0,0.08);
    ">
      <input id="testName" placeholder="Enter test name" style="
        width:100%;
        padding:12px;
        margin-bottom:15px;
        border-radius:8px;
        border:1px solid #ccc;
      "/>
      <select id="className" style="
        width:100%;
        padding:12px;
        margin-bottom:15px;
        border-radius:8px;
        border:1px solid #ccc;
      ">
        <option value="">Select Class</option>
        <option value="C1">C1</option>
        <option value="C2">C2</option>
        <option value="C3">C3</option>
      </select>
      <select id="subject" style="
        width:100%;
        padding:12px;
        margin-bottom:20px;
        border-radius:8px;
        border:1px solid #ccc;
      ">
        <option value="">Select Subject</option>
        <option value="Maths">Maths</option>
        <option value="CS">CS</option>
        <option value="Physics">Physics</option>
      </select>
      <h3>Select Questions</h3>
      <div style="max-height:300px;overflow:auto;">
        ${questionList}
      </div>
      <button onclick="clearSelection()" style="
        margin-top:10px;
        padding:8px 12px;
        background:#dc3545;
        color:white;
        border:none;
        border-radius:6px;
        cursor:pointer;
      ">
        Clear Selection
      </button>
      <button onclick="saveTest()" style="
        margin-top:20px;
        width:100%;
        padding:12px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:600;
        cursor:pointer;
        font-size:16px;
      ">
        Save Test
      </button>
    </div>
    <script>
      function saveTest(){
        const name = document.getElementById("testName").value;
        const subject = document.getElementById("subject").value;
        const className = document.getElementById("className").value;
        const selected = Array.from(
          document.querySelectorAll("input[type=checkbox]:checked")
        ).map(i => parseInt(i.value));
        if(!name) return alert("Enter test name");
        if(!className) return alert("Select class");
        if(!subject) return alert("Select subject");
        if(selected.length === 0) return alert("Select at least one question");
        fetch("/save-test", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({
            name,
            questionIds: selected,
            className,
            subject
          })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error) return alert(data.error);
          alert("Test created!");
          window.location.replace("/teacher-tests");
        })
        .catch(() => alert("Failed to create test"));
      }
      function clearSelection(){
        localStorage.removeItem("selectedQuestions");
        location.reload();
      }
      const selected = JSON.parse(localStorage.getItem("selectedQuestions") || "[]");
      document.querySelectorAll(".qbox").forEach(cb => {
        if(selected.includes(parseInt(cb.value))){
          cb.checked = true;
        }
      });
    </script>
  `;
  res.send(layout(content, "tests"));
});
// ---------- SAVE TEST ----------
router.post("/save-test", authMiddleware, async (req, res) => {
  try {
    const { name, questionIds, className, subject } = req.body;
    if (!name || !Array.isArray(questionIds) || !questionIds.length) {
  return res.status(400).json({ error: "Invalid test data" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Class and subject required" });
    }
    console.log("SAVE TEST BODY:", req.body);
    const ClassSubject = require("../models/ClassSubject");
    const normalizedClass = String(className || "").trim().toUpperCase();
const normalizedSubject =
  String(subject || "").trim().charAt(0).toUpperCase() +
  String(subject || "").trim().slice(1).toLowerCase();
    console.log("INPUT VALUES:", {
  normalizedClass,
  normalizedSubject
});
// 🔒 CHECK MAPPING
const mapping = await ClassSubject.findOne({
  className: normalizedClass,
  subject: normalizedSubject,
  teacherId: String(req.user.id)
});
    if (!mapping) {
      return res.status(403).json({
        error: "You are not assigned to this class and subject"
      });
    }
    const newTest = await Test.create({
      name,
      questionIds,
      teacherId: req.user.id,
      className: normalizedClass,
      subject: normalizedSubject
    });
const Assignment = require("../models/Assignment");
const exists = await Assignment.findOne({
  testId: newTest._id,
  className: newTest.className,
  teacherId: req.user.id
});
if (!exists) {
  await Assignment.create({
    testId: newTest._id,
    testName: newTest.name,
    className: newTest.className,
    teacherId: req.user.id
  });
}
    res.json({ status: "saved", test: newTest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save test" });
  }
});
// ---------- DELETE TEST ----------
router.post("/delete-test", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing test id" });
    }
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    // 🔒 Only allow deleting own tests
    const test = await Test.findOne({
      _id: id,
      teacherId: req.user.id
    });
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    // 🗑 Delete test
    await Test.deleteOne({ _id: id });
    // 🧹 Remove assignments linked to this test
    await Assignment.deleteMany({ testId: id });
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("DELETE TEST ERROR:", err);
    res.status(500).json({ error: "Failed to delete test" });
  }
});
router.post("/delete-multiple-tests", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "No test ids provided" });
    }
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    // 🔒 Only delete teacher's own tests
    await Test.deleteMany({
      _id: { $in: ids },
      teacherId: req.user.id
    });
    await Assignment.deleteMany({
      testId: { $in: ids }
    });
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
});
// ---------- TEST PAGE ----------
router.get("/test", async (req, res) => {
  try {
    const id = req.query.id;
    const studentId = req.query.studentId;
    if (!id || !studentId) {
      return res.redirect("/student-entry");
    }
    const Result = require("../models/Result");
    const alreadyAttempted = await Result.findOne({
      studentId,
      testId: id
    });
    if (alreadyAttempted) {
      return res.redirect("/my-tests");
    }
    const test = await Test.findById(id);
    if (!test) return res.send("<h1>Test not found</h1>");
    const questions = readJSON("data/questions.json");
    const testQuestions = test.questionIds
      .map(i => questions.find(q => q.id === i))
      .filter(Boolean);
    const html = testQuestions.map((q, i) => {
      if (q.options && q.options.length) {
        return `
          <div style="background:white;padding:20px;margin:15px 0;border-radius:12px;">
            <p><b>Q${i + 1}: ${q.question}</b></p>
            ${q.options.map(o => `
              <label>
                <input type="radio" name="q${q.id}" value="${o}"> ${o}
              </label><br>
            `).join("")}
          </div>
        `;
      }
      return `
        <div style="background:white;padding:20px;margin:15px 0;border-radius:12px;">
          <p><b>Q${i + 1}: ${q.question}</b></p>
          <textarea id="code-${q.id}" style="width:100%;height:150px;"></textarea>
        </div>
      `;
    }).join("");
    res.send(`
<body style="margin:0;font-family:Arial;">
<div id="examGate" style="
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background:#000;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  z-index:9999;
">
  <h2 style="color:white;margin-bottom:20px;">Start Test</h2>
  <button id="startExamBtn" style="
    padding:14px 22px;
    font-size:16px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
  ">
    Click to Start
  </button>
</div>
<div style="display:flex;height:100vh;">
  <div style="width:220px;background:#1e293b;color:white;padding:20px;">
    <h2>Student</h2>
  </div>
  <div style="flex:1;padding:30px;background:#eef2ff;overflow:auto;">
    <h1>${test.name}</h1>
    ${html}
    <button id="submitBtn" onclick="submitTest()">Submit</button>
  </div>
</div>
<script>
const qs = ${JSON.stringify(testQuestions)};
const testId = "${test._id}";
const testName = "${test.name}";
const studentId = "${studentId}";
document.getElementById("startExamBtn").onclick = function(){
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  startExamMode();
  document.getElementById("examGate").remove();
};
function startExamMode(){
  window.__examTriggered = false;
  // ONE history entry only
  history.pushState(null, null, location.href);
  // BACK BUTTON → submit once
  window.onpopstate = function () {
    if (!window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Back button");
    }
  };
  // TAB SWITCH
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Tab switch");
    }
  });
  // EXIT FULLSCREEN
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Exited fullscreen");
    }
  });
  // WINDOW BLUR (delay to avoid false trigger)
  setTimeout(() => {
    window.addEventListener("blur", () => {
      if (!window.__examTriggered) {
        window.__examTriggered = true;
        autoSubmit("Focus lost");
      }
    });
  }, 1500);
}
function autoSubmit(reason){
 console.log("Auto submitted:", reason);
  submitTest();
}
function submitTest(){
  const btn = document.getElementById("submitBtn");
  if (btn.disabled) return;
  btn.disabled = true;
  let score = 0;
  let answers = [];
  qs.forEach(q => {
    const s = document.querySelector('input[name="q'+q.id+'"]:checked');
    const selected = s ? s.value : null;
    const isCorrect = selected === q.correct;
    if(isCorrect) score++;
    answers.push({
      questionId: q.id,
      selected,
      correctAnswer: q.correct,
      isCorrect
    });
  });
  fetch("/submit", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      studentId,
      testId,
      testName,
      score,
      total: qs.length,
      answers
    })
  })
  .then(res => res.json())
  .then(() => {
    alert("Submitted");
    window.location.replace("/my-tests");
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading test");
  }
});
// ---------- LIBRARY ----------
router.get("/library", (req, res) => {
console.log("LIBRARY ROUTE HIT");
const questions = readJSON("data/questions.json");
console.log("TOTAL QUESTIONS:", questions.length);
const subject = req.query.subject || "all";
const board = req.query.board || "all";
const subjects = [...new Set(questions.map(q => q.subject || q.category))];
const boards = [...new Set(questions.map(q => q.board || "General"))];
const filtered = questions.filter(q => {
const qSubject = q.subject || q.category;
const qBoard = q.board || "General";
const subjectMatch = subject === "all" || qSubject === subject;
const boardMatch = board === "all" || qBoard === board;
return subjectMatch && boardMatch;
});
const list = filtered.map(q => `
<div style="
 background:white;
 padding:18px;
 margin:12px 0;
 border-radius:12px;
 box-shadow:0 2px 8px rgba(0,0,0,0.06);
 display:flex;
 justify-content:space-between;
 align-items:center;
">
 <div>
   <p style="margin:0 0 8px 0;font-weight:600;">
     ${q.question}
   </p>
   <p style="margin:0;color:#666;font-size:14px;">
     ${q.subject || q.category} | ${q.board || "Other"} | ${q.difficulty}
   </p>
 </div>
 <button onclick="addToTest(${q.id})" style="
   padding:10px 14px;
   background:#4f46e5;
   color:white;
   border:none;
   border-radius:8px;
   font-weight:600;
   cursor:pointer;
 ">
   + Add to Test
 </button>
</div>
`).join("");
const content = `
<h1 style="margin-bottom:20px;">Questions Library</h1>
<div style="display:flex; gap:20px;">
  <!-- FILTER PANEL -->
  <div style="
    width:250px;
    background:white;
    padding:15px;
    border-radius:10px;
    height:fit-content;
  ">
    <h3 style="margin-top:0;">Filters</h3>
    <form>
      <div style="margin-bottom:10px;">
        <label>Subject</label><br>
        <select name="subject" onchange="this.form.submit()">
          <option value="all">All</option>
          ${subjects.map(s => `
            <option value="${s}" ${s === subject ? "selected" : ""}>
              ${s}
            </option>
          `).join("")}
        </select>
      </div>
      <div style="margin-bottom:10px;">
        <label>Board</label><br>
        <select name="board" onchange="this.form.submit()">
          <option value="all">All</option>
          ${boards.map(b => `
            <option value="${b}" ${b === board ? "selected" : ""}>
              ${b}
            </option>
          `).join("")}
        </select>
      </div>
    </form>
  </div>
  <!-- QUESTIONS -->
  <div style="flex:1;">
    ${list || "<p>No questions found</p>"}
  </div>
</div>
<script>
function addToTest(id){
  let selected = JSON.parse(localStorage.getItem("selectedQuestions") || "[]");
  if(!selected.includes(id)){
    selected.push(id);
    localStorage.setItem("selectedQuestions", JSON.stringify(selected));
    alert("Added to test");
  }
}
</script>
`;
res.send(layout(content, "library"));
});
// ---------- BULK UPLOAD HUB ----------
router.get("/bulk-upload", (req, res) => {
res.send(`
<body style="margin:0;background:#eef2ff;font-family:Arial;">
 ${navbar()}
 <div style="padding-top:70px;">
   <div style="max-width:900px;margin:20px auto;padding:0 10px;">
     <h1>📥 Bulk Upload Center</h1>
     <!-- QUESTIONS -->
     <div style="background:white;padding:20px;margin:20px 0;border-radius:12px;">
<h2>Upload Questions</h2>
<p style="color:gray;">Upload CSV and map fields</p>
<input type="file" id="questionFile" accept=".csv" />
<br><br>
<button onclick="loadQuestionCSV()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Load CSV
</button>
<div id="questionMapping" style="margin-top:20px;"></div>
<br>
<button onclick="processQuestionUpload()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Upload Questions
</button>
     </div>
     <!-- STUDENTS -->
     <div style="background:white;padding:20px;margin:20px 0;border-radius:12px;">
<h2>Upload Students</h2>
<p style="color:gray;">Upload CSV and map fields</p>
<input type="file" id="studentFile" accept=".csv" />
<br><br>
<button onclick="loadStudentCSV()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Load CSV
</button>
<div id="studentMapping" style="margin-top:20px;"></div>
<br>
<button onclick="processStudentUpload()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Upload Students
</button>
     </div>
     <!-- TEACHERS -->
     <div style="background:white;padding:20px;margin:20px 0;border-radius:12px;">
<h2>Upload Teachers</h2>
<p style="color:gray;">Upload CSV and map fields</p>
<input type="file" id="teacherFile" accept=".csv" />
<br><br>
<button onclick="loadTeacherCSV()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Load CSV
</button>
<div id="teacherMapping" style="margin-top:20px;"></div>
<br>
<button onclick="processTeacherUpload()" style="
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Upload Teachers
</button>
     </div>
   </div>
 </div>
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if (!user || user.role !== "teacher") {
  window.location.replace("/");
}
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
// =========================
// TEACHER CSV LOGIC
// =========================
let teacherCSV = [];
let teacherHeaders = [];
function loadTeacherCSV(){
 const file = document.getElementById("teacherFile").files[0];
 if(!file) return alert("Select a CSV file");
 const reader = new FileReader();
 reader.onload = function(e){
   const rows = e.target.result.split("\\n")
     .map(r => r.replace("\\r","").trim())
     .filter(r => r);
   teacherHeaders = rows[0].split(",").map(h => h.trim());
   teacherCSV = rows.slice(1).map(row =>
     row.split(",").map(v => v.trim())
   );
   showTeacherMapping();
 };
 reader.readAsText(file);
}
function showTeacherMapping(){
 const fields = ["name","email","password"];
 let html = "<h3>Map CSV Fields</h3>";
 teacherHeaders.forEach((h, i) => {
   html += "<div><b>"+h+"</b> → <select id='teacher-map-"+i+"'>" +
     "<option value=''>Ignore</option>" +
     fields.map(f => "<option value='"+f+"'>"+f+"</option>").join("") +
     "</select></div>";
 });
 document.getElementById("teacherMapping").innerHTML = html;
}
function processTeacherUpload(){
 let mapping = {};
 teacherHeaders.forEach((h, i) => {
   const val = document.getElementById("teacher-map-"+i).value;
   if(val) mapping[i] = val;
 });
 const data = teacherCSV.map(row => {
   let obj = {};
   row.forEach((val, i) => {
     if(mapping[i]) obj[mapping[i]] = val;
   });
   return obj;
 });
 fetch("/upload-teachers", {
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify(data)
 })
 .then(res => res.json())
 .then(res => alert("Created: "+res.created+" | Skipped: "+res.skipped));
}
// =========================
// STUDENT CSV LOGIC
// =========================
let studentCSV = [];
let studentHeaders = [];
function loadStudentCSV(){
 const file = document.getElementById("studentFile").files[0];
 if(!file) return alert("Select a CSV file");
 const reader = new FileReader();
 reader.onload = function(e){
   const rows = e.target.result.split("\\n")
     .map(r => r.replace("\\r","").trim())
     .filter(r => r);
   studentHeaders = rows[0].split(",").map(h => h.trim());
   studentCSV = rows.slice(1).map(row =>
     row.split(",").map(v => v.trim())
   );
   showStudentMapping();
 };
 reader.readAsText(file);
}
function showStudentMapping(){
  const fields = ["studentId","name","class","teacherEmail"];
  let html = "<h3>Map CSV Fields</h3>";
  studentHeaders.forEach(function(h, i){
    html += "<div style='margin:8px 0;'>" +
      "<b>" + h + "</b> → " +
      "<select id='student-map-" + i + "'>" +
      "<option value=''>Ignore</option>" +
      fields.map(function(f){
        return "<option value='" + f + "'>" + f + "</option>";
      }).join("") +
      "</select></div>";
  });
  document.getElementById("studentMapping").innerHTML = html;
}
function processStudentUpload(){
  if(!studentCSV.length) return alert("Load CSV first");
  let mapping = {};
  studentHeaders.forEach(function(h, i){
    const el = document.getElementById("student-map-" + i);
    if(!el) return;
    const val = el.value;
    if(val) mapping[i] = val;
  });
  if(Object.keys(mapping).length === 0){
    return alert("Map at least one field");
  }
  const data = studentCSV.map(function(row){
    let obj = {};
    row.forEach(function(val, i){
      if(mapping[i]){
        obj[mapping[i]] = val;
      }
    });
    return obj;
  });
  console.log("UPLOAD DATA:", data);
fetch("/upload-students", {
  method:"POST",
  headers:{ 
    "Content-Type":"application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
  },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(res => {
  alert(
    "Created: " + res.created +
    " | Updated: " + res.updated +
    " | Skipped: " + res.skipped
  );
});
}
// =========================
// QUESTION CSV LOGIC
// =========================
let questionCSV = [];
let questionHeaders = [];
function loadQuestionCSV(){
 const file = document.getElementById("questionFile").files[0];
 if(!file) return alert("Select a CSV file");
 const reader = new FileReader();
 reader.onload = function(e){
   const rows = e.target.result.split("\\n")
     .map(r => r.replace("\\r","").trim())
     .filter(r => r);
   questionHeaders = rows[0].split(",").map(h => h.trim());
   questionCSV = rows.slice(1).map(row =>
     row.split(",").map(v => v.trim())
   );
   showQuestionMapping();
 };
 reader.readAsText(file);
}
function showQuestionMapping(){
 const fields = ["question","option1","option2","option3","option4","correct","subject","board","difficulty","category"];
 let html = "<h3>Map CSV Fields</h3>";
 questionHeaders.forEach((h, i) => {
   html += "<div><b>"+h+"</b> → <select id='question-map-"+i+"'>" +
     "<option value=''>Ignore</option>" +
     fields.map(f => "<option value='"+f+"'>"+f+"</option>").join("") +
     "</select></div>";
 });
 document.getElementById("questionMapping").innerHTML = html;
}
function processQuestionUpload(){
 let mapping = {};
 questionHeaders.forEach((h, i) => {
   const val = document.getElementById("question-map-"+i).value;
   if(val) mapping[i] = val;
 });
 const data = questionCSV.map(row => {
   let obj = {};
   row.forEach((val, i) => {
     if(mapping[i]) obj[mapping[i]] = val;
   });
   return {
     type:"mcq",
     question: obj.question,
     options:[obj.option1,obj.option2,obj.option3,obj.option4],
     correct: obj.correct,
     subject: obj.subject
   };
 });
 fetch("/upload-questions", {
   method:"POST",
   headers:{ "Content-Type":"application/json" },
   body: JSON.stringify(data)
 })
 .then(() => alert("Questions uploaded"));
}
</script>
</body>
`);
});
router.post("/upload-questions", (req, res) => {
const existing = readJSON("data/questions.json");
const newQuestions = req.body;
if (!Array.isArray(newQuestions) || !newQuestions.length) {
  return res.status(400).json({ error: "Invalid data" });
}
let lastId = existing.length ? existing[existing.length - 1].id : 0;
const processed = newQuestions.map((q, i) => ({
 id: lastId + i + 1,
 ...q
}));
const updated = [...existing, ...processed];
writeJSON("data/questions.json", updated);
res.json({ status: "ok", added: processed.length });
});
// ---------- BULK UPLOAD STUDENTS ----------
router.post("/upload-students", authMiddleware, async (req, res) => {
try {
 const Student = require("../models/Student");
 const User = require("../models/User");
 const ClassModel = require("../models/Class");
 const data = req.body;
 let created = 0;
 let updated = 0;
 let skipped = 0;
 for(const row of data){
   // ✅ VALIDATION
   if(!row.studentId || !row.name || !row.class || !row.teacherEmail){
     skipped++;
     continue;
   }
   // ✅ FIND TEACHER
   const teacher = await User.findOne({
     email: row.teacherEmail,
     role: "teacher"
   });
   if (String(teacher._id) !== String(req.user.id)) {
  skipped++;
  continue;
}
   if(!teacher){
     skipped++;
     continue;
   }
// ✅ CHECK IF STUDENT EXISTS
let student = await Student.findOne({ studentId: row.studentId });
if(!student){
// CREATE NEW STUDENT
student = await Student.create({
  studentId: row.studentId,
  name: row.name,
  class: row.class,
  teacherId: teacher._id
});
created++;
} else {
// UPDATE EXISTING (ONLY IF SAME TEACHER)
if (String(student.teacherId) !== String(req.user.id)) {
 skipped++;
 continue;
}
student.name = row.name;
student.class = row.class;
await student.save();
updated++; // ✅ ADD THIS LINE
}
   // ===============================
   // CLASS LOGIC
   // ===============================
   let classDoc = await ClassModel.findOne({
     name: row.class,
     teacherId: req.user.id
   });
   if(!classDoc){
     classDoc = await ClassModel.create({
       name: row.class,
       teacherId: req.user.id,
       studentIds: [row.studentId]
     });
   } else {
     if(!classDoc.studentIds.includes(row.studentId)){
       classDoc.studentIds.push(row.studentId);
       await classDoc.save();
     }
   }
 }
 res.json({ created, updated, skipped });
} catch (err) {
 console.error(err);
 res.status(500).json({ error: "Upload failed" });
}
});
// ---------- ASSIGN TEST ----------
router.post("/assign-test", authMiddleware, async (req, res) => {
  try {
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const ClassSubject = require("../models/ClassSubject");
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: "Missing testId" });
    }
    // ✅ GET TEST
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    const className = String(test.className).trim().toUpperCase();
    const subject =
      String(test.subject).charAt(0).toUpperCase() +
      String(test.subject).slice(1).toLowerCase();
    // 🔒 VALIDATE TEACHER MAPPING
    const mapping = await ClassSubject.findOne({
      className,
      subject,
      teacherId: String(req.user.id)
    });
    if (!mapping) {
      return res.status(403).json({
        error: "You are not allowed to assign this test"
      });
    }
    // 🚫 PREVENT DUPLICATE ASSIGN
    const exists = await Assignment.findOne({
      testId: String(testId),
      className,
      teacherId: String(req.user.id)
    });
    if (exists) {
      return res.json({ message: "Test already assigned" });
    }
    // ✅ CREATE ASSIGNMENT
    const assignment = await Assignment.create({
      testId: String(testId),
      testName: test.name,
      className,
      teacherId: String(req.user.id)
    });
    res.json({
      status: "assigned",
      message: "Test assigned successfully",
      assignment
    });
  } catch (err) {
    console.error("ASSIGN ERROR:", err);
    res.status(500).json({ error: "Failed to assign test" });
  }
});
// ---------- LOGIN PAGE ----------
router.get("/login", (req, res) => {
res.send(`
 <body style="margin:0;background:#eef2ff;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;">
    <div style="
     background:white;
     padding:30px;
     border-radius:12px;
     box-shadow:0 4px 12px rgba(0,0,0,0.1);
     width:320px;
   ">
     <h2 style="text-align:center;margin-bottom:20px;">Login</h2>
     <input id="email" placeholder="Email" style="
       width:100%;
       padding:10px;
       margin-bottom:10px;
       border-radius:6px;
       border:1px solid #ccc;
     "/>
     <input id="password" type="password" placeholder="Password" style="
       width:100%;
       padding:10px;
       margin-bottom:20px;
       border-radius:6px;
       border:1px solid #ccc;
     "/>
     <button onclick="login()" style="
       width:100%;
       padding:10px;
       background:#4f46e5;
       color:white;
       border:none;
       border-radius:6px;
       cursor:pointer;
       font-weight:600;
     ">
       Login
     </button>
   </div>
   <script>
// ✅ RESET SESSION ON LOGIN PAGE LOAD
localStorage.clear();
// 🔁 FORCE RELOAD IF FROM BACK/FORWARD CACHE
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
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
           alert(data.error);
           return;
         }
         localStorage.setItem("user", JSON.stringify(data.user));
         localStorage.setItem("token", data.token); 
         // 🔁 REDIRECT BASED ON ROLE
       if(data.user.role === "teacher"){
  window.location.replace("/teacher");
} else {
  window.location.replace("/my-tests");
}
       });
     }
   </script>
 </body>
`);
});
// ---------- STUDENT LOGIN PAGE ----------
router.get("/student-login", (req, res) => {
res.send(`
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
     padding:30px;
     border-radius:12px;
     box-shadow:0 4px 12px rgba(0,0,0,0.1);
     width:320px;
   ">
     <h2 style="text-align:center;margin-bottom:20px;">
       Student Login
     </h2>
     <input id="class" placeholder="Class (e.g. C1)" style="
       width:100%;
       padding:10px;
       margin-bottom:10px;
       border-radius:6px;
       border:1px solid #ccc;
     "/>
     <input id="studentId" placeholder="Student ID" style="
       width:100%;
       padding:10px;
       margin-bottom:10px;
       border-radius:6px;
       border:1px solid #ccc;
     "/>
     <input id="name" placeholder="Name" style="
       width:100%;
       padding:10px;
       margin-bottom:20px;
       border-radius:6px;
       border:1px solid #ccc;
     "/>
     <button onclick="loginStudent()" style="
       width:100%;
       padding:10px;
       background:#4f46e5;
       color:white;
       border:none;
       border-radius:6px;
       cursor:pointer;
       font-weight:600;
     ">
       Login
     </button>
   </div>
   <script>
function loginStudent(){
localStorage.clear();
const studentClass = document.getElementById("class").value.trim().toUpperCase();
const studentId = document.getElementById("studentId").value.trim();
const name = document.getElementById("name").value.trim();
if(!studentClass || !studentId || !name){
 alert("Please fill all fields");
 return;
}
fetch("/student-login", {
 method:"POST",
 headers:{ "Content-Type":"application/json" },
 body: JSON.stringify({
   studentId,
   name,
   class: studentClass
 })
})
.then(res => res.json())
.then(data => {
 if(data.error){
   alert(data.error);
   return;
 }
 // ✅ STORE USER
localStorage.setItem("student", JSON.stringify(data.user));
 // ✅ STORE CLASS (CRITICAL FOR FILTERING)
 localStorage.setItem("class", data.user.class);
 // 🔁 REDIRECT
 window.location.replace("/my-tests");
});
}
   </script>
 </body>
`);
});
// ---------- STUDENT LOGIN API ----------
router.post("/student-login", async (req, res) => {
try {
 const { studentId, name, class: studentClass } = req.body;
 if (!studentId || !name || !studentClass) {
  return res.status(400).json({ error: "Missing fields" });
}
 const Student = require("../models/Student");
 const student = await Student.findOne({
   studentId,
   name,
   class: studentClass
 });
 if(!student){
   return res.json({ error: "Invalid credentials" });
 }
res.json({
  status: "ok",
  user: {
    studentId: student.studentId,
    name: student.name,
    class: student.class,
    teacherId: student.teacherId,
    role: "student"
  }
});
} catch (err) {
 console.error(err);
 res.status(500).json({ error: "Login failed" });
}
});
// ---------- STUDENT TEST LIST ----------
router.get("/my-tests", async (req, res) => {
res.send(`
<body style="margin:0;font-family:Arial;">
<div style="display:flex;height:100vh;">
   <!-- SIDEBAR -->
  <div style="
    width:220px;
    background:#1e293b;
    color:white;
    padding:20px;
    box-sizing:border-box;
  ">
    <h2 style="margin-bottom:30px;">Student</h2>
    <div onclick="go('/my-tests')" style="margin-bottom:15px;cursor:pointer;font-weight:600;">
      My Tests
    </div>
    <div style="margin-top:20px;">Dashboard</div>
    <div onclick="logout()" style="margin-top:20px;color:#f87171;cursor:pointer;">
      Logout
    </div>
  </div>
  <!-- CONTENT -->
  <div style="
    flex:1;
    padding:30px;
    background:#eef2ff;
    overflow:auto;
  ">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
  <button onclick="goBack()" style="
    padding:8px 12px;
    background:#f59e0b;
    color:white;
    border:none;
    border-radius:6px;
    cursor:pointer;
    font-weight:600;
  ">
    ← Previous Page
  </button>
  <h1 style="margin:0;">My Tests</h1>
</div>
<select id="subjectSelect" style="padding:10px;margin-bottom:20px;width:100%;">
  <option value="">Select Subject</option>
</select>
<button onclick="deleteSelected()" style="
  margin-bottom:15px;
  padding:10px 16px;
  background:#dc3545;
  color:white;
  border:none;
  border-radius:8px;
  cursor:pointer;
  font-weight:600;
">
  Delete Selected
</button>
<div id="testList"></div>
  </div>
</div>
<script>
function go(path){
  window.location.replace(path);
}
const student = JSON.parse(localStorage.getItem("student") || "null");
// AUTH CHECK
if (
  !student ||
  !student.studentId ||
  !student.class ||
  !student.teacherId
) {
  window.location.replace("/student-entry");
}
// GLOBAL FUNCTIONS
window.logout = function(){
  localStorage.clear();
  window.location.replace("/");
};
window.startTest = function(id){
  const student = JSON.parse(localStorage.getItem("student"));
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  window.location.href = "/test?id=" + id + "&studentId=" + student.studentId;
};
window.goBack = function(){
  window.location.replace("/student-entry");
};
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
// MAIN LOGIC
window.onload = function(){
  const subjectSelect = document.getElementById("subjectSelect");
  const testList = document.getElementById("testList");
  // LOAD SUBJECTS
  fetch("/get-subjects?className=" + student.class + "&teacherId=" + student.teacherId)
    .then(res => res.json())
    .then(subjects => {
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      subjects.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
      });
    });
  // SUBJECT CHANGE → LOAD TESTS
  subjectSelect.addEventListener("change", function(){
    const subject = this.value;
    if (!subject) return;
    fetch("/get-tests?className=" + student.class +
      "&subject=" + subject +
      "&studentId=" + student.studentId +
      "&teacherId=" + student.teacherId
    )
      .then(res => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(tests => {
        console.log("TESTS:", tests);
        testList.innerHTML = "";
        if (!tests.length) {
          testList.innerHTML = "<p>No tests available</p>";
          return;
        }
        tests.forEach(t => {
          const card = document.createElement("div");
          card.style.background = "white";
          card.style.padding = "20px";
          card.style.margin = "10px 0";
          card.style.borderRadius = "8px";
          const title = document.createElement("strong");
          title.innerText = t.name;
          const br = document.createElement("br");
          const btn = document.createElement("button");
          btn.innerText = "Start";
          btn.onclick = function() {
            startTest(t._id);
          };
          card.appendChild(title);
          card.appendChild(br);
          card.appendChild(btn);
          testList.appendChild(card);
        });
      })
      .catch(err => {
        console.error("TEST LOAD ERROR:", err);
        testList.innerHTML =
          "<p style='color:red;'>Failed to load tests</p>";
      });
  });
};
</script>
</body>
`);
});
// ---------- STUDENT ENTRY PAGE ----------
router.get("/student-entry", (req, res) => {
  res.send(`
  <body style="font-family:Arial;background:#eef2ff;padding:40px;">
    <div style="max-width:400px;margin:auto;background:white;padding:30px;border-radius:12px;">
<h2 style="margin-bottom:20px;">Select Your Details</h2>
      <select id="classSelect" style="width:100%;padding:10px;margin-bottom:15px;">
        <option value="">Select Class</option>
      </select>
      <select id="studentSelect" style="width:100%;padding:10px;margin-bottom:15px;">
        <option value="">Select Student ID</option>
      </select>
      <div id="nameDisplay" style="margin-bottom:20px;font-weight:bold;"></div>
      <button onclick="confirmStudent()" style="
        width:100%;
        padding:12px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
      ">
        Confirm
      </button>
    </div>
<script>
// ✅ Reset any previous session when entry page opens
localStorage.clear();
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};
// 🔁 FORCE RELOAD IF COMING FROM BACK/FORWARD CACHE
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
window.onload = function(){
  let selectedStudent = null;
  // LOAD CLASSES
  fetch("/get-classes")
    .then(res => res.json())
    .then(classes => {
      const select = document.getElementById("classSelect");
      classes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
      });
    });
  // ON CLASS CHANGE
  document.getElementById("classSelect").addEventListener("change", function(){
    const className = this.value;
    const studentSelect = document.getElementById("studentSelect");
    studentSelect.innerHTML = '<option value="">Select Student ID</option>';
    document.getElementById("nameDisplay").innerText = "";
    if(!className) return;
    fetch("/get-students?className=" + className)
      .then(res => res.json())
      .then(students => {
students.forEach(s => {
  const opt = document.createElement("option");
  opt.value = s.studentId;
  opt.textContent = s.studentId;
  opt.dataset.name = s.name;
  opt.dataset.teacherId = s.teacherId;
  studentSelect.appendChild(opt);
});
      });
  });
  // ON STUDENT SELECT
  document.getElementById("studentSelect").addEventListener("change", function(){
    if(!this.value) return;
const selectedOption = this.options[this.selectedIndex];
selectedStudent = {
  studentId: selectedOption.value,
  name: selectedOption.dataset.name,
  teacherId: selectedOption.dataset.teacherId
};
document.getElementById("nameDisplay").innerText =
  "Name: " + (selectedStudent.name || "Unknown");
  });
  // CONFIRM
  window.confirmStudent = function(){
    const className = document.getElementById("classSelect").value;
    if(!className || !selectedStudent){
      alert("Please select all fields");
      return;
    }
const student = {
  ...selectedStudent,
  class: className,
  teacherId: selectedStudent.teacherId
};
    localStorage.setItem("student", JSON.stringify(student));
    localStorage.setItem("class", className);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.replace("/my-tests");
  };
};
</script>
  </body>
  `);
});
// ---------- GET SUBJECTS FOR CLASS ----------
router.get("/get-subjects", async (req, res) => {
  try {
    const className = String(req.query.className || "").trim().toUpperCase();
    const teacherId = String(req.query.teacherId || "").trim();
if (!teacherId) {
  return res.status(400).json({ error: "Missing teacherId" });
}
    if (!className) {
      return res.status(400).json({ error: "Class required" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const subjects = await ClassSubject.find({ className, teacherId });
    const uniqueSubjects = [...new Set(subjects.map(s => s.subject))];
    res.json(uniqueSubjects);
  } catch (err) {
    console.error("GET SUBJECTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
// ---------- ADD SUBJECT ----------
router.post("/add-subject", async (req, res) => {
  try {
    const { className, subject } = req.body;
    const teacherId = String(req.body.teacherId || "").trim();
    if (!className || !subject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const classNameClean = String(className || "").trim().toUpperCase();
    const subjectClean =
      String(subject || "").trim().charAt(0).toUpperCase() +
      String(subject || "").trim().slice(1).toLowerCase();
    const exists = await ClassSubject.findOne({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    if (exists) {
      return res.json({ message: "Subject already exists" });
    }
    const newSubject = await ClassSubject.create({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    res.json({ status: "created", subject: newSubject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});
// ---------- GET TESTS FOR STUDENT ----------
router.get("/get-tests", async (req, res) => {
  try {
    const className = String(req.query.className || "").trim().toUpperCase();
    const subject = String(req.query.subject || "").trim();
    const teacherId = String(req.query.teacherId || "").trim();
if (!teacherId) {
  return res.status(400).json({ error: "Missing teacherId" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Missing params" });
    }
    const Assignment = require("../models/Assignment");
    const Test = require("../models/Test");
    // 1. Get assignments for class
    const assignments = await Assignment.find({ className, teacherId });
    // 2. Fetch tests
    const tests = await Promise.all(
      assignments.map(a => Test.findById(a.testId))
    );
const validTests = tests.filter(Boolean);
// 🔒 GET STUDENT ID
const studentId = String(req.query.studentId || "").trim();
if (!studentId) {
  return res.status(400).json({ error: "Missing studentId" });
}
const Result = require("../models/Result");
// 🔒 GET ATTEMPTED TESTS
const attempted = await Result.find({ studentId }).select("testId");
const attemptedIds = attempted.map(r => String(r.testId));
// 3. Filter by subject + remove attempted
const filtered = validTests.filter(t =>
  String(t.subject || "").trim().toLowerCase() ===
    String(subject || "").trim().toLowerCase()
  &&
  !attemptedIds.includes(String(t._id))
);
res.json(filtered);
  } catch (err) {
    console.error("GET TESTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});
module.exports = router;