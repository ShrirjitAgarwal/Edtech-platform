const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Student = require("../models/Student");
const Result = require("../models/Result");
const ClassSubject = require("../models/ClassSubject");
const Test = require("../models/Test");
const School = require("../models/School");
const { readJSON } = require("../utils/file");
const sidebar = require("../views/sidebar");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
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
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.href = "/";
  });
}
</script>
`;
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
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
    let results = await Result.find({ studentId })
  .select("studentId name class testId testName score total date")
  .sort({ date: -1 })
  .limit(100)
  .lean();
    if (!results.length) {
      return res.send("<h2>No results found for this student</h2>");
    }
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
    "Content-Type":"application/json"
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
max-width:460px;
margin:auto;
background:white;
padding:30px;
border-radius:12px;
">
<h2>Student Login</h2>
<div id="lookupForm">
  <input
    id="firstName"
    placeholder="First Name"
    style="width:100%;padding:10px;margin-bottom:15px;box-sizing:border-box;"
  />
  <input
    id="lastName"
    placeholder="Last Name"
    style="width:100%;padding:10px;margin-bottom:15px;box-sizing:border-box;"
  />
  <input
    id="studentId"
    placeholder="Student ID"
    style="width:100%;padding:10px;margin-bottom:15px;box-sizing:border-box;"
  />
  <button onclick="lookupStudent()" style="
    width:100%;
    padding:12px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Find My Record
  </button>
</div>
<div
  id="errorBox"
  style="
    display:none;
    margin-top:16px;
    color:#dc2626;
    font-weight:700;
  "
></div>
<div
  id="confirmBox"
  style="
    display:none;
    margin-top:20px;
    background:#f8fafc;
    padding:18px;
    border-radius:12px;
    border:1px solid #e5e7eb;
  "
></div>
</div>
<script>
localStorage.clear();
let matchedStudent = null;
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
function showError(message){
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "block";
  errorBox.innerText = message;
}
function clearError(){
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "none";
  errorBox.innerText = "";
}
function lookupStudent(){
  clearError();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const studentId = document.getElementById("studentId").value.trim();
  if(!firstName || !lastName || !studentId){
    showError("Please enter first name, last name, and student ID.");
    return;
  }
  fetch("/student-lookup", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      firstName,
      lastName,
      studentId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      matchedStudent = null;
      document.getElementById("confirmBox").style.display = "none";
      showError(data.error);
      return;
    }
    matchedStudent = data.student;
    document.getElementById("confirmBox").style.display = "block";
    document.getElementById("confirmBox").innerHTML =
      "<h3 style='margin-top:0;'>Confirm Your Details</h3>" +
      "<p><b>Name:</b> " + escapeHtml(matchedStudent.name) + "</p>" +
      "<p><b>Class ID:</b> " + escapeHtml(matchedStudent.class) + "</p>" +
      "<p><b>Student ID:</b> " + escapeHtml(matchedStudent.studentId) + "</p>" +
      "<p><b>School:</b> " + escapeHtml(matchedStudent.schoolName) + "</p>" +
      "<div style='display:flex;gap:10px;margin-top:18px;'>" +
        "<button onclick='confirmStudent()' style='" +
          "flex:1;" +
          "padding:12px;" +
          "background:#16a34a;" +
          "color:white;" +
          "border:none;" +
          "border-radius:8px;" +
          "cursor:pointer;" +
          "font-weight:700;" +
        "'>Confirm</button>" +
        "<button onclick='resetLookup()' style='" +
          "flex:1;" +
          "padding:12px;" +
          "background:#64748b;" +
          "color:white;" +
          "border:none;" +
          "border-radius:8px;" +
          "cursor:pointer;" +
          "font-weight:700;" +
        "'>Go Back</button>" +
      "</div>";
  })
  .catch(() => {
    showError("Lookup failed. Please try again.");
  });
}
function resetLookup(){
  matchedStudent = null;
  document.getElementById("confirmBox").style.display = "none";
  clearError();
}
function confirmStudent(){
  if(!matchedStudent){
    showError("No student record selected.");
    return;
  }
  localStorage.setItem("student", JSON.stringify(matchedStudent));
  localStorage.setItem("class", matchedStudent.class);
  go("/my-tests");
}
</script>
${pageReloadScript()}
</body>
`);
});
// ======================================================
// STUDENT LOOKUP
// ======================================================
router.post("/student-lookup", async (req, res) => {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const studentId = String(req.body.studentId || "").trim();
    if (!firstName || !lastName || !studentId) {
      return res.status(400).json({
        error: "Please enter first name, last name, and student ID."
      });
    }
    const normalize = value =>
      String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    const normalizeStudentId = value =>
      String(value || "")
        .trim()
        .replace(/\s+/g, "")
        .toLowerCase();
    const nameKey = normalize(firstName + " " + lastName);
    const studentKey = normalizeStudentId(studentId);
    const fullNameInput = normalize(firstName + " " + lastName);
    let matches = await Student.find({
      studentKey,
      nameKey,
      status: "active"
    })
      .select("studentId studentKey name firstName lastName fullName nameKey class teacherId schoolId schoolCode status")
      .limit(10)
      .lean();
    if (!matches.length) {
      matches = await Student.find({
        status: "active",
        $or: [
          { studentKey },
          { studentId },
          { studentId: studentId.toUpperCase() },
          { studentId: studentId.toLowerCase() }
        ]
      })
        .select("studentId studentKey name firstName lastName fullName nameKey class teacherId schoolId schoolCode status")
        .limit(25)
        .lean();
      matches = matches.filter(student => {
        const dbFullName = normalize(
          student.fullName ||
          student.name ||
          `${student.firstName || ""} ${student.lastName || ""}`
        );
        const dbFirstLast = normalize(
          `${student.firstName || ""} ${student.lastName || ""}`
        );
        return (
          dbFullName === fullNameInput ||
          dbFirstLast === fullNameInput
        );
      });
    }
    if (matches.length === 0) {
      return res.status(404).json({
        error: "We could not find a matching student record. Please recheck your name and student ID."
      });
    }
    if (matches.length > 1) {
      return res.status(409).json({
        error: "Multiple matching records found. Please contact your teacher or school admin."
      });
    }
    const student = matches[0];
    const updatedFields = {
      lastVerifiedAt: new Date()
    };
    if (!student.studentKey) {
      updatedFields.studentKey = studentKey;
    }
    if (!student.nameKey) {
      updatedFields.nameKey = nameKey;
    }
    await Student.updateOne(
      { _id: student._id },
      { $set: updatedFields }
    );
    const school = student.schoolId
      ? await School.findById(student.schoolId)
          .select("name")
          .lean()
      : null;
    const studentSessionToken = jwt.sign(
      {
        role: "student",
        studentRecordId: String(student._id),
        studentId: student.studentId,
        studentKey: student.studentKey || studentKey,
        class: student.class,
        teacherId: student.teacherId,
        schoolId: student.schoolId || null,
        schoolCode: student.schoolCode || null
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.cookie("studentSessionToken", studentSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000
    });
    res.json({
      status: "matched",
      student: {
        studentRecordId: String(student._id),
        studentId: student.studentId,
        studentKey: student.studentKey || studentKey,
        name: student.fullName || student.name,
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        class: student.class,
        teacherId: student.teacherId,
        schoolId: student.schoolId || null,
        schoolCode: student.schoolCode || null,
        schoolName: school?.name || "N/A",
        role: "student",
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("STUDENT LOOKUP ERROR:", err);
    res.status(500).json({
      error: "Student lookup failed"
    });
  }
});
// ======================================================
// MY TESTS
// ======================================================
// ---------- STUDENT TEST LIST ----------
router.get("/my-tests", async (req, res) => {
res.send(`
<body style="margin:0;font-family:Arial;">
<div style="display:flex;height:100vh;">
     ${sidebar("my-tests", "student")}
  <!-- CONTENT -->
  <div style="
    flex:1;
    padding:30px;
    background:#eef2ff;
    overflow:auto;
  ">
    <div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:16px;
  margin-bottom:16px;
">
  <h1 style="margin:0;">My Tests</h1>
  ${backButton("/student-entry")}
</div>
<div
  id="subjectDropdown"
  style="
    position:relative;
    width:100%;
    margin-bottom:20px;
  "
>
  <button
    id="subjectDropdownButton"
    type="button"
    onclick="toggleSubjectDropdown()"
    style="
      width:100%;
      padding:12px 14px;
      border:1px solid #cbd5e1;
      border-radius:10px;
      background:white;
      cursor:pointer;
      text-align:left;
      font-weight:700;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="selectedSubjectLabel">Select Subject</span>
    <span>▾</span>
  </button>
  <div
    id="subjectDropdownMenu"
    style="
      display:none;
      position:absolute;
      top:calc(100% + 6px);
      left:0;
      right:0;
      background:white;
      border:1px solid #cbd5e1;
      border-radius:10px;
      box-shadow:0 8px 24px rgba(15,23,42,0.16);
      max-height:220px;
      overflow-y:auto;
      z-index:50;
    "
  ></div>
  <input id="subjectSelect" type="hidden" value="">
</div>
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
  !student.studentRecordId ||
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
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  window.location.href =
    "/test?id=" +
    encodeURIComponent(id);
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
  const subjectDropdownMenu = document.getElementById("subjectDropdownMenu");
  const selectedSubjectLabel = document.getElementById("selectedSubjectLabel");
  function loadTestsForSubject(subject){
    if (!subject) {
      testList.innerHTML = "";
      return;
    }
    fetch(
      "/get-tests?subject=" +
      encodeURIComponent(subject)
    )
      .then(res => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(tests => {
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
  }
  window.toggleSubjectDropdown = function(){
    subjectDropdownMenu.style.display =
      subjectDropdownMenu.style.display === "block"
        ? "none"
        : "block";
  };
  window.selectSubjectOption = function(subject){
    subjectSelect.value = subject;
    selectedSubjectLabel.innerText = subject || "Select Subject";
    subjectDropdownMenu.style.display = "none";
    loadTestsForSubject(subject);
  };
  document.addEventListener("click", function(event){
    const dropdown = document.getElementById("subjectDropdown");
    if (
      dropdown &&
      !dropdown.contains(event.target)
    ) {
      subjectDropdownMenu.style.display = "none";
    }
  });
  fetch("/get-subjects")
    .then(res => res.json())
    .then(subjects => {
      subjectDropdownMenu.innerHTML = "";
      if (!subjects.length) {
        subjectDropdownMenu.innerHTML =
          "<div style='padding:12px;color:#64748b;'>No subjects found</div>";
        return;
      }
      subjects.forEach(sub => {
        const option = document.createElement("button");
        option.type = "button";
        option.innerText = sub;
        option.onclick = function(){
          selectSubjectOption(sub);
        };
        option.style.width = "100%";
        option.style.padding = "12px 14px";
        option.style.border = "none";
        option.style.background = "white";
        option.style.textAlign = "left";
        option.style.cursor = "pointer";
        option.style.fontWeight = "700";
        option.style.boxSizing = "border-box";
        option.onmouseenter = function(){
          option.style.background = "#eef2ff";
        };
        option.onmouseleave = function(){
          option.style.background = "white";
        };
        subjectDropdownMenu.appendChild(option);
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
    const studentToken = req.cookies && req.cookies.studentSessionToken;
    if (!studentToken) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(
        studentToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      return res.status(401).json({
        error: "Invalid student session"
      });
    }
    const student = await Student.findOne({
      _id: decodedStudent.studentRecordId,
      studentId: decodedStudent.studentId,
      status: "active"
    })
      .select("studentId class teacherId schoolId schoolCode status")
      .lean();
    if (!student) {
      return res.status(401).json({
        error: "Invalid student session"
      });
    }
    const className = String(student.class || "").trim().toUpperCase();
    const teacherId = String(student.teacherId || "").trim();
    const schoolCode = String(student.schoolCode || "").trim();
    if (!className || !teacherId || !schoolCode) {
      return res.status(400).json({
        error: "Student is missing class, teacher, or school data"
      });
    }
    const rows = await ClassSubject.find({
      className,
      teacherId,
      schoolCode
    })
      .select("subject")
      .lean();
    const subjects = [...new Set(
      rows
        .map(row => row.subject)
        .filter(Boolean)
    )];
    res.json(subjects);
  } catch (err) {
    console.error("GET STUDENT SUBJECTS ERROR:", err);
    res.status(500).json({
      error: "Failed to fetch subjects"
    });
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
)
  .sort({ name: 1 })
  .limit(1000)
  .lean();
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
    const { studentId, name, class: studentClass, schoolCode } = req.body;
    const student = await Student.findOne({
      studentId,
      name,
      class: studentClass,
      schoolCode
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
        schoolId: student.schoolId,
        schoolCode: student.schoolCode,
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
    const studentToken = req.cookies && req.cookies.studentSessionToken;
    if (!id || !studentToken) {
      return res.redirect("/student-entry");
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(
        studentToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      return res.redirect("/student-entry");
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      return res.redirect("/student-entry");
    }
    const studentId = decodedStudent.studentId;
    const studentRecordId = decodedStudent.studentRecordId;
    const student = await Student.findOne({
      _id: studentRecordId,
      studentId,
      status: "active"
    })
      .select("studentId studentKey schoolId schoolCode teacherId class status")
      .lean();
    if (!student) {
      return res.redirect("/student-entry");
    }
    if (
      decodedStudent.schoolId &&
      student.schoolId &&
      String(decodedStudent.schoolId) !== String(student.schoolId)
    ) {
      return res.redirect("/student-entry");
    }
const alreadyAttempted = await Result.findOne({
  studentId,
  testId: id,
  ...(student.schoolId ? { schoolId: student.schoolId } : {})
})
  .select("_id")
  .lean();
    if (alreadyAttempted) {
      return res.redirect("/my-tests");
    }
    const test = await Test.findById(id).lean();
    if (!test || test.status !== "published") {
      return res.send("<h1>Test not available</h1>");
    }
    if (
      student.schoolId &&
      test.schoolId &&
      String(student.schoolId) !== String(test.schoolId)
    ) {
      return res.send("<h1>Test not available</h1>");
    }
    if (test.scheduledAt && new Date(test.scheduledAt) > new Date()) {
      return res.send("<h1>Test not available yet</h1>");
    }
    const Question = require("../models/Question");
    const questionIds = test.questionIds.map(qid => String(qid));
    const mongoQuestions = await Question.find({
      _id: { $in: questionIds },
      $or: [
        { scope: "public" },
        ...(test.schoolId ? [{ schoolId: test.schoolId }] : [])
      ]
    }).lean();
    const questionMap = {};
    mongoQuestions.forEach(q => {
      questionMap[String(q._id)] = q;
    });
    const testQuestions = questionIds
      .map(qid => questionMap[String(qid)])
      .filter(Boolean);
    const html = testQuestions.map((q, i) => {
      const qid = String(q._id);
      if (q.type === "mcq" && q.options && q.options.length) {
return `
<div
  class="test-question-card"
  data-question-index="${i}"
  data-question-id="${qid}"
  style="background:white;padding:20px;margin:15px 0;border-radius:12px;"
>
  <p><b>Q${i + 1}: ${q.question}</b></p>
  ${q.options.map(o => `
    <label>
      ${(q.correctAnswers && q.correctAnswers.length > 1)
        ? `<input type="checkbox" name="q${qid}" value="${o}"> ${o}`
        : `<input type="radio" name="q${qid}" value="${o}"> ${o}`
      }
    </label><br>
  `).join("")}
</div>
`;
      }
return `
<div
  class="test-question-card"
  data-question-index="${i}"
  data-question-id="${qid}"
  style="background:white;padding:20px;margin:15px 0;border-radius:12px;"
>
  <p><b>Q${i + 1}: ${q.question}</b></p>
  <div style="
    background:#020617;
    border-radius:12px;
    overflow:hidden;
    border:1px solid #1e293b;
  ">
    <div style="
      height:42px;
      background:#0f172a;
      border-bottom:1px solid #1e293b;
      display:flex;
      align-items:center;
      padding:0 14px;
      color:#94a3b8;
      font-size:13px;
      font-family:Arial;
      justify-content:space-between;
    ">
      <div>
        coding-answer-${i + 1}.txt
      </div>
      <div style="
        display:flex;
        gap:12px;
        align-items:center;
      ">
        <button
        id="run-${qid}"
      onclick="runCode('${qid}')"
          style="
            padding:6px 12px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:6px;
            cursor:pointer;
            font-size:12px;
            font-weight:700;
          "
        >
          Run Code
        </button>
        <span
          class="language-badge"
          data-question-id="${qid}"
          style="
            background:#1e293b;
            color:#e2e8f0;
            border:1px solid #334155;
            border-radius:6px;
            padding:5px 9px;
            font-size:12px;
            font-weight:700;
            line-height:1;
            display:inline-flex;
            align-items:center;
            min-height:24px;
            box-sizing:border-box;
          "
        >
          ${(q.codingMeta?.language === "python") ? "Python" : "JavaScript"}
        </span>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#ef4444;
        "></div>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#f59e0b;
        "></div>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#22c55e;
        "></div>
      </div>
    </div>
    <div style="
      display:flex;
      min-height:360px;
      background:#020617;
    ">
      <div
        id="cm-${qid}"
        class="cm-editor-host"
        data-question-id="${qid}"
        style="
          display:none;
          flex:1;
          width:100%;
          min-height:360px;
          height:360px;
        "
      ></div>
      <textarea
        id="code-${qid}"
        class="code-editor"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        data-question-id="${qid}"
        data-line-numbers="line-numbers-${qid}"
        style="
          flex:1;
          min-height:360px;
          height:360px;
          font-family:Consolas, Monaco, 'Courier New', monospace;
          font-size:14px;
          background:#020617;
          color:#e2e8f0;
          padding:14px;
          border:none;
          outline:none;
          resize:vertical;
          box-sizing:border-box;
          line-height:1.6;
          tab-size:2;
          white-space:pre;
          display:block;
          overflow:auto;
        "
        placeholder="Write your code here..."
      >${q.codingMeta?.starterCode || ""}</textarea>
    </div>
    <div
      id="output-${qid}"
      style="
        background:#0f172a;
        border-top:1px solid #1e293b;
        padding:14px;
        color:#e2e8f0;
        font-family:Consolas, Monaco, monospace;
        font-size:13px;
        min-height:110px;
        white-space:pre-wrap;
      "
    >Run code to see output...</div>
  </div>
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
    <p style="color:#64748b;">
      Duration: ${test.durationMinutes || 60} minutes
    </p>
    <p style="color:#64748b;">
      Type: ${test.testType || "practice"}
    </p>
    <div
      id="questionTimerPanel"
      style="
        display:none;
        background:white;
        padding:16px 20px;
        border-radius:12px;
        margin:16px 0;
        border:1px solid #e5e7eb;
      "
    >
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <b id="questionProgressText">Question 1 of ${testQuestions.length}</b>
          <div id="questionTimerNote" style="font-size:13px;color:#64748b;margin-top:4px;">
            Answer the question before the timer ends.
          </div>
        </div>
        <div
          id="questionTimerText"
          style="
            font-size:22px;
            font-weight:800;
            color:#dc2626;
          "
        >
          00:00
        </div>
      </div>
    </div>
    ${html}
    <button
      id="nextQuestionBtn"
      onclick="goToNextQuestion('answered')"
      style="
        display:none;
        padding:10px 14px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        font-weight:700;
        margin-right:10px;
      "
    >
      Next Question
    </button>
    <button id="submitBtn" onclick="submitTest()">Submit</button>
  </div>
</div>
<script>
const qs = ${JSON.stringify(testQuestions)};
window.__testQuestions = qs;
const questionTimersEnabled = ${test.questionTimersEnabled ? "true" : "false"};
const testId = "${test._id}";
window.__testId = testId;
const testName = "${test.name}";
const studentId = "${studentId}";
window.codeMirrorEditors = window.codeMirrorEditors || {};
window.getCodeAnswer = function(qid){
  const editor = window.codeMirrorEditors?.[qid];
  if(editor){
    return editor.state.doc.toString();
  }
  const textarea = document.getElementById("code-" + qid);
  return textarea ? textarea.value : "";
};
window.runCode = async function(qid){
  const q = (window.__testQuestions || []).find(item =>
    String(item._id) === String(qid)
  );
  if(!q){
    return;
  }
  const outputBox = document.getElementById("output-" + qid);
  if(!outputBox){
    return;
  }
    const runBtn = document.getElementById("run-" + qid);
  if(runBtn){
    runBtn.disabled = true;
    runBtn.innerText = "Running...";
    runBtn.style.opacity = "0.7";
    runBtn.style.cursor = "not-allowed";
  }
    outputBox.textContent = "Running code...";
  const code = window.getCodeAnswer(qid);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);
  try {
    const res = await fetch("/run-code", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        code,
        language: q.codingMeta?.language || "javascript",
        functionName: q.codingMeta?.functionName || "",
        testCases: q.testCases || []
      })
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if(data.error){
      outputBox.textContent = "Error:\\n\\n" + data.error;
    } else {
      outputBox.textContent = data.output || "No output";
    }
  } catch(err){
    clearTimeout(timeoutId);
    if(err.name === "AbortError"){
      outputBox.textContent =
        "Execution timed out. Check for infinite loops or server /run-code issue.";
    } else {
      outputBox.textContent = "Execution failed";
    }
  }
  if(runBtn){
    runBtn.disabled = false;
    runBtn.innerText = "Run Code";
    runBtn.style.opacity = "1";
    runBtn.style.cursor = "pointer";
  }
};
document.addEventListener("keydown", function(e){
  if(!e.target.classList.contains("code-editor")) return;
  const textarea = e.target;
  if(e.key === "Tab"){
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const indent = "  ";
    textarea.value =
      value.substring(0, start) +
      indent +
      value.substring(end);
    textarea.selectionStart = textarea.selectionEnd =
      start + indent.length;
  }
if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
  e.preventDefault();
  const questionId = textarea.dataset.questionId;
  const storageKey = "code_answer_${test._id}_" + questionId;
  localStorage.setItem(storageKey, textarea.value);
  return;
}
  if(e.key === "Enter"){
    e.preventDefault();
    const start = textarea.selectionStart;
    const value = textarea.value;
    const beforeCursor = value.substring(0, start);
    const currentLine = beforeCursor.split("\\n").pop();
    const indentMatch = currentLine.match(/^(\s+)/);
    const currentIndent = indentMatch ? indentMatch[1] : "";
    const extraIndent =
      currentLine.trim().endsWith("{") ||
      currentLine.trim().endsWith(":")
        ? "  "
        : "";
    const insertText =
      "\\n" + currentIndent + extraIndent;
    textarea.value =
      value.substring(0, start) +
      insertText +
      value.substring(textarea.selectionEnd);
    const newPos = start + insertText.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
  }
});
document.querySelectorAll(".code-editor").forEach(editor => {
  const questionId = editor.dataset.questionId;
  const storageKey = "code_answer_" + testId + "_" + questionId;
  const saved = localStorage.getItem(storageKey);
  if(saved !== null){
    editor.value = saved;
  }
  editor.addEventListener("input", function(){
    localStorage.setItem(storageKey, editor.value);
    updateQuestionCompletion(questionId);
  });
});
let currentQuestionIndex = 0;
let questionTimerInterval = null;
let questionTimeRemaining = 0;
let timedOutQuestions = {};
function getQuestionDurationSeconds(q){
  const difficulty = String(q.difficulty || "medium").toLowerCase();
  if(difficulty === "easy"){
    return 2 * 60;
  }
  if(difficulty === "hard"){
    return 10 * 60;
  }
  return 5 * 60;
}
function formatQuestionTime(seconds){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}
function isQuestionAnswered(qid){
  const q = qs.find(item => String(item._id) === String(qid));
  if(!q){
    return false;
  }
  if(q.type === "coding"){
    return String(window.getCodeAnswer(qid) || "").trim().length > 0;
  }
  const checked = document.querySelectorAll('input[name="q' + qid + '"]:checked');
  return checked.length > 0;
}
function updateQuestionCompletion(qid){
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(!currentQuestion || String(currentQuestion._id) !== String(qid)){
    return;
  }
  const nextBtn = document.getElementById("nextQuestionBtn");
  if(!nextBtn){
    return;
  }
  nextBtn.style.display = isQuestionAnswered(qid) ? "inline-block" : "none";
}
function showCurrentQuestion(){
  const cards = document.querySelectorAll(".test-question-card");
  const timerPanel = document.getElementById("questionTimerPanel");
  const nextBtn = document.getElementById("nextQuestionBtn");
  const submitBtn = document.getElementById("submitBtn");
  cards.forEach(card => {
    card.style.display = "none";
  });
  const currentCard = cards[currentQuestionIndex];
  if(currentCard){
    currentCard.style.display = "block";
  }
  if(timerPanel){
    timerPanel.style.display = "block";
  }
  if(nextBtn){
    nextBtn.style.display = "none";
  }
  if(submitBtn){
    submitBtn.style.display = "none";
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(!currentQuestion){
    if(submitBtn){
      submitBtn.style.display = "inline-block";
    }
    return;
  }
  const progressText = document.getElementById("questionProgressText");
  if(progressText){
    progressText.innerText =
      "Question " + (currentQuestionIndex + 1) + " of " + qs.length;
  }
  if(window.codeMirrorEditors){
    const editor = window.codeMirrorEditors[String(currentQuestion._id)];
    if(editor && typeof editor.requestMeasure === "function"){
      setTimeout(() => editor.requestMeasure(), 50);
    }
  }
  updateQuestionCompletion(String(currentQuestion._id));
  startQuestionTimer(currentQuestion);
}
function startQuestionTimer(q){
  clearInterval(questionTimerInterval);
  questionTimeRemaining = getQuestionDurationSeconds(q);
  const timerText = document.getElementById("questionTimerText");
  if(timerText){
    timerText.innerText = formatQuestionTime(questionTimeRemaining);
  }
  questionTimerInterval = setInterval(() => {
    questionTimeRemaining--;
    if(timerText){
      timerText.innerText = formatQuestionTime(Math.max(questionTimeRemaining, 0));
    }
    if(questionTimeRemaining <= 0){
      clearInterval(questionTimerInterval);
      timedOutQuestions[String(q._id)] = true;
      goToNextQuestion("timer");
    }
  }, 1000);
}
function goToNextQuestion(reason){
  if(!questionTimersEnabled){
    return;
  }
  clearInterval(questionTimerInterval);
  currentQuestionIndex++;
  if(currentQuestionIndex >= qs.length){
    const timerPanel = document.getElementById("questionTimerPanel");
    const nextBtn = document.getElementById("nextQuestionBtn");
    const submitBtn = document.getElementById("submitBtn");
    document.querySelectorAll(".test-question-card").forEach(card => {
      card.style.display = "block";
    });
    if(timerPanel){
      timerPanel.style.display = "none";
    }
    if(nextBtn){
      nextBtn.style.display = "none";
    }
    if(submitBtn){
      submitBtn.style.display = "inline-block";
    }
    return;
  }
  showCurrentQuestion();
}
function initializeQuestionTimers(){
  if(!questionTimersEnabled){
    return;
  }
  document.querySelectorAll(".test-question-card input").forEach(input => {
    input.addEventListener("change", function(){
      const card = this.closest(".test-question-card");
      if(!card){
        return;
      }
      updateQuestionCompletion(card.dataset.questionId);
    });
  });
  showCurrentQuestion();
  window.updateQuestionCompletion = updateQuestionCompletion;
}
document.getElementById("startExamBtn").onclick = function(){
  const startBtn = document.getElementById("startExamBtn");
  if(startBtn){
    startBtn.disabled = true;
    startBtn.innerText = "Starting...";
  }
  const startNow = function(){
    startExamMode();
    initializeQuestionTimers();
    document.getElementById("examGate").remove();
  };
  if(document.documentElement.requestFullscreen){
    document.documentElement.requestFullscreen()
      .then(startNow)
      .catch(startNow);
  } else {
    startNow();
  }
};
function startExamMode(){
  window.__examTriggered = false;
  history.pushState(null, null, location.href);
  const durationMinutes = ${test.durationMinutes || 0};
  if(durationMinutes > 0){
    const durationMs = durationMinutes * 60 * 1000;
    setTimeout(() => {
      if (!window.__examTriggered) {
        window.__examTriggered = true;
        autoSubmit("Time up");
      }
    }, durationMs);
  }
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
  window.__submitReason = reason || "Manual submit";
  submitTest();
}
function submitTest(){
  if(window.__submitting){
    return;
  }
  window.__submitting = true;
  const btn = document.getElementById("submitBtn");
  if(btn){
    btn.disabled = true;
    btn.innerText = window.__submitReason
      ? "Auto-submitting..."
      : "Submitting...";
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";
  }
  let score = 0;
  let answers = [];
  try {
    qs.forEach(q => {
      const qid = String(q._id);
      let selected = null;
      let isCorrect = false;
      if(q.type === "coding"){
        selected = window.getCodeAnswer(qid);
      } else {
        if(q.correctAnswers && q.correctAnswers.length > 1){
          selected = Array.from(
            document.querySelectorAll('input[name="q'+qid+'"]:checked')
          ).map(el => el.value);
        } else {
          const s = document.querySelector('input[name="q'+qid+'"]:checked');
          selected = s ? s.value : null;
        }
        if(q.correctAnswers && q.correctAnswers.length){
          if(Array.isArray(selected)){
            isCorrect =
              selected.length === q.correctAnswers.length &&
              selected.every(v => q.correctAnswers.includes(v));
          } else {
            isCorrect = q.correctAnswers.includes(selected);
          }
        } else {
          isCorrect = selected === q.correct;
        }
        if(isCorrect){
          score++;
        }
      }
      answers.push({
        questionId: qid,
        type: q.type,
        selected,
        correctAnswer: q.correctAnswers && q.correctAnswers.length
          ? q.correctAnswers
          : q.correct,
        isCorrect
      });
    });
  } catch(err){
    alert("Submit failed while collecting answers");
    window.__submitting = false;
    if(btn){
      btn.disabled = false;
      btn.innerText = "Submit";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
    return;
  }
  fetch("/submit", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    keepalive:true,
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
        document.querySelectorAll(".code-editor").forEach(editor => {
      const questionId = editor.dataset.questionId;
      localStorage.removeItem("code_answer_" + testId + "_" + questionId);
      localStorage.removeItem("code_language_" + testId + "_" + questionId);
    });
        alert(window.__submitReason
      ? "Test submitted automatically: " + window.__submitReason
      : "Submitted"
    );
    window.location.replace("/my-tests");
  })
  .catch(() => {
    alert("Submit failed");
    window.__submitting = false;
    if(btn){
      btn.disabled = false;
      btn.innerText = "Submit";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  });
}
</script>
<script type="module">
import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.7";
window.codeMirrorEditors = window.codeMirrorEditors || {};
document.querySelectorAll(".cm-editor-host").forEach(host => {
  const questionId = host.dataset.questionId;
  const textarea = document.getElementById("code-" + questionId);
  const storageKey = "code_answer_" + testId + "_" + questionId;
  const saved = localStorage.getItem(storageKey);
  const initialCode =
    saved !== null
      ? saved
      : textarea
        ? textarea.value
        : "";
    const question = (window.__testQuestions || []).find(item =>
  String(item._id) === String(questionId)
);
const savedLanguage = question?.codingMeta?.language || "javascript";
  const editor = new EditorView({
    doc: initialCode,
    extensions: [
      basicSetup,
      savedLanguage === "python" ? python() : javascript(),
      EditorView.theme({
        "&": {
          height: "360px",
          backgroundColor: "#020617",
          color: "#e2e8f0",
          fontSize: "14px"
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "Consolas, Monaco, monospace",
          lineHeight: "1.6"
        },
        ".cm-content": {
          padding: "14px",
          caretColor: "#ffffff"
        },
        ".cm-gutters": {
          backgroundColor: "#0f172a",
          color: "#64748b",
          border: "none"
        },
        ".cm-activeLine": {
          backgroundColor: "#0f172a"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#0f172a"
        },
        ".cm-cursor": {
          borderLeftColor: "#ffffff"
        }
      }),
      EditorView.domEventHandlers({
        keydown(event, view){
          if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s"){
            event.preventDefault();
            const value = view.state.doc.toString();
            localStorage.setItem(storageKey, value);
            if(textarea){
              textarea.value = value;
            }
            return true;
          }
          return false;
        }
      }),
      EditorView.updateListener.of(update => {
        if(update.docChanged){
          const value = update.state.doc.toString();
          localStorage.setItem(storageKey, value);
          if(textarea){
            textarea.value = value;
          }
          if(typeof window.updateQuestionCompletion === "function"){
            window.updateQuestionCompletion(questionId);
          }
        }
      })
    ],
    parent: host
  });
  window.codeMirrorEditors[questionId] = editor;
  host.style.display = "block";
  host.style.flex = "1";
  host.style.width = "100%";
  if(textarea){
    textarea.style.display = "none";
  }
  const languageBadge = document.querySelector(
    '.language-badge[data-question-id="' + questionId + '"]'
  );
  if(languageBadge){
    languageBadge.textContent =
      savedLanguage === "python" ? "Python" : "JavaScript";
    languageBadge.title = "Language is set by the question";
  }
});
window.getCodeAnswer = function(qid){
  const editor = window.codeMirrorEditors?.[qid];
  if(editor){
    return editor.state.doc.toString();
  }
  const textarea = document.getElementById("code-" + qid);
  return textarea ? textarea.value : "";
};
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading test");
  }
});
module.exports = router;