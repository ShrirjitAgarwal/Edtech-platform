const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Result = require("../models/Result");
const ClassSubject = require("../models/ClassSubject");
const Test = require("../models/Test");
const { readJSON } = require("../utils/file");
const sidebar = require("../views/sidebar");
const layout = require("../views/layout");
// ======================================================
// HELPERS
// ======================================================
function pageReloadScript() {
  return `
<script>
window.onbeforeunload = function () {
  window.scrollTo(0, 0);
};
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
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
// ======================================================
// STUDENT DETAIL PAGE
// ======================================================
router.get("/student", async (req, res) => {
  try {
    const studentId = String(req.query.studentId || "").trim();
    if (!studentId) {
      return res.send("<h2>Missing student ID</h2>");
    }
    let results = await Result.find({ studentId });
    if (!results.length) {
      return res.send("<h2>No results found for this student</h2>");
    }
    results = results.reverse();
    const student = results[0];
    const resultsHTML = results.map(r => {
      const percent = r.total
        ? Math.round((r.score / r.total) * 100)
        : 0;
      const date = r.date
        ? new Date(r.date).toLocaleString()
        : "N/A";
      const color =
        percent >= 70
          ? "#16a34a"
          : percent >= 40
          ? "#ca8a04"
          : "#dc2626";
      return `
<div onclick="viewResult('${r.testId}')" style="
background:white;
padding:20px;
margin:15px 0;
border-radius:12px;
cursor:pointer;
">
  <div style="display:flex;justify-content:space-between;">
    <div style="font-weight:600;">
      ${r.testName || "Unnamed Test"}
    </div>
    <div style="font-weight:600;color:${color};">
      ${percent}%
    </div>
  </div>
  <div style="margin-top:10px;">
    Score: <b>${r.score}/${r.total}</b>
  </div>
  <div style="font-size:12px;color:#666;margin-top:6px;">
    ${date}
  </div>
</div>
`;
    }).join("");
    res.send(`
<body style="font-family:Arial;background:#eef2ff;padding:20px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
  <h1>Student Details</h1>
  <button onclick="downloadReport()" style="
    padding:10px 16px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
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
  go("/result?testId=" + testId + "&studentId=" + studentId);
}
function downloadReport(){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  fetch("/download-report", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ studentId })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  })
  .catch(() => alert("Download failed"));
}
</script>
${pageReloadScript()}
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading student");
  }
});
// ======================================================
// STUDENT ENTRY
// ======================================================
router.get("/student-entry", (req, res) => {
  res.send(`
<body style="font-family:Arial;background:#eef2ff;padding:40px;">
<div style="
max-width:400px;
margin:auto;
background:white;
padding:30px;
border-radius:12px;
">
<h2>Select Your Details</h2>
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
localStorage.clear();
let selectedStudent = null;
window.onload = function(){
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
document.getElementById("classSelect").addEventListener("change", function(){
  const className = this.value;
  const studentSelect = document.getElementById("studentSelect");
  studentSelect.innerHTML =
    '<option value="">Select Student ID</option>';
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
document.getElementById("studentSelect").addEventListener("change", function(){
  const selected = this.options[this.selectedIndex];
  selectedStudent = {
    studentId: selected.value,
    name: selected.dataset.name,
    teacherId: selected.dataset.teacherId
  };
  document.getElementById("nameDisplay").innerText =
    "Name: " + selectedStudent.name;
});
};
function confirmStudent(){
  const className =
    document.getElementById("classSelect").value;
  if(!className || !selectedStudent){
    alert("Please select all fields");
    return;
  }
  localStorage.setItem("student", JSON.stringify({
    ...selectedStudent,
    class: className
  }));
  localStorage.setItem("class", className);
  go("/my-tests");
}
</script>
${pageReloadScript()}
</body>
`);
});
// ======================================================
// MY TESTS
// ======================================================
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
// ======================================================
// API ROUTES
// ======================================================
router.get("/get-subjects", async (req, res) => {
  try {
    const className =
      String(req.query.className || "").trim().toUpperCase();
    const teacherId =
      String(req.query.teacherId || "").trim();
    if (!className || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const rows = await ClassSubject.find({
      className,
      teacherId
    });
    const subjects = [...new Set(rows.map(r => r.subject))];
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});
router.get("/get-classes", async (req, res) => {
  try {
    const teacherId =
      String(req.query.teacherId || "").trim();
    let classes;
    if (teacherId) {
      classes = await Student.find({ teacherId }).distinct("class");
    } else {
      classes = await Student.distinct("class");
    }
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});
router.get("/get-students", async (req, res) => {
  try {
    const className =
      String(req.query.className || "").trim();
    if (!className) {
      return res.status(400).json({ error: "Class required" });
    }
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
// ======================================================
// LOGIN
// ======================================================
router.get("/student-login", (req, res) => {
  res.redirect("/student-entry");
});
router.post("/student-login", async (req, res) => {
  try {
    const { studentId, name, class: studentClass } = req.body;
    const student = await Student.findOne({
      studentId,
      name,
      class: studentClass
    });
    if (!student) {
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
// ======================================================
// TEST PAGE
// ======================================================
router.get("/test", async (req, res) => {
  try {
    const id = req.query.id;
    const studentId = req.query.studentId;
    if (!id || !studentId) {
      return res.redirect("/student-entry");
    }
    const alreadyAttempted = await Result.findOne({
      studentId,
      testId: id
    });
    if (alreadyAttempted) {
      return res.redirect("/my-tests");
    }
    const test = await Test.findById(id);
    if (!test) {
      return res.send("<h1>Test not found</h1>");
    }
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
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
    if (!window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Back button");
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Tab switch");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Exited fullscreen");
    }
  });
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
    const s = document.querySelector(
      'input[name="q' + q.id + '"]:checked'
    );
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
module.exports = router;