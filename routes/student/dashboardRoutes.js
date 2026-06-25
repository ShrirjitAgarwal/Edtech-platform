const express = require("express");
const router = express.Router();
const Student = require("../../models/Student");
const Result = require("../../models/Result");
const ClassSubject = require("../../models/ClassSubject");
const Test = require("../../models/Test");
const sidebar = require("../../views/sidebar");
const backButton = require("../../views/backButton");
const authMiddleware = require("../../middleware/auth");
const { requireStudentPageSession, requireStudentApiSession } = require("./session");
const { escapeHtml, safeJsonForScript } = require("../../utils/html");

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
    background:#e0633a;
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
// MY TESTS
// ======================================================
// ---------- STUDENT DASHBOARD / TEST LIST ----------
router.get("/my-tests", requireStudentPageSession, async (req, res) => {
res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.7.0/dist/tabler-icons.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#11161d;
    --slate:#3a4654;
    --paper:#faf9f6;
    --line:rgba(17,22,29,0.10);
    --line-soft:rgba(17,22,29,0.08);
    --accent:#e0633a;
    --accent-bg:#fbeee7;
    --accent-border:rgba(224,99,58,0.15);
    --sans:'Inter',system-ui,sans-serif;
    --display:'Fraunces',Georgia,serif;
  }
  body{font-family:var(--sans);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;overflow:hidden;}
  a{color:inherit;text-decoration:none}
</style>
</head>
<body>
<div style="display:flex;height:100vh;">
  ${sidebar("my-tests", "student")}
  <div style="
    flex:1;
    height:100vh;
    padding:32px 40px;
    background:var(--paper);
    overflow-y:auto;
    overflow-x:hidden;
    box-sizing:border-box;
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      margin-bottom:28px;
    ">
      <div>
        <h1 style="margin:0;font-family:var(--display);font-size:30px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;">Student Dashboard</h1>
        <p id="studentWelcomeText" style="margin:6px 0 0 0;color:var(--slate);font-size:15px;">
          Welcome back. Select a subject to view your assigned tests.
        </p>
      </div>
      ${backButton("/student-entry")}
    </div>

    <div style="
      display:grid;
      grid-template-columns:repeat(4,minmax(150px,1fr));
      gap:14px;
      margin-bottom:24px;
    ">
      <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:14px;padding:18px;box-shadow:0 4px 24px rgba(17,22,29,0.06);">
        <div style="font-size:13px;color:var(--slate);font-weight:500;">Assigned Tests</div>
        <div id="assignedCount" style="font-size:28px;font-weight:700;color:var(--ink);margin-top:8px;">0</div>
      </div>
      <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:14px;padding:18px;box-shadow:0 4px 24px rgba(17,22,29,0.06);">
        <div style="font-size:13px;color:var(--slate);font-weight:500;">Available</div>
        <div id="availableCount" style="font-size:28px;font-weight:700;color:#16a34a;margin-top:8px;">0</div>
      </div>
      <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:14px;padding:18px;box-shadow:0 4px 24px rgba(17,22,29,0.06);">
        <div style="font-size:13px;color:var(--slate);font-weight:500;">Pending</div>
        <div id="pendingCount" style="font-size:28px;font-weight:700;color:#ca8a04;margin-top:8px;">0</div>
      </div>
      <div style="background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:14px;padding:18px;box-shadow:0 4px 24px rgba(17,22,29,0.06);">
        <div style="font-size:13px;color:var(--slate);font-weight:500;">Completed</div>
        <div id="completedCount" style="font-size:28px;font-weight:700;color:var(--accent);margin-top:8px;">0</div>
      </div>
    </div>

    <div style="
      background:white;
      border:1px solid var(--line);
      border-radius:16px;
      padding:24px;
      box-shadow:0 4px 24px rgba(17,22,29,0.06);
      margin-bottom:24px;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:16px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0;font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Assigned Tests</h2>
          <p style="margin:4px 0 0 0;color:var(--slate);font-size:14px;">
            View tests assigned to you by your teacher.
          </p>
        </div>
        <div id="subjectDropdown" style="position:relative;width:240px;">
          <button
            id="subjectDropdownButton"
            type="button"
            style="
              width:100%;
              padding:10px 14px;
              border:1px solid rgba(17,22,29,0.12);
              border-radius:10px;
              background:white;
              cursor:pointer;
              text-align:left;
              font-family:var(--sans);
              font-size:14px;
              font-weight:500;
              color:var(--ink);
              display:flex;
              justify-content:space-between;
              align-items:center;
              box-sizing:border-box;
              transition:border-color .15s;
            "
          >
            <span id="selectedSubjectLabel">Select Subject</span>
            <i class="ti ti-chevron-down" style="font-size:15px;color:var(--slate);"></i>
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
              border:1px solid rgba(17,22,29,0.12);
              border-radius:10px;
              box-shadow:0 8px 24px rgba(17,22,29,0.12);
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
  if(status === "completed") return "Completed";
  if(status === "pending") return "Pending";
  return "Available";
}

function getStatusColor(status){
  if(status === "completed") return "#e0633a";
  if(status === "pending") return "#ca8a04";
  return "#16a34a";
}

const student = JSON.parse(localStorage.getItem("student") || "null");
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

window.logout = function(){
  localStorage.clear();
  window.location.replace("/");
};

