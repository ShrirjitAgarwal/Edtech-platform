const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Student = require("../../models/Student");
const School = require("../../models/School");
const authMiddleware = require("../../middleware/auth");
const { recordUsageEvent } = require("../../services/usageTracker");
const { escapeHtml } = require("../../utils/html");

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

module.exports = router;
