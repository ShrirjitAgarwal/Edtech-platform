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

module.exports = router;
