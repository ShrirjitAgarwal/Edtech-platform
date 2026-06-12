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
const authMiddleware = require("../middleware/auth");
const {
  recordUsageEvent
} = require("../services/usageTracker");
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
function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
async function getStudentSession(req) {
  const studentToken = req.cookies && req.cookies.studentSessionToken;
  if (!studentToken) {
    return null;
  }
  let decodedStudent;
  try {
    decodedStudent = jwt.verify(
      studentToken,
      process.env.JWT_SECRET
    );
  } catch (tokenErr) {
    return null;
  }
  if (!decodedStudent || decodedStudent.role !== "student") {
    return null;
  }
  const student = await Student.findOne({
    _id: decodedStudent.studentRecordId,
    studentId: decodedStudent.studentId,
    status: "active"
  })
    .select("studentId studentKey name fullName class teacherId schoolId schoolCode status")
    .lean();
  if (!student) {
    return null;
  }
  if (
    decodedStudent.schoolId &&
    student.schoolId &&
    String(decodedStudent.schoolId) !== String(student.schoolId)
  ) {
    return null;
  }
  return {
    decodedStudent,
    student
  };
}
async function requireStudentApiSession(req, res, next) {
  try {
    const session = await getStudentSession(req);
    if (!session) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    req.studentSession = session;
    next();
  } catch (err) {
    console.error("STUDENT SESSION ERROR:", err);
    return res.status(500).json({
      error: "Failed to verify student session"
    });
  }
}
async function requireStudentPageSession(req, res, next) {
  try {
    const session = await getStudentSession(req);
    if (!session) {
      return res.redirect("/student-entry");
    }
    req.studentSession = session;
    next();
  } catch (err) {
    console.error("STUDENT PAGE SESSION ERROR:", err);
    return res.redirect("/student-entry");
  }
}
// ======================================================
// STUDENT DETAIL PAGE
// ======================================================
router.get("/student", authMiddleware, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
      return res.status(403).send("<h2>Access denied</h2>");
    }
    const studentId = String(req.query.studentId || "").trim();
    if (!studentId) {
      return res.send("<h2>Missing student ID</h2>");
    }
    const resultFilter = {
      studentId
    };
    if (req.user.role === "teacher") {
      resultFilter.teacherId = String(req.user.id);
    }
    if (req.user.schoolId) {
      resultFilter.schoolId = req.user.schoolId;
    }
    let results = await Result.find(resultFilter)
      .select("studentId name class testId testName score total date teacherId schoolId")
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
<div
class="student-result-card"
data-test-id="${escapeAttribute(r.testId)}"
style="
background:white;
padding:20px;
margin:15px 0;
border-radius:12px;
cursor:pointer;
">
  <div style="display:flex;justify-content:space-between;">
    <div style="font-weight:600;">
      ${escapeHtml(r.testName || "Unnamed Test")}
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
  <button id="downloadStudentReportButton" style="
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
<p><b>Name:</b> ${escapeHtml(student.name)}</p>
<p><b>Class:</b> ${escapeHtml(student.class)}</p>
<p><b>Student ID:</b> ${escapeHtml(student.studentId)}</p>
<h2>Performance History</h2>
${resultsHTML}
<script>
function viewResult(testId){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  go(
    "/result?testId=" +
    encodeURIComponent(testId || "") +
    "&studentId=" +
    encodeURIComponent(studentId || "")
  );
}

document.querySelectorAll(".student-result-card").forEach(card => {
  card.addEventListener("click", function(){
    viewResult(this.dataset.testId || "");
  });
});

const downloadStudentReportButton = document.getElementById("downloadStudentReportButton");
if (downloadStudentReportButton) {
  downloadStudentReportButton.addEventListener("click", downloadReport);
}

