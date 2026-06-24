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
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student login — Wzdm.in</title>
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

  .form{display:flex;flex-direction:column;gap:16px}
  .field label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:var(--ink)}
  .field input{width:100%;border:1px solid var(--line-dark);border-radius:10px;padding:12px 14px;font-size:15px;outline:none;font-family:var(--sans);color:var(--ink);background:#fff;transition:border-color .2s,box-shadow .2s}
  .field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(224,99,58,0.12)}
  .btn-submit{width:100%;border:none;border-radius:10px;padding:13px;background:var(--accent);color:#fff;font-size:15.5px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:background .2s,transform .15s;margin-top:2px}
  .btn-submit:hover{background:#c9542e;transform:translateY(-1px)}

  .error{display:none;margin:0 0 16px;padding:11px 13px;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:13.5px;border:1px solid #fecaca}

  .confirm-box{display:none;margin-top:20px;background:#fafaf8;border:1px solid var(--line-dark);border-radius:12px;padding:20px}
  .confirm-box h3{font-family:var(--display);font-size:18px;font-weight:600;letter-spacing:-0.01em;margin-bottom:14px;color:var(--ink)}
  .confirm-row{font-size:14px;color:var(--slate);margin-bottom:8px;line-height:1.5}
  .confirm-row b{color:var(--ink);font-weight:500}
  .confirm-actions{display:flex;gap:10px;margin-top:18px}
  .success-btn{flex:1;border:none;border-radius:10px;padding:12px;background:#15803d;color:#fff;font-size:14.5px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:background .2s}
  .success-btn:hover{background:#166534}
  .secondary-btn{flex:1;border:1px solid var(--line-dark);border-radius:10px;padding:12px;background:#fff;color:var(--slate);font-size:14.5px;font-weight:500;cursor:pointer;font-family:var(--sans);transition:border-color .2s,color .2s}
  .secondary-btn:hover{border-color:var(--slate);color:var(--ink)}

  .secondary{margin-top:20px;padding-top:18px;border-top:1px solid var(--line-dark);text-align:center}
  .secondary button{border:none;background:transparent;color:var(--accent);cursor:pointer;font-size:14px;font-weight:500;font-family:var(--sans)}
  .secondary button:hover{text-decoration:underline}
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

  @media(max-width:480px){.card{padding:28px 20px}.confirm-actions{flex-direction:column}}
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
    <div class="card-icon"><i class="ti ti-user"></i></div>
    <h1 class="card-title">Student login</h1>
    <p class="card-sub">Enter your details to find your record and continue to your assigned tests.</p>
    <p id="errorBox" class="error"></p>
    <div id="lookupForm" class="form">
      <div class="field">
        <label for="firstName">First name</label>
        <input id="firstName" placeholder="Enter first name" autocomplete="given-name">
      </div>
      <div class="field">
        <label for="lastName">Last name</label>
        <input id="lastName" placeholder="Enter last name" autocomplete="family-name">
      </div>
      <div class="field">
        <label for="schoolCode">School code</label>
        <input id="schoolCode" placeholder="Enter school code" autocomplete="off">
      </div>
      <div class="field">
        <label for="studentId">Student ID</label>
        <input id="studentId" placeholder="Enter student ID" autocomplete="off">
      </div>
      <button id="lookupStudentButton" class="btn-submit" type="button">Find my record</button>
    </div>
    <div id="confirmBox" class="confirm-box"></div>
    <div class="secondary">
      <button id="studentBackToLoginButton" type="button">← All login options</button>
      <p>Having trouble? Contact your teacher or school admin.</p>
    </div>
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
  const schoolCode = document.getElementById("schoolCode").value.trim().toUpperCase();
  const studentId = document.getElementById("studentId").value.trim();
  if(!firstName || !lastName || !schoolCode || !studentId){
    showError("Please enter school code, first name, last name, and student ID.");
    return;
  }
  fetch("/api/student/lookup", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({firstName, lastName, studentId, schoolCode})
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
      "<h3>Confirm your details</h3>" +
      "<p class='confirm-row'><b>Name:</b> " + escapeHtml(matchedStudent.name) + "</p>" +
      "<p class='confirm-row'><b>Class:</b> " + escapeHtml(matchedStudent.class) + "</p>" +
      "<p class='confirm-row'><b>Student ID:</b> " + escapeHtml(matchedStudent.studentId) + "</p>" +
      "<p class='confirm-row'><b>School:</b> " + escapeHtml(matchedStudent.schoolName) + "</p>" +
      "<div class='confirm-actions'>" +
        "<button id='confirmStudentButton' class='success-btn' type='button'>Confirm &amp; continue</button>" +
        "<button id='resetLookupButton' class='secondary-btn' type='button'>Go back</button>" +
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
  if(lookupStudentButton){ lookupStudent(); return; }
  const studentBackToLoginButton = event.target.closest("#studentBackToLoginButton");
  if(studentBackToLoginButton){ window.location.replace("/login"); return; }
  const confirmStudentButton = event.target.closest("#confirmStudentButton");
  if(confirmStudentButton){ confirmStudent(); return; }
  const resetLookupButton = event.target.closest("#resetLookupButton");
  if(resetLookupButton){ resetLookup(); }
});
function confirmStudent(){
  if(!matchedStudent){ showError("No student record selected."); return; }
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
    const schoolCode = String(req.body.schoolCode || "").trim().toUpperCase();
    if (!firstName || !lastName || !studentId || !schoolCode) {
      return res.status(400).json({
        error: "Please enter school code, first name, last name, and student ID."
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
      schoolCode,
      status: "active"
    })
      .select("studentId studentKey name firstName lastName fullName nameKey class teacherId schoolId schoolCode status")
      .limit(10)
      .lean();
    if (!matches.length) {
      matches = await Student.find({
        schoolCode,
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
  return res.status(410).json({
    error: "This login endpoint is no longer supported. Please use the student entry page."
  });
});

module.exports = router;