window.startTest = function(id){
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
  window.location.href = "/test?id=" + encodeURIComponent(id);
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
    availableCount.innerText = safeTests.filter(t => t.studentStatus === "available").length;
    pendingCount.innerText = safeTests.filter(t => t.studentStatus === "pending").length;
    completedCount.innerText = safeTests.filter(t => t.studentStatus === "completed").length;
  }

  function renderTests(tests){
    testList.innerHTML = "";
    updateSummary(tests);

    if(!tests.length){
      testList.innerHTML =
        "<div style='padding:22px;border:1px dashed rgba(17,22,29,0.12);border-radius:14px;color:#3a4654;background:#faf9f6;font-size:14px;'>" +
          "No tests found for this subject." +
        "</div>";
      return;
    }

    tests.forEach(t => {
      const status = t.studentStatus || "available";
      const canStart = status === "available";
      const card = document.createElement("div");
      card.style.cssText = "background:#faf9f6;border:1px solid rgba(17,22,29,0.08);border-radius:14px;padding:18px;margin:10px 0;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;transition:border-color .15s;";
      card.onmouseenter = function(){ this.style.borderColor = "rgba(17,22,29,0.16)"; };
      card.onmouseleave = function(){ this.style.borderColor = "rgba(17,22,29,0.08)"; };

      const details = document.createElement("div");
      details.innerHTML =
        "<div style='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;'>" +
          "<h3 style='margin:0;font-family:\\'Fraunces\\',Georgia,serif;font-size:17px;font-weight:600;color:#11161d;letter-spacing:-0.01em;'>" + escapeHtml(t.name || "Untitled Test") + "</h3>" +
          "<span style='background:" + getStatusColor(status) + ";color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;'>" +
            escapeHtml(getStatusLabel(status)) +
          "</span>" +
        "</div>" +
        "<div style='display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:6px;color:#3a4654;font-size:13.5px;'>" +
          "<div><b style='color:#11161d;'>Subject:</b> " + escapeHtml(t.subject || "N/A") + "</div>" +
          "<div><b style='color:#11161d;'>Type:</b> " + escapeHtml(t.testType || "practice") + "</div>" +
          "<div><b style='color:#11161d;'>Assigned by:</b> " + escapeHtml(t.assignedBy || "Teacher") + "</div>" +
          "<div><b style='color:#11161d;'>Assigned on:</b> " + escapeHtml(formatDate(t.assignedOn)) + "</div>" +
          "<div><b style='color:#11161d;'>Duration:</b> " + escapeHtml(t.durationMinutes || 60) + " minutes</div>" +
          "<div><b style='color:#11161d;'>Scheduled:</b> " + escapeHtml(t.scheduledAt ? formatDate(t.scheduledAt) : "Available now") + "</div>" +
        "</div>";

      const actionWrap = document.createElement("div");
      const btn = document.createElement("button");
      btn.innerText = canStart ? "Start Test" : status === "completed" ? "Completed" : "Not Yet Available";
      btn.disabled = !canStart;
      btn.style.cssText = "padding:10px 18px;border:none;border-radius:10px;font-family:'Inter',system-ui,sans-serif;font-size:14px;font-weight:600;cursor:" + (canStart ? "pointer" : "not-allowed") + ";background:" + (canStart ? "#e0633a" : "rgba(17,22,29,0.15)") + ";color:" + (canStart ? "white" : "#3a4654") + ";transition:background .15s,transform .1s;";
      if(canStart){
        btn.onmouseenter = function(){ this.style.background = "#c9542e"; this.style.transform = "translateY(-1px)"; };
        btn.onmouseleave = function(){ this.style.background = "#e0633a"; this.style.transform = ""; };
      }
      btn.addEventListener("click", function(){
        if(canStart){ startTest(t._id); }
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
        "<div style='padding:22px;border:1px dashed rgba(17,22,29,0.12);border-radius:14px;color:#3a4654;background:#faf9f6;font-size:14px;'>" +
          "Select a subject to see assigned tests." +
        "</div>";
      updateSummary([]);
      return;
    }

    testList.innerHTML =
      "<div style='padding:22px;color:#3a4654;font-size:14px;'>Loading tests...</div>";

    fetch("/api/student/tests?subject=" + encodeURIComponent(subject))
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
          "<div style='padding:16px;color:#dc2626;font-size:14px;'>Failed to load tests. Please try again.</div>";
      });
  }

  window.toggleSubjectDropdown = function(){
    subjectDropdownMenu.style.display =
      subjectDropdownMenu.style.display === "block" ? "none" : "block";
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
    if (dropdown && !dropdown.contains(event.target)) {
      subjectDropdownMenu.style.display = "none";
    }
  });

  fetch("/api/student/subjects")
    .then(res => res.json())
    .then(subjects => {
      subjectDropdownMenu.innerHTML = "";
      if (!subjects.length) {
        subjectDropdownMenu.innerHTML =
          "<div style='padding:12px;color:#3a4654;font-size:14px;'>No subjects found</div>";
        loadTestsForSubject("");
        return;
      }
      subjects.forEach(sub => {
        const option = document.createElement("button");
        option.type = "button";
        option.innerText = sub;
        option.addEventListener("click", function(){ selectSubjectOption(sub); });
        option.style.cssText = "width:100%;padding:10px 14px;border:none;background:white;text-align:left;cursor:pointer;font-family:'Inter',system-ui,sans-serif;font-size:14px;font-weight:500;color:#11161d;box-sizing:border-box;transition:background .12s;";
        option.onmouseenter = function(){ this.style.background = "#fbeee7"; };
        option.onmouseleave = function(){ this.style.background = "white"; };
        subjectDropdownMenu.appendChild(option);
      });

      selectSubjectOption(subjects[0]);
    });
};
</script>
</body>
</html>
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

module.exports = router;