function downloadReport(){
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
fetch("/api/reports/student/download", {
  method:"POST",
  headers:{
    "Content-Type":"application/json"
  },
  body: JSON.stringify({ studentId })
})
  .then(res => {
    if(!res.ok){
      throw new Error("Download failed");
    }
    return res.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
    URL.revokeObjectURL(url);
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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student Login | WZDM</title>
<style>
  :root {
    --bg: #f8fafc;
    --bg-soft: #eef2ff;
    --card: #ffffff;
    --text: #0f172a;
    --muted: #64748b;
    --border: #e2e8f0;
    --primary: #4f46e5;
    --primary-dark: #3730a3;
    --success: #16a34a;
    --secondary: #64748b;
    --danger-bg: #fef2f2;
    --danger-text: #991b1b;
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
  .primary-btn,
  .success-btn,
  .secondary-btn {
    width: 100%;
    border: none;
    border-radius: 12px;
    padding: 14px;
    color: white;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
  }
  .primary-btn {
    background: var(--primary);
  }
  .primary-btn:hover {
    background: var(--primary-dark);
  }
  .success-btn {
    background: var(--success);
  }
  .secondary-btn {
    background: var(--secondary);
  }
  .error {
    display: none;
    margin: 0 0 14px;
    padding: 11px 12px;
    border-radius: 12px;
    background: var(--danger-bg);
    color: var(--danger-text);
    font-size: 13px;
    font-weight: 700;
    text-align: left;
  }
  .confirm-box {
    display: none;
    margin-top: 20px;
    background: #f8fafc;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--border);
  }
  .confirm-box h3 {
    margin: 0 0 12px;
    font-size: 18px;
  }
  .confirm-row {
    margin: 8px 0;
    color: #334155;
    line-height: 1.45;
  }
  .confirm-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .secondary-actions {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
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
    .confirm-actions {
      flex-direction: column;
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
    <a class="toplink" href="/login">Login Options</a>
  </header>
  <main class="main">
    <section class="card">
      <div class="badge">S</div>
      <h1>Student Login</h1>
      <p class="subtitle">Enter your name and student ID to find your record and continue to your assigned tests.</p>
      <p id="errorBox" class="error"></p>
      <div id="lookupForm" class="form">
        <div class="field">
          <label for="firstName">First Name</label>
          <input id="firstName" placeholder="Enter first name" autocomplete="given-name">
        </div>
        <div class="field">
          <label for="lastName">Last Name</label>
          <input id="lastName" placeholder="Enter last name" autocomplete="family-name">
        </div>
        <div class="field">
          <label for="studentId">Student ID</label>
          <input id="studentId" placeholder="Enter student ID" autocomplete="off">
        </div>
        <button id="lookupStudentButton" class="primary-btn" type="button">Find My Record</button>
      </div>
      <div id="confirmBox" class="confirm-box"></div>
      <div class="secondary-actions">
        <button id="studentBackToLoginButton" type="button">← Back to login options</button>
        <p class="help-text">Having trouble signing in? Please contact your teacher or school admin.</p>
      </div>
    </section>
  </main>
  <footer class="footer">
    © 2026 WZDM Assessment Platform. All rights reserved.
  </footer>
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
  fetch("/api/student/lookup", {
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
    const confirmBox = document.getElementById("confirmBox");
    confirmBox.style.display = "block";
    confirmBox.innerHTML =
      "<h3>Confirm Your Details</h3>" +
      "<p class='confirm-row'><b>Name:</b> " + escapeHtml(matchedStudent.name) + "</p>" +
      "<p class='confirm-row'><b>Class ID:</b> " + escapeHtml(matchedStudent.class) + "</p>" +
      "<p class='confirm-row'><b>Student ID:</b> " + escapeHtml(matchedStudent.studentId) + "</p>" +
      "<p class='confirm-row'><b>School:</b> " + escapeHtml(matchedStudent.schoolName) + "</p>" +
      "<div class='confirm-actions'>" +
        "<button id='confirmStudentButton' class='success-btn' type='button'>Confirm</button>" +
        "<button id='resetLookupButton' class='secondary-btn' type='button'>Go Back</button>" +
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

document.addEventListener("click", function(event){
  const lookupStudentButton = event.target.closest("#lookupStudentButton");
  if(lookupStudentButton){
    lookupStudent();
    return;
  }

  const studentBackToLoginButton = event.target.closest("#studentBackToLoginButton");
  if(studentBackToLoginButton){
    window.location.replace("/login");
    return;
  }

  const confirmStudentButton = event.target.closest("#confirmStudentButton");
  if(confirmStudentButton){
    confirmStudent();
    return;
  }

  const resetLookupButton = event.target.closest("#resetLookupButton");
  if(resetLookupButton){
    resetLookup();
  }
});

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
</html>
`);
});
// ======================================================
// STUDENT LOOKUP
// ======================================================
async function studentLookupHandler(req, res) {
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

    await recordUsageEvent({
      schoolId: student.schoolId || null,
      schoolCode: student.schoolCode || null,
      teacherId: student.teacherId || null,
      studentId: student.studentId,
      role: "student",
      eventType: "student_login_success",
      eventLabel: "Student login success",
      resourceType: "student",
      resourceId: String(student._id),
      status: "success",
      metadata: {
        studentRecordId: String(student._id),
        studentId: student.studentId,
        studentName: student.fullName || student.name || "",
        className: student.class || "",
        teacherId: student.teacherId || null,
        schoolName: school?.name || "N/A"
      }
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
}
router.post("/api/student/lookup", studentLookupHandler);
// ======================================================
// MY TESTS
// ======================================================
// ---------- STUDENT DASHBOARD / TEST LIST ----------
router.get("/my-tests", requireStudentPageSession, async (req, res) => {
res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;overflow:hidden;">
<div style="display:flex;height:100vh;">
     ${sidebar("my-tests", "student")}
  <!-- CONTENT -->
  <div style="
    flex:1;
    height:100vh;
    padding:30px;
    background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 100%);
    overflow-y:auto;
    overflow-x:hidden;
    box-sizing:border-box;
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      margin-bottom:20px;
    ">
      <div>
        <h1 style="margin:0;font-size:30px;color:#0f172a;">Student Dashboard</h1>
        <p id="studentWelcomeText" style="margin:8px 0 0 0;color:#64748b;font-size:15px;">
          Welcome back. Select a subject to view your assigned tests.
        </p>
      </div>
      ${backButton("/student-entry")}
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(4,minmax(150px,1fr));
      gap:14px;
      margin-bottom:20px;
    ">
      <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;box-shadow:0 8px 20px rgba(15,23,42,0.06);">
        <div style="font-size:13px;color:#64748b;font-weight:700;">Assigned Tests</div>
        <div id="assignedCount" style="font-size:28px;font-weight:800;color:#0f172a;margin-top:8px;">0</div>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;box-shadow:0 8px 20px rgba(15,23,42,0.06);">
        <div style="font-size:13px;color:#64748b;font-weight:700;">Available</div>
        <div id="availableCount" style="font-size:28px;font-weight:800;color:#16a34a;margin-top:8px;">0</div>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;box-shadow:0 8px 20px rgba(15,23,42,0.06);">
        <div style="font-size:13px;color:#64748b;font-weight:700;">Pending</div>
        <div id="pendingCount" style="font-size:28px;font-weight:800;color:#ca8a04;margin-top:8px;">0</div>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;box-shadow:0 8px 20px rgba(15,23,42,0.06);">
        <div style="font-size:13px;color:#64748b;font-weight:700;">Completed</div>
        <div id="completedCount" style="font-size:28px;font-weight:800;color:#4f46e5;margin-top:8px;">0</div>
      </div>
    </div>

    <div style="
      background:white;
      border:1px solid #e2e8f0;
      border-radius:16px;
      padding:20px;
      box-shadow:0 10px 28px rgba(15,23,42,0.08);
      margin-bottom:20px;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:16px;
        margin-bottom:16px;
      ">
        <div>
          <h2 style="margin:0;color:#0f172a;">Assigned Tests</h2>
          <p style="margin:6px 0 0 0;color:#64748b;font-size:14px;">
            View tests assigned to you by your teacher.
          </p>
        </div>
        <div
          id="subjectDropdown"
          style="
            position:relative;
            width:280px;
          "
        >
          <button
            id="subjectDropdownButton"
            type="button"
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
      </div>

      <div id="testList"></div>
    </div>
  </div>
</div>
<script>
function go(path){
  window.location.replace(path);
}

function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function formatDate(value){
  if(!value){
    return "Not available";
  }
  const date = new Date(value);
  if(Number.isNaN(date.getTime())){
    return "Not available";
  }
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatusLabel(status){
  if(status === "completed"){
    return "Completed";
  }
  if(status === "pending"){
    return "Pending";
  }
  return "Available";
}

function getStatusColor(status){
  if(status === "completed"){
    return "#4f46e5";
  }
  if(status === "pending"){
    return "#ca8a04";
  }
  return "#16a34a";
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

const studentWelcomeText = document.getElementById("studentWelcomeText");
if(studentWelcomeText){
  studentWelcomeText.innerText =
    "Welcome back, " + (student.name || "Student") + ". Select a subject to view your assigned tests.";
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

window.onload = function(){
  const subjectSelect = document.getElementById("subjectSelect");
  const testList = document.getElementById("testList");
  const subjectDropdownMenu = document.getElementById("subjectDropdownMenu");
  const selectedSubjectLabel = document.getElementById("selectedSubjectLabel");
  const assignedCount = document.getElementById("assignedCount");
  const availableCount = document.getElementById("availableCount");
  const pendingCount = document.getElementById("pendingCount");
  const completedCount = document.getElementById("completedCount");

  function updateSummary(tests){
    const safeTests = Array.isArray(tests) ? tests : [];
    assignedCount.innerText = safeTests.length;
    availableCount.innerText = safeTests.filter(test => test.studentStatus === "available").length;
    pendingCount.innerText = safeTests.filter(test => test.studentStatus === "pending").length;
    completedCount.innerText = safeTests.filter(test => test.studentStatus === "completed").length;
  }

  function renderTests(tests){
    testList.innerHTML = "";
    updateSummary(tests);

    if(!tests.length){
      testList.innerHTML =
        "<div style='padding:22px;border:1px dashed #cbd5e1;border-radius:14px;color:#64748b;background:#f8fafc;'>" +
          "No tests found for this subject." +
        "</div>";
      return;
    }

    tests.forEach(t => {
      const status = t.studentStatus || "available";
      const canStart = status === "available";
      const card = document.createElement("div");
      card.style.background = "#f8fafc";
      card.style.border = "1px solid #e2e8f0";
      card.style.borderRadius = "14px";
      card.style.padding = "18px";
      card.style.margin = "12px 0";
      card.style.display = "grid";
      card.style.gridTemplateColumns = "1fr auto";
      card.style.gap = "16px";
      card.style.alignItems = "center";

      const details = document.createElement("div");
      details.innerHTML =
        "<div style='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;'>" +
          "<h3 style='margin:0;color:#0f172a;'>" + escapeHtml(t.name || "Untitled Test") + "</h3>" +
          "<span style='background:" + getStatusColor(status) + ";color:white;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:800;'>" +
            escapeHtml(getStatusLabel(status)) +
          "</span>" +
        "</div>" +
        "<div style='display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;color:#475569;font-size:14px;'>" +
          "<div><b>Subject:</b> " + escapeHtml(t.subject || "N/A") + "</div>" +
          "<div><b>Type:</b> " + escapeHtml(t.testType || "practice") + "</div>" +
          "<div><b>Assigned by:</b> " + escapeHtml(t.assignedBy || "Teacher") + "</div>" +
          "<div><b>Assigned on:</b> " + escapeHtml(formatDate(t.assignedOn)) + "</div>" +
          "<div><b>Duration:</b> " + escapeHtml(t.durationMinutes || 60) + " minutes</div>" +
          "<div><b>Scheduled:</b> " + escapeHtml(t.scheduledAt ? formatDate(t.scheduledAt) : "Available now") + "</div>" +
        "</div>";

      const actionWrap = document.createElement("div");
      const btn = document.createElement("button");
      btn.innerText = canStart
        ? "Start Test"
        : status === "completed"
          ? "Completed"
          : "Not Yet Available";
      btn.disabled = !canStart;
      btn.style.padding = "12px 16px";
      btn.style.border = "none";
      btn.style.borderRadius = "10px";
      btn.style.fontWeight = "800";
      btn.style.cursor = canStart ? "pointer" : "not-allowed";
      btn.style.background = canStart ? "#4f46e5" : "#94a3b8";
      btn.style.color = "white";
      btn.addEventListener("click", function(){
        if(canStart){
          startTest(t._id);
        }
      });
      actionWrap.appendChild(btn);

      card.appendChild(details);
      card.appendChild(actionWrap);
      testList.appendChild(card);
    });
  }

  function loadTestsForSubject(subject){
    if (!subject) {
      testList.innerHTML =
        "<div style='padding:22px;border:1px dashed #cbd5e1;border-radius:14px;color:#64748b;background:#f8fafc;'>" +
          "Select a subject to see assigned tests." +
        "</div>";
      updateSummary([]);
      return;
    }

    testList.innerHTML =
      "<div style='padding:22px;color:#64748b;'>Loading tests...</div>";

    fetch(
      "/api/student/tests?subject=" +
      encodeURIComponent(subject)
    )
      .then(res => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then(tests => {
        renderTests(Array.isArray(tests) ? tests : []);
      })
      .catch(err => {
        console.error("TEST LOAD ERROR:", err);
        updateSummary([]);
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

  const subjectDropdownButton = document.getElementById("subjectDropdownButton");
  if(subjectDropdownButton){
    subjectDropdownButton.addEventListener("click", toggleSubjectDropdown);
  }

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

  fetch("/api/student/subjects")
    .then(res => res.json())
    .then(subjects => {
      subjectDropdownMenu.innerHTML = "";
      if (!subjects.length) {
        subjectDropdownMenu.innerHTML =
          "<div style='padding:12px;color:#64748b;'>No subjects found</div>";
        loadTestsForSubject("");
        return;
      }
      subjects.forEach(sub => {
        const option = document.createElement("button");
        option.type = "button";
        option.innerText = sub;
        option.addEventListener("click", function(){
          selectSubjectOption(sub);
        });
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

      selectSubjectOption(subjects[0]);
    });
};
</script>
</body>
`);
});
// ======================================================
// API ROUTES
// ======================================================
async function getStudentSubjectsHandler(req, res) {
  try {
    const student = req.studentSession.student;
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
}
router.get("/api/student/subjects", requireStudentApiSession, getStudentSubjectsHandler);
router.get("/get-classes", authMiddleware, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "teacher")) {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const filter = {};
    if (req.user.role === "teacher") {
      filter.teacherId = String(req.user.id);
    }
    if (req.user.role === "admin" && req.query.teacherId) {
      filter.teacherId = String(req.query.teacherId || "").trim();
    }
    if (req.user.schoolId) {
      filter.schoolId = req.user.schoolId;
    }
    const classes = await Student.find(filter).distinct("class");
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});
router.get("/get-students", authMiddleware, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "teacher")) {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const className =
      String(req.query.className || "").trim();
    if (!className) {
      return res.status(400).json({ error: "Class required" });
    }
    const filter = {
      class: className
    };
    if (req.user.role === "teacher") {
      filter.teacherId = String(req.user.id);
    }
    if (req.user.role === "admin" && req.query.teacherId) {
      filter.teacherId = String(req.query.teacherId || "").trim();
    }
    if (req.user.schoolId) {
      filter.schoolId = req.user.schoolId;
    }
    const students = await Student.find(
      filter,
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
router.get("/test", requireStudentPageSession, async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect("/student-entry");
    }
    const decodedStudent = req.studentSession.decodedStudent;
    const student = req.studentSession.student;
    const studentId = decodedStudent.studentId;
const alreadyAttempted = await Result.findOne({
  studentId,
  testId: id,
  teacherId: String(student.teacherId || ""),
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
  <p><b>Q${i + 1}: ${escapeHtml(q.question)}</b></p>
  ${q.options.map(o => `
    <label>
      ${(q.correctAnswers && q.correctAnswers.length > 1)
        ? `<input type="checkbox" name="q${escapeAttribute(qid)}" value="${escapeAttribute(o)}"> ${escapeHtml(o)}`
        : `<input type="radio" name="q${escapeAttribute(qid)}" value="${escapeAttribute(o)}"> ${escapeHtml(o)}`
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
  <p><b>Q${i + 1}: ${escapeHtml(q.question)}</b></p>
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
          id="run-${escapeAttribute(qid)}"
          class="run-code-button"
          data-question-id="${escapeAttribute(qid)}"
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
      >${escapeHtml(q.codingMeta?.starterCode || "")}</textarea>
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
        const studentNameForPage =
      student.fullName || student.name || "Student";
    const studentClassForPage =
      student.class || "N/A";
    const studentIdForPage =
      student.studentId || studentId || "N/A";
    const questionSidebarHtml = testQuestions.map((q, i) => {
      const questionPreview = String(q.question || "")
        .replace(/\s+/g, " ")
        .trim();
      return `
        <div
          class="student-test-question-row"
          data-sidebar-question-index="${i}"
        >
          <div class="student-test-question-number">
            Q${i + 1}
          </div>
          <div class="student-test-question-preview">
            ${escapeHtml(questionPreview || "Question")}
          </div>
        </div>
      `;
    }).join("");
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(test.name)} | WZDM Test</title>
<style>
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a;
    background: #eef2ff;
  }
  .student-test-shell {
    min-height: 100vh;
    display: flex;
    background:
      radial-gradient(circle at top left, rgba(79, 70, 229, 0.10), transparent 34%),
      linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  }
  .student-test-sidebar {
    width: 280px;
    min-height: 100vh;
    background: #0f172a;
    color: white;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .student-test-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .student-test-brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }
  .student-test-sidebar-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 16px;
  }
  .student-test-sidebar-label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .student-test-sidebar-value {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 12px;
    word-break: break-word;
  }
  .student-test-sidebar-value:last-child {
    margin-bottom: 0;
  }
  .student-test-question-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }
  .student-test-question-row {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 10px;
    align-items: start;
    padding: 10px;
    border-radius: 12px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.10);
  }
  .student-test-question-row.is-current {
    border-color: #818cf8;
    background: rgba(79, 70, 229, 0.22);
  }
  .student-test-question-row.is-answered {
    border-color: rgba(34, 197, 94, 0.65);
    background: rgba(22, 163, 74, 0.18);
  }
  .student-test-question-row.is-skipped {
    border-color: rgba(234, 179, 8, 0.75);
    background: rgba(234, 179, 8, 0.18);
  }
  .student-test-question-number {
    height: 34px;
    border-radius: 10px;
    background: #334155;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
  }
  .student-test-question-row.is-current .student-test-question-number {
    background: #4f46e5;
  }
  .student-test-question-row.is-answered .student-test-question-number {
    background: #16a34a;
  }
  .student-test-question-row.is-skipped .student-test-question-number {
    background: #ca8a04;
  }
  .student-test-question-preview {
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .student-test-content {
    flex: 1;
    min-width: 0;
    height: 100vh;
    overflow: auto;
    padding: 28px;
  }
  .student-test-header {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 22px;
    margin-bottom: 18px;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
  }
  .student-test-header-top {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }
  .student-test-title {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  .student-test-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .student-test-chip {
    background: #eef2ff;
    border: 1px solid #dbe4ff;
    color: #3730a3;
    border-radius: 999px;
    padding: 8px 11px;
    font-size: 13px;
    font-weight: 800;
  }
  .student-test-student-box {
    text-align: right;
    color: #475569;
    font-size: 13px;
    line-height: 1.5;
  }
  .student-test-student-box b {
    color: #0f172a;
  }
  .student-test-main-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 22px;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
  }
  .student-test-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    align-items: center;
  }
  #submitBtn,
  #previousQuestionBtn,
  #skipQuestionBtn,
  #nextQuestionBtn {
    padding: 12px 16px;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 800;
  }
  #nextQuestionBtn {
    background: #4f46e5;
  }
  #previousQuestionBtn {
    background: #64748b;
  }
  #skipQuestionBtn {
    background: #ca8a04;
  }
  #submitBtn {
    background: #16a34a;
  }
  #previousQuestionBtn:disabled,
  #skipQuestionBtn:disabled,
  #nextQuestionBtn:disabled,
  #submitBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  @media (max-width: 900px) {
    .student-test-shell {
      flex-direction: column;
    }
    .student-test-sidebar {
      width: 100%;
      min-height: auto;
    }
    .student-test-content {
      height: auto;
      padding: 18px;
    }
    .student-test-header-top {
      flex-direction: column;
    }
    .student-test-student-box {
      text-align: left;
    }
  }
</style>
</head>
<body>
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
<div class="student-test-shell">
  <aside class="student-test-sidebar">
    <div class="student-test-brand">
      <div class="student-test-brand-mark">W</div>
      <div>WZDM Test</div>
    </div>
    <div class="student-test-sidebar-card">
      <div class="student-test-sidebar-label">Student</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentNameForPage)}</div>
      <div class="student-test-sidebar-label">Class</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentClassForPage)}</div>
      <div class="student-test-sidebar-label">Student ID</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentIdForPage)}</div>
    </div>
    <div class="student-test-sidebar-card">
      <div class="student-test-sidebar-label">Questions</div>
      <div class="student-test-question-grid">
        ${questionSidebarHtml}
      </div>
    </div>
  </aside>
  <main class="student-test-content">
    <section class="student-test-header">
      <div class="student-test-header-top">
        <div>
          <h1 class="student-test-title">${escapeHtml(test.name)}</h1>
          <div class="student-test-meta">
            <span class="student-test-chip">Duration: ${test.durationMinutes || 60} minutes</span>
            <span class="student-test-chip">Type: ${escapeHtml(test.testType || "practice")}</span>
            <span class="student-test-chip">${testQuestions.length} questions</span>
          </div>
        </div>
        <div class="student-test-student-box">
          <div><b>${escapeHtml(studentNameForPage)}</b></div>
          <div>Class: ${escapeHtml(studentClassForPage)}</div>
          <div>ID: ${escapeHtml(studentIdForPage)}</div>
        </div>
      </div>
    </section>
    <section class="student-test-main-card">
      <div
        id="questionTimerPanel"
        style="
          display:none;
          background:#f8fafc;
          padding:16px 20px;
          border-radius:12px;
          margin:0 0 16px;
          border:1px solid #e2e8f0;
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
    <div class="student-test-actions">
      <button
        id="previousQuestionBtn"
        style="display:none;"
      >
        Previous Question
      </button>
      <button
        id="skipQuestionBtn"
        style="display:none;"
      >
        Skip Question
      </button>
      <button
        id="nextQuestionBtn"
        style="display:none;"
      >
        Next Question
      </button>
      <button id="submitBtn">Submit</button>
    </div>
    </section>
  </main>
</div>
<script>
const qs = ${safeJsonForScript(testQuestions)};
window.__testQuestions = qs;
const questionTimersEnabled = ${test.questionTimersEnabled ? "true" : "false"};
const testId = ${safeJsonForScript(String(test._id))};
window.__testId = testId;
const testName = ${safeJsonForScript(test.name)};
const studentId = ${safeJsonForScript(studentId)};
const schoolId = ${safeJsonForScript(String(test.schoolId || ""))};
const schoolCode = ${safeJsonForScript(String(test.schoolCode || ""))};
window.codeMirrorEditors = window.codeMirrorEditors || {};
function blockTestClipboardAction(event){
  event.preventDefault();
  return false;
}
["copy", "paste", "cut", "contextmenu", "dragstart", "drop"].forEach(eventName => {
  document.addEventListener(eventName, blockTestClipboardAction);
});
document.addEventListener("keydown", function(event){
  const key = String(event.key || "").toLowerCase();
  if (
    (event.ctrlKey || event.metaKey) &&
    ["c", "v", "x"].includes(key)
  ) {
    event.preventDefault();
    return false;
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
document.querySelectorAll(".run-code-button").forEach(button => {
  button.addEventListener("click", function(){
    window.runCode(this.dataset.questionId || "");
  });
});
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
    const res = await fetch("/api/code/run", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        code,
        language: q.codingMeta?.language || "javascript",
        functionName: q.codingMeta?.functionName || "",
        testCases: q.testCases || [],
        schoolId,
        schoolCode,
        studentId,
        testId,
        questionId: qid,
        testName,
        questionType: q.type || "coding"
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
  const storageKey = "code_answer_" + testId + "_" + questionId;
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
    answeredQuestions[String(questionId)] = true;
    delete skippedQuestions[String(questionId)];
    updateQuestionCompletion(questionId);
  });
});
let currentQuestionIndex = 0;
let questionTimerInterval = null;
let questionTimeRemaining = 0;
let timedOutQuestions = {};
let skippedQuestions = {};
let answeredQuestions = {};
function updateSidebarQuestionStatus(){
  document.querySelectorAll(".student-test-question-row").forEach(row => {
    const index = Number(row.dataset.sidebarQuestionIndex);
    const q = qs[index];
    row.classList.remove("is-current", "is-answered", "is-skipped");
    if(!q){
      return;
    }
    const qid = String(q._id);
    if(index === currentQuestionIndex && currentQuestionIndex < qs.length){
      row.classList.add("is-current");
      return;
    }
    if(skippedQuestions[qid]){
      row.classList.add("is-skipped");
      return;
    }
    if(isQuestionAnswered(qid)){
      row.classList.add("is-answered");
    }
  });
}
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
    return Boolean(answeredQuestions[String(qid)]) &&
      String(window.getCodeAnswer(qid) || "").trim().length > 0;
  }
  const checked = document.querySelectorAll('input[name="q' + qid + '"]:checked');
  return checked.length > 0;
}
function updateQuestionCompletion(qid){
  const qidKey = String(qid);
  if(isQuestionAnswered(qidKey)){
    answeredQuestions[qidKey] = true;
    delete skippedQuestions[qidKey];
  }
  updateSidebarQuestionStatus();
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
  const previousBtn = document.getElementById("previousQuestionBtn");
  const skipBtn = document.getElementById("skipQuestionBtn");
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
  if(previousBtn){
    previousBtn.style.display = questionTimersEnabled ? "inline-block" : "none";
    previousBtn.disabled = currentQuestionIndex <= 0;
  }
  if(skipBtn){
    skipBtn.style.display = questionTimersEnabled ? "inline-block" : "none";
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
  updateSidebarQuestionStatus();
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
function goToQuestionIndex(index){
  if(!questionTimersEnabled){
    return;
  }
  if(index < 0 || index >= qs.length){
    return;
  }
  clearInterval(questionTimerInterval);
  currentQuestionIndex = index;
  showCurrentQuestion();
}
function goToPreviousQuestion(){
  goToQuestionIndex(currentQuestionIndex - 1);
}
function skipCurrentQuestion(){
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(currentQuestion){
    const qid = String(currentQuestion._id);
    if(!isQuestionAnswered(qid)){
      skippedQuestions[qid] = true;
    }
  }
  goToNextQuestion("skipped");
}
function goToNextQuestion(reason){
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(currentQuestion && reason === "answered"){
    const qid = String(currentQuestion._id);
    if(isQuestionAnswered(qid)){
      answeredQuestions[qid] = true;
      delete skippedQuestions[qid];
    }
  }
  clearInterval(questionTimerInterval);
  currentQuestionIndex++;
  if(currentQuestionIndex >= qs.length){
    const timerPanel = document.getElementById("questionTimerPanel");
    const nextBtn = document.getElementById("nextQuestionBtn");
    const previousBtn = document.getElementById("previousQuestionBtn");
    const skipBtn = document.getElementById("skipQuestionBtn");
    const submitBtn = document.getElementById("submitBtn");
    document.querySelectorAll(".test-question-card").forEach(card => {
      card.style.display = "block";
    });
    if(timerPanel){
      timerPanel.style.display = "none";
    }
    if(previousBtn){
      previousBtn.style.display = "none";
    }
    if(skipBtn){
      skipBtn.style.display = "none";
    }
    if(nextBtn){
      nextBtn.style.display = "none";
    }
    if(submitBtn){
      submitBtn.style.display = "inline-block";
    }
    updateSidebarQuestionStatus();
    return;
  }
  showCurrentQuestion();
}
  const previousQuestionBtn = document.getElementById("previousQuestionBtn");
if(previousQuestionBtn){
  previousQuestionBtn.addEventListener("click", goToPreviousQuestion);
}

const skipQuestionBtn = document.getElementById("skipQuestionBtn");
if(skipQuestionBtn){
  skipQuestionBtn.addEventListener("click", skipCurrentQuestion);
}

const nextQuestionBtn = document.getElementById("nextQuestionBtn");
if(nextQuestionBtn){
  nextQuestionBtn.addEventListener("click", function(){
    goToNextQuestion("answered");
  });
}

const submitBtn = document.getElementById("submitBtn");
if(submitBtn){
  submitBtn.addEventListener("click", submitTest);
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
      const qid = String(card.dataset.questionId || "");
      if(qid){
        answeredQuestions[qid] = true;
        delete skippedQuestions[qid];
      }
      updateQuestionCompletion(card.dataset.questionId);
    });
  });
  showCurrentQuestion();
    document.querySelectorAll(".student-test-question-row").forEach(row => {
    row.addEventListener("click", function(){
      const index = Number(row.dataset.sidebarQuestionIndex);
      goToQuestionIndex(index);
    });
  });
  updateSidebarQuestionStatus();
  window.updateQuestionCompletion = updateQuestionCompletion;
}
const startExamBtn = document.getElementById("startExamBtn");
if(startExamBtn){
  startExamBtn.addEventListener("click", function(){
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
  });
}
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
  fetch("/api/student/submit", {
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
          answeredQuestions[String(questionId)] = true;
          delete skippedQuestions[String(questionId)];
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
</html>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading test");
  }
});
module.exports = router;