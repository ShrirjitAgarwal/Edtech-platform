const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const User = require("../models/User");
const Result = require("../models/Result");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
const authMiddleware = require("../middleware/auth");
// ---------- SHARED HELPERS ----------
function teacherGuardScript() {
  return `
<script>
function protectTeacher(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user || user.role !== "teacher"){
    window.location.replace("/");
    return;
  }
}
protectTeacher();
window.addEventListener("pageshow", function(event){
  if(event.persisted){
    window.location.reload();
  }
});
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
// ---------- TEACHER DASHBOARD ----------
router.get("/teacher", async (req, res) => {
  try {
    const content = `
${teacherGuardScript()}
<div id="dashboard"></div>
<script>
window.onload = function(){
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
  });
}
window.toggleCustomDropdown = function(inputId){
  const menu = document.getElementById(inputId + "Menu");
  if(!menu){
    return;
  }
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  menu.style.display = isOpen ? "none" : "block";
};
function setCustomDropdownOptions(inputId, options, onSelect){
  const input = document.getElementById(inputId);
  const menu = document.getElementById(inputId + "Menu");
  const label = document.getElementById(inputId + "Label");
  if(!input || !menu || !label){
    return;
  }
  const currentValue = input.value || options[0]?.value || "";
  menu.innerHTML = "";
  options.forEach(optionData => {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = optionData.label;
    option.style.width = "100%";
    option.style.padding = "10px 12px";
    option.style.border = "none";
    option.style.background = "white";
    option.style.textAlign = "left";
    option.style.cursor = "pointer";
    option.style.fontSize = "13px";
    option.style.boxSizing = "border-box";
    option.onmouseenter = function(){
      option.style.background = "#eef2ff";
    };
    option.onmouseleave = function(){
      option.style.background = "white";
    };
    option.onclick = function(){
      input.value = optionData.value;
      label.textContent = optionData.label;
      closeCustomDropdowns();
      if(typeof onSelect === "function"){
        onSelect(optionData.value);
      }
    };
    menu.appendChild(option);
  });
  const selectedOption = options.find(optionData =>
    String(optionData.value) === String(currentValue)
  );
  if(selectedOption){
    input.value = selectedOption.value;
    label.textContent = selectedOption.label;
  } else {
    input.value = options[0]?.value || "";
    label.textContent = options[0]?.label || "Select";
  }
}
function escapeClientHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
document.addEventListener("click", function(event){
  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");
  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
return window.location.replace("/");
}
const teacherId = user._id || user.id;
  document.getElementById("dashboard").innerHTML =
    "<p style='color:#64748b;'>Loading dashboard...</p>";
fetch("/api/teacher-dashboard-data")
  .then(res => {
    if(!res.ok){
      throw new Error("Failed to load dashboard");
    }
    return res.json();
  })
  .then(data => {
    const myTests = data.tests || [];
    const myStudents = data.students || [];
    const myClasses = data.classes || [];
    const myResults = data.results || [];
    const myClassSubjects = data.classSubjects || [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTests = myTests
    .filter(t => {
      if(!t.createdAt) return false;
      return new Date(t.createdAt) >= thirtyDaysAgo;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalClassesAssigned = myClasses.length;
  const totalStudentsMapped = myStudents.length;
  const totalTestsCreated = myTests.length;
  const totalTestsCompleted = myResults.length;
  const totalSubjectsMapped = myClassSubjects.length;
  const recentTestsHtml = recentTests.length
    ? recentTests.map(t => \`
      <div style="
        padding:12px 0;
        border-bottom:1px solid #e5e7eb;
        cursor:pointer;
      "
      onclick="selectTest('\${t._id}')"
      >
        <div style="font-weight:700;margin-bottom:5px;">
          \${escapeClientHtml(t.name || "Untitled Test")}
        </div>
        <div style="font-size:13px;color:#64748b;">
          \${escapeClientHtml(t.subject || "No Subject")} • \${escapeClientHtml(t.className || "No Class")}
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
          \${new Date(t.createdAt).toLocaleDateString()}
        </div>
      </div>
    \`).join("")
    : "<p style='color:#64748b;margin:0;'>No tests created in the last 30 days.</p>";
  function getTestStats(testId){
    const test = myTests.find(t => String(t._id) === String(testId));
    if(!test){
      return null;
    }
    const testResults = myResults.filter(r =>
      String(r.testId) === String(testId)
    );
    const attempted = testResults.length;
    let totalPercent = 0;
    let passed = 0;
    let failed = 0;
    const passingPercentage = Number(test.passingPercentage ?? 50);
    testResults.forEach(r => {
      const percent = r.total
        ? Math.round((r.score / r.total) * 100)
        : 0;
      totalPercent += percent;
      if(percent >= passingPercentage){
        passed++;
      } else {
        failed++;
      }
    });
    const avgScore = attempted
      ? Math.round(totalPercent / attempted)
      : 0;
    const classStudents = myStudents.filter(s =>
      String(s.class || "").trim() === String(test.className || "").trim()
    );
    const totalStudents = classStudents.length;
    return {
      test,
      attempted,
      avgScore,
      passed,
      failed,
      totalStudents,
      notAttempted: Math.max(totalStudents - attempted, 0)
    };
  }
  function buildAnalyticsTable(selectedTestId){
    const filteredTests = selectedTestId === "all"
      ? myTests
      : myTests.filter(t => String(t._id) === String(selectedTestId));
    if(!filteredTests.length){
      return "<p style='color:#64748b;'>No test data found.</p>";
    }
    return \`
      <table style="
        width:100%;
        border-collapse:collapse;
        background:white;
      ">
        <tr style="background:#f8fafc;text-align:left;">
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Test</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Class</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Subject</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Avg Score</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Attempts</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Total Students</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Passed</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Failed</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Not Attempted</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Completion</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Created</th>
        </tr>
        \${filteredTests.map(t => {
          const stats = getTestStats(t._id);
          return \`
            <tr style="cursor:pointer;" onclick="go('/teacher-tests')">
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700;">
                \${escapeClientHtml(stats.test.name || "Untitled Test")}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${escapeClientHtml(stats.test.className || "N/A")}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${escapeClientHtml(stats.test.subject || "N/A")}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.avgScore}%
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.attempted}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.totalStudents}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:700;">
                \${stats.passed}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700;">
                \${stats.failed}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.notAttempted}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.totalStudents ? Math.round((stats.attempted / stats.totalStudents) * 100) : 0}%
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.test.createdAt ? new Date(stats.test.createdAt).toLocaleDateString() : "N/A"}
              </td>
            </tr>
          \`;
        }).join("")}
      </table>
    \`;
  }
  document.getElementById("dashboard").innerHTML = \`
<div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:20px;
      margin-bottom:24px;
    ">
      <div>
        <h1 style="margin:0 0 8px 0;font-size:32px;">
          Welcome, \${escapeClientHtml(user.name || "Teacher")}
        </h1>
        <p style="margin:0;color:#64748b;font-size:16px;">
          Here is your teaching overview.
        </p>
      </div>
      <button onclick="go('/create-test')" style="
        background:linear-gradient(135deg,#4f46e5,#6366f1);
        color:white;
        border:none;
        border-radius:12px;
        padding:14px 22px;
        cursor:pointer;
        font-size:15px;
        font-weight:800;
        box-shadow:0 4px 14px rgba(0,0,0,0.08);
      ">
        + New Test
      </button>
    </div>
<div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:20px;
      margin-bottom:28px;
      align-items:stretch;
    ">
      <div style="
        background:white;
        height:260px;
        border-radius:18px;
        box-shadow:0 4px 14px rgba(0,0,0,0.06);
        padding:22px;
        box-sizing:border-box;
        overflow-y:auto;
      ">
        <h2 style="margin:0 0 18px 0;font-size:22px;">Teacher Overview</h2>
        <div style="
          display:grid;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          gap:14px;
        ">
          <div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e5e7eb;">
            <b style="font-size:26px;">\${totalClassesAssigned}</b><br>
            <span style="color:#64748b;font-size:14px;">Classes Assigned</span>
          </div>
          <div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e5e7eb;">
            <b style="font-size:26px;">\${totalStudentsMapped}</b><br>
            <span style="color:#64748b;font-size:14px;">Students Mapped</span>
          </div>
          <div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e5e7eb;">
            <b style="font-size:26px;">\${totalTestsCreated}</b><br>
            <span style="color:#64748b;font-size:14px;">Tests Created</span>
          </div>
          <div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e5e7eb;">
            <b style="font-size:26px;">\${totalTestsCompleted}</b><br>
            <span style="color:#64748b;font-size:14px;">Tests Completed</span>
          </div>
          <div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid #e5e7eb;">
            <b style="font-size:26px;">\${totalSubjectsMapped}</b><br>
            <span style="color:#64748b;font-size:14px;">Subjects Mapped</span>
          </div>
        </div>
      </div>
            <div style="
        background:white;
        height:260px;
        max-height:260px;
        border-radius:18px;
        box-shadow:0 4px 14px rgba(0,0,0,0.06);
        overflow:hidden;
        display:flex;
        flex-direction:column;
      ">
        <div style="
          padding:18px 20px;
          border-bottom:1px solid #e5e7eb;
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-shrink:0;
        ">
          <h2 style="margin:0;font-size:22px;">Previous Tests</h2>
          <button onclick="go('/teacher-tests')" style="
            border:none;
            background:#4f46e5;
            color:white;
            padding:8px 12px;
            border-radius:8px;
            cursor:pointer;
          ">
            View All
          </button>
        </div>
                <div style="
          padding:10px 20px 18px 20px;
          overflow-y:auto;
          overflow-x:hidden;
          flex:1;
          max-height:180px;
        ">
          \${recentTestsHtml}
        </div>
      </div>
    </div>
    <div style="
      background:white;
      border-radius:18px;
      padding:20px;
      box-shadow:0 4px 14px rgba(0,0,0,0.06);
      margin-bottom:28px;
      height:360px;
      max-height:360px;
      box-sizing:border-box;
      display:flex;
      flex-direction:column;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:center;
        margin-bottom:18px;
        flex-wrap:wrap;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Test Analytics</h2>
          <p style="margin:0;color:#64748b;">
            Select a test to view performance details.
          </p>
        </div>
        <div style="position:relative;min-width:260px;">
          <button
            id="testFilterButton"
            type="button"
            onclick="toggleCustomDropdown('testFilter')"
            style="
              width:100%;
              padding:10px 12px;
              border-radius:10px;
              border:1px solid #cbd5e1;
              background:white;
              cursor:pointer;
              text-align:left;
              display:flex;
              justify-content:space-between;
              align-items:center;
              box-sizing:border-box;
            "
          >
            <span id="testFilterLabel">All Tests</span>
            <span>▾</span>
          </button>
          <div
            id="testFilterMenu"
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
              max-height:240px;
              overflow-y:auto;
              z-index:120;
            "
          ></div>
          <input id="testFilter" type="hidden" value="all">
        </div>
      </div>
      <div id="analyticsTable" style="
        flex:1;
        min-height:0;
        overflow-y:auto;
        overflow-x:auto;
      ">
        \${buildAnalyticsTable("all")}
      </div>
    </div>
  \`;
  window.selectTest = function(testId){
    const table = document.getElementById("analyticsTable");
    table.innerHTML = buildAnalyticsTable(testId);
    const filter = document.getElementById("testFilter");
    const label = document.getElementById("testFilterLabel");
    if(filter){
      filter.value = testId;
    }
    if(label){
      const selectedTest = myTests.find(t =>
        String(t._id) === String(testId)
      );
      label.textContent = selectedTest
        ? escapeClientHtml(selectedTest.name || "Untitled Test") + " - " + escapeClientHtml(selectedTest.className || "No Class")
        : "All Tests";
    }
  };
  setCustomDropdownOptions(
    "testFilter",
    [
      { value: "all", label: "All Tests" },
      ...myTests.map(test => ({
        value: String(test._id),
        label: (test.name || "Untitled Test") + " - " + (test.className || "No Class")
      }))
    ],
    selectTest
  );
  })
  .catch(err => {
    console.error("DASHBOARD LOAD ERROR:", err);
    document.getElementById("dashboard").innerHTML =
      "<p style='color:#dc2626;'>Failed to load dashboard. Please refresh.</p>";
  });
};
</script>
`;
    res.send(layout(content, "dashboard"));
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});
// ---------- TEACHER DASHBOARD DATA API ----------
router.get("/api/teacher-dashboard-data", authMiddleware, async (req, res) => {
  try {
    const ClassSubject = require("../models/ClassSubject");
    const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const schoolScopedFilter = schoolId
  ? { teacherId, schoolId }
  : { teacherId };
const classSubjects = await ClassSubject.find(schoolScopedFilter)
  .select("className subject teacherId")
  .lean();
const assignedClassNames = [...new Set(
  classSubjects
    .map(m => String(m.className || "").trim())
    .filter(Boolean)
)];
const classLookupFilter = {
  name: { $in: assignedClassNames },
  ...(schoolId ? { schoolId } : {})
};
const mappedClassDocs = assignedClassNames.map(className => ({
  _id: className,
  name: className,
  teacherId,
  studentIds: [],
  createdAt: null
}));
    const tests = await Test.find(schoolScopedFilter)
      .select("name subject className teacherId passingPercentage createdAt")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    const students = await Student.find(schoolScopedFilter)
      .select("studentId name class teacherId")
      .lean();
const classesRaw = assignedClassNames.length
  ? await ClassModel.find(classLookupFilter)
      .select("name createdAt")
      .sort({ name: 1 })
      .lean()
  : [];
const classDocMap = {};
classesRaw.forEach(c => {
  classDocMap[String(c.name || "").trim()] = c;
});
const classes = mappedClassDocs.map(mappedClass => ({
  ...(classDocMap[mappedClass.name] || mappedClass),
  teacherId
}));
    const results = await Result.find(schoolScopedFilter)
      .select("studentId testId testName teacherId score total date")
      .sort({ date: -1 })
      .limit(5000)
      .lean();
    res.json({
      tests,
      students,
      classes,
      results,
      classSubjects
    });
  } catch (err) {
    console.error("TEACHER DASHBOARD DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load dashboard data"
    });
  }
});
// ---------- VIEW STUDENTS ----------
router.get("/students", async (req, res) => {
  try {
    const studentsRaw = await Student.find();
    const teachers = await User.find({ role: "teacher" });
    const students = studentsRaw.map(s => ({
      name: s.name,
      class: s.class,
      studentId: s.studentId,
      teacherId: String(s.teacherId)
    }));
    const content = `
${teacherGuardScript()}
<h1 style="margin-bottom:20px;">Students</h1>
<table border="1" cellpadding="10"
style="
width:100%;
background:white;
border-collapse:collapse;
border-radius:12px;
overflow:hidden;
">
<tr>
<th>Name</th>
<th>Class</th>
<th>Student ID</th>
<th>Teacher</th>
</tr>
<tbody id="studentBody"></tbody>
</table>
<script>
window.onload = function(){
  function escapeClientHtml(value){
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
return window.location.replace("/");
}
  const students = ${safeJsonForScript(students)};
  const teachers = ${safeJsonForScript(teachers)};
  const teacherMap = {};
  teachers.forEach(t => {
    teacherMap[t._id] = t.name;
  });
  const filtered = students.filter(s =>
    String(s.teacherId) === String(teacherId)
  );
  const rows = filtered.map(s => \`
<tr
style="cursor:pointer;"
onclick='viewStudent(\${JSON.stringify(String(s.studentId || ""))})'
>
<td>\${escapeClientHtml(s.name)}</td>
<td>\${escapeClientHtml(s.class)}</td>
<td>\${escapeClientHtml(s.studentId)}</td>
<td>\${escapeClientHtml(teacherMap[s.teacherId] || "Unknown")}</td>
</tr>
\`).join("");
  document.getElementById("studentBody").innerHTML =
    rows || "<tr><td colspan='4'>No students found</td></tr>";
};
function viewStudent(studentId){
  window.location.replace(
    "/student?studentId=" + encodeURIComponent(studentId)
  );
}
</script>
`;
    res.send(layout(content, "students"));
  } catch (err) {
    console.error(err);
    res.send("Error loading students");
  }
});
// ---------- VIEW CLASSES ----------
router.get("/classes", async (req, res) => {
  try {
    const content = `
${teacherGuardScript()}
<div style="
display:flex;
justify-content:space-between;
align-items:center;
gap:14px;
margin-bottom:20px;
">
  <h1 style="margin:0;">Classes</h1>
  ${backButton("/teacher")}
</div>
<div style="
display:flex;
gap:12px;
align-items:center;
margin-bottom:20px;
flex-wrap:wrap;
">
  <div style="position:relative;min-width:180px;">
    <button
      id="classFilterButton"
      type="button"
      onclick="toggleCustomDropdown('classFilter')"
      style="
        width:100%;
        padding:10px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        background:white;
        cursor:pointer;
        text-align:left;
        display:flex;
        justify-content:space-between;
        align-items:center;
        box-sizing:border-box;
      "
    >
      <span id="classFilterLabel">All Classes</span>
      <span>▾</span>
    </button>
    <div
      id="classFilterMenu"
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
        z-index:120;
      "
    ></div>
    <input id="classFilter" type="hidden" value="all">
  </div>
  <input
    id="studentSearch"
    placeholder="Search student name or ID"
    style="
      padding:10px;
      border-radius:8px;
      border:1px solid #cbd5e1;
      min-width:280px;
    "
  />
  <button onclick="loadClasses(1)" style="
    padding:10px 14px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Search
  </button>
  <button onclick="clearClassFilters()" style="
    padding:10px 14px;
    background:#64748b;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Clear Filters
  </button>
</div>
<div id="classContainer"></div>
<div id="classPagination" style="margin-top:16px;"></div>
<script>
window.onload = function(){
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
function jsString(value){
  return JSON.stringify(String(value || ""));
}
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
  });
}
window.toggleCustomDropdown = function(inputId){
  const menu = document.getElementById(inputId + "Menu");
  if(!menu){
    return;
  }
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  menu.style.display = isOpen ? "none" : "block";
};
function setCustomDropdownOptions(inputId, options, onSelect){
  const input = document.getElementById(inputId);
  const menu = document.getElementById(inputId + "Menu");
  const label = document.getElementById(inputId + "Label");
  if(!input || !menu || !label){
    return;
  }
  const currentValue = input.value || options[0]?.value || "";
  menu.innerHTML = "";
  options.forEach(optionData => {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = optionData.label;
    option.style.width = "100%";
    option.style.padding = "10px 12px";
    option.style.border = "none";
    option.style.background = "white";
    option.style.textAlign = "left";
    option.style.cursor = "pointer";
    option.style.fontSize = "13px";
    option.style.boxSizing = "border-box";
    option.onmouseenter = function(){
      option.style.background = "#eef2ff";
    };
    option.onmouseleave = function(){
      option.style.background = "white";
    };
    option.onclick = function(){
      input.value = optionData.value;
      label.textContent = optionData.label;
      closeCustomDropdowns();
      if(typeof onSelect === "function"){
        onSelect(optionData.value);
      }
    };
    menu.appendChild(option);
  });
  const selectedOption = options.find(optionData =>
    String(optionData.value) === String(currentValue)
  );
  if(selectedOption){
    input.value = selectedOption.value;
    label.textContent = selectedOption.label;
  } else {
    input.value = options[0]?.value || "";
    label.textContent = options[0]?.label || "Select";
  }
}
document.addEventListener("click", function(event){
  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");
  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
return window.location.replace("/");
}
let classesData = [];
let studentsData = [];
let teachersData = [];
let resultsData = [];
let paginationData = null;
let dropdownReady = false;
window.loadClasses = function(page){
  const selectedClass = document.getElementById("classFilter").value || "all";
  const search = document.getElementById("studentSearch").value || "";
  const params = new URLSearchParams({
    studentPage: String(page || 1),
    studentLimit: "100",
    className: selectedClass,
    search
  });
  document.getElementById("classContainer").innerHTML =
    "<p style='color:#64748b;'>Loading classes...</p>";
  fetch("/api/classes-data?" + params.toString())
    .then(res => {
      if(!res.ok){
        throw new Error("Failed to load classes");
      }
      return res.json();
    })
    .then(data => {
      classesData = data.classes || [];
      studentsData = data.students || [];
      teachersData = data.teachers || [];
      resultsData = data.results || [];
      paginationData = data.pagination?.students || null;
      setupClassDropdown();
      renderClasses();
      renderPagination();
    })
    .catch(err => {
      console.error("CLASSES LOAD ERROR:", err);
      document.getElementById("classContainer").innerHTML =
        "<p style='color:#dc2626;'>Failed to load classes. Please refresh.</p>";
    });
};
function setupClassDropdown(){
  if(dropdownReady){
    return;
  }
  const uniqueNames = [...new Set(
    classesData.map(c => c.name).filter(Boolean)
  )];
  let selected = localStorage.getItem("selectedClass") || "all";
  if(selected !== "all" && !uniqueNames.includes(selected)){
    selected = "all";
    localStorage.setItem("selectedClass", "all");
  }
  setCustomDropdownOptions(
    "classFilter",
    [
      { value: "all", label: "All Classes" },
      ...uniqueNames.map(name => ({
        value: name,
        label: name
      }))
    ],
    function(value){
      localStorage.setItem("selectedClass", value);
      loadClasses(1);
    }
  );
  document.getElementById("classFilter").value = selected;
  document.getElementById("classFilterLabel").textContent =
    selected === "all" ? "All Classes" : selected;
  dropdownReady = true;
}
function renderClasses(){
  const teacherMap = {};
  teachersData.forEach(t => {
    teacherMap[t._id] = t.name;
  });
  const selected = document.getElementById("classFilter").value || "all";
const teacherResults = resultsData;
  const visibleClasses = classesData.filter(c => {
    if(selected === "all") return true;
    return String(c.name || "") === String(selected);
  });
  let html = "";
  visibleClasses.forEach(c => {
const classStudents = studentsData.filter(s =>
 String(s.class || "").trim().toUpperCase() ===
 String(c.name || "").trim().toUpperCase()
);
    const studentCards = classStudents.length
      ? classStudents.map(s => {
        const safeStudentId = jsString(s.studentId);
        return \`
<div
onclick='previewStudent(\${safeStudentId})'
style="
background:#f8fafc;
padding:12px;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
  <div style="font-weight:700;margin-bottom:4px;">
    \${escapeHtml(s.name || "No Name")}
  </div>
  <div style="font-size:12px;color:#64748b;">
    ID: \${escapeHtml(s.studentId)}
  </div>
</div>
\`;
      }).join("")
      : "<p style='color:gray;'>No students on this page</p>";
    html += \`
<div style="
background:white;
padding:20px;
margin-bottom:20px;
border-radius:16px;
box-shadow:0 4px 12px rgba(0,0,0,0.06);
">
  <div style="
    background:linear-gradient(135deg,#4f46e5,#6366f1);
    color:white;
    padding:18px 20px;
    border-radius:14px;
    margin-bottom:18px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:12px;
  ">
    <div>
      <h2 style="margin:0 0 6px 0;">Class: \${escapeHtml(c.name)}</h2>
      <div style="font-size:14px;opacity:0.9;">
        Teacher: \${escapeHtml(teacherMap[c.teacherId] || "Unknown")}
      </div>
    </div>
    <div style="
      background:rgba(255,255,255,0.18);
      padding:10px 14px;
      border-radius:10px;
      font-weight:700;
    ">
      Students on page: \${classStudents.length}
    </div>
  </div>
  <div style="
    display:grid;
    grid-template-columns:minmax(260px,360px) 1fr;
    gap:20px;
    align-items:start;
  ">
    <div>
      <h3 style="margin-top:0;">Students</h3>
      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        height:520px;
        overflow-y:auto;
        padding-right:6px;
      ">
        \${studentCards}
      </div>
    </div>
    <div
      id="preview-\${escapeHtml(c.name)}"
      class="studentPreview"
      style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        height:520px;
        overflow-y:auto;
        box-sizing:border-box;
      "
    >
      <p style="color:#64748b;margin:0;">
        Select a student to preview performance and download report.
      </p>
    </div>
  </div>
</div>
\`;
  });
  document.getElementById("classContainer").innerHTML =
    html || "<p style='color:#64748b;'>No matching students found.</p>";
  if(!classesData.length){
    document.getElementById("classContainer").innerHTML =
      "<p style='color:#64748b;'>No classes mapped to this teacher.</p>";
  }
  window.previewStudent = function(studentId){
    const student = studentsData.find(s =>
      String(s.studentId) === String(studentId)
    );
    if(!student){
      return;
    }
    const studentResults = teacherResults
      .filter(r => String(r.studentId) === String(studentId))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    document.querySelectorAll(".studentPreview").forEach(p => {
      p.innerHTML =
        "<p style='color:#64748b;margin:0;'>Select a student to preview performance and download report.</p>";
    });
    const box = document.getElementById("preview-" + student.class);
    if(!box){
      return;
    }
    const safeStudentId = jsString(student.studentId);
    const resultCards = studentResults.length
      ? studentResults.map(r => {
        const percent = r.total
          ? Math.round((r.score / r.total) * 100)
          : 0;
        const color =
          percent >= 70
            ? "#16a34a"
            : percent >= 40
            ? "#ca8a04"
            : "#dc2626";
        const date = r.date
          ? new Date(r.date).toLocaleString()
          : "N/A";
        return \`
<div
onclick='loadResultPreview(\${jsString(r.testId)}, \${safeStudentId}, \${jsString(student.class)})'
style="
background:white;
padding:14px;
margin:10px 0;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
  <div style="display:flex;justify-content:space-between;gap:10px;">
    <b>\${escapeHtml(r.testName || "Unnamed Test")}</b>
    <b style="color:\${color};">\${percent}%</b>
  </div>
  <div style="margin-top:6px;font-size:13px;">
    Score: <b>\${r.score}/\${r.total}</b>
  </div>
  <div style="font-size:12px;color:#64748b;margin-top:4px;">
    \${escapeHtml(date)}
  </div>
</div>
\`;
      }).join("")
      : "<p style='color:#64748b;'>No results found for this student.</p>";
    box.innerHTML = \`
<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:12px;
margin-bottom:15px;
">
  <div>
    <h2 style="margin:0 0 6px 0;">\${escapeHtml(student.name || "No Name")}</h2>
    <p style="margin:0;color:#64748b;">ID: \${escapeHtml(student.studentId)}</p>
    <p style="margin:4px 0 0 0;color:#64748b;">Class: \${escapeHtml(student.class)}</p>
  </div>
  <button onclick='downloadStudentReport(\${safeStudentId})' style="
    padding:10px 14px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Download Report
  </button>
</div>
<h3>Performance History</h3>
\${resultCards}
\`;
  };
}
function renderPagination(){
  const paginationBox = document.getElementById("classPagination");
  if(!paginationData || paginationData.totalPages <= 1){
    paginationBox.innerHTML = "";
    return;
  }
  paginationBox.innerHTML = \`
<div style="
display:flex;
gap:10px;
align-items:center;
justify-content:flex-end;
background:white;
padding:12px;
border-radius:10px;
box-shadow:0 4px 12px rgba(0,0,0,0.06);
">
  <button
    \${paginationData.hasPrevPage ? "" : "disabled"}
    onclick="loadClasses(\${paginationData.page - 1})"
    style="
      padding:8px 12px;
      border:none;
      border-radius:8px;
      background:#64748b;
      color:white;
      cursor:pointer;
      opacity:\${paginationData.hasPrevPage ? "1" : "0.5"};
    "
  >
    Previous
  </button>
  <span style="font-weight:700;color:#334155;">
    Page \${paginationData.page} of \${paginationData.totalPages}
  </span>
  <button
    \${paginationData.hasNextPage ? "" : "disabled"}
    onclick="loadClasses(\${paginationData.page + 1})"
    style="
      padding:8px 12px;
      border:none;
      border-radius:8px;
      background:#4f46e5;
      color:white;
      cursor:pointer;
      opacity:\${paginationData.hasNextPage ? "1" : "0.5"};
    "
  >
    Next
  </button>
</div>
\`;
}
window.clearClassFilters = function(){
  document.getElementById("studentSearch").value = "";
  document.getElementById("classFilter").value = "all";
  document.getElementById("classFilterLabel").textContent = "All Classes";
  localStorage.setItem("selectedClass", "all");
  loadClasses(1);
};
document.getElementById("studentSearch").addEventListener("keydown", function(event){
  if(event.key === "Enter"){
    loadClasses(1);
  }
});
window.downloadStudentReport = function(studentId){
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
  })
  .catch(() => alert("Download failed"));
};
window.loadResultPreview = function(testId, studentId, className){
  fetch(
    "/result?testId=" +
    encodeURIComponent(testId) +
    "&studentId=" +
    encodeURIComponent(studentId)
  )
  .then(res => res.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if(doc.body){
      doc.body.querySelectorAll("button").forEach(button => {
        if((button.textContent || "").trim() === "Back"){
          button.remove();
        }
      });
    }
    const body = doc.body ? doc.body.innerHTML : html;
    const box = document.getElementById("preview-" + className);
    if(box){
      box.innerHTML =
        '<div style="margin-bottom:12px;">' +
        '<button id="backToStudentButton" type="button" style="' +
        'padding:8px 12px;' +
        'background:#4f46e5;' +
        'color:white;' +
        'border:none;' +
        'border-radius:8px;' +
        'cursor:pointer;' +
        'font-weight:700;' +
        '">' +
        '← Back to Student' +
        '</button>' +
        '</div>' +
        '<div>' +
        body +
        '</div>';
      const backButton = document.getElementById("backToStudentButton");
      if(backButton){
        backButton.addEventListener("click", function(){
          previewStudent(studentId);
        });
      }
    }
  })
  .catch(() => alert("Failed to load result"));
};
loadClasses(1);
};
</script>
`;
    res.send(layout(content, "classes"));
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});
// ---------- CLASSES DATA API ----------
router.get("/api/classes-data", authMiddleware, async (req, res) => {
  try {
    const ClassSubject = require("../models/ClassSubject");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const schoolScopedFilter = schoolId
      ? { teacherId, schoolId }
      : { teacherId };
    const classSubjects = await ClassSubject.find(schoolScopedFilter)
      .select("className teacherId schoolId")
      .lean();
    const assignedClassNames = [...new Set(
      classSubjects
        .map(m => String(m.className || "").trim().toUpperCase())
        .filter(Boolean)
    )];
    const selectedClassName = String(req.query.className || "all")
      .trim()
      .toUpperCase();
    const search = String(req.query.search || "").trim();
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: escapedSearch, $options: "i" } },
            { studentId: { $regex: escapedSearch, $options: "i" } }
          ]
        }
      : {};
    const classFilter =
      selectedClassName && selectedClassName !== "ALL"
        ? { class: selectedClassName }
        : { class: { $in: assignedClassNames } };
    const classLookupFilter = {
      name: { $in: assignedClassNames },
      ...(schoolId ? { schoolId } : {})
    };
    const mappedClassDocs = assignedClassNames.map(className => ({
      _id: className,
      name: className,
      teacherId,
      studentIds: [],
      createdAt: null
    }));
    const studentPage = Math.max(parseInt(req.query.studentPage || "1"), 1);
    const studentLimit = Math.min(
      Math.max(parseInt(req.query.studentLimit || "100"), 1),
      500
    );
    const studentSkip = (studentPage - 1) * studentLimit;
    const studentQuery = {
      ...schoolScopedFilter,
      ...classFilter,
      ...searchFilter
    };
    const [classes, students, totalStudents, teachers, results] =
      await Promise.all([
        assignedClassNames.length
          ? ClassModel.find(classLookupFilter)
              .select("name createdAt")
              .sort({ name: 1 })
              .lean()
          : [],
        assignedClassNames.length
          ? Student.find(studentQuery)
              .select("studentId name class teacherId")
              .sort({ class: 1, name: 1 })
              .skip(studentSkip)
              .limit(studentLimit)
              .lean()
          : [],
        assignedClassNames.length
          ? Student.countDocuments(studentQuery)
          : 0,
        User.find({
          _id: teacherId,
          role: "teacher",
          ...(schoolId ? { schoolId } : {})
        })
          .select("name role")
          .lean(),
        Result.find(schoolScopedFilter)
          .select("studentId testId testName teacherId score total date")
          .sort({ date: -1 })
          .limit(500)
          .lean()
      ]);
    const classDocMap = {};
    classes.forEach(c => {
      classDocMap[String(c.name || "").trim().toUpperCase()] = c;
    });
    const mappedClasses = mappedClassDocs.map(mappedClass => ({
      ...(classDocMap[mappedClass.name] || mappedClass),
      teacherId
    }));
    res.json({
      classes: mappedClasses,
      students,
      teachers,
      results,
      pagination: {
        students: {
          page: studentPage,
          limit: studentLimit,
          total: totalStudents,
          totalPages: Math.ceil(totalStudents / studentLimit),
          hasNextPage: studentPage * studentLimit < totalStudents,
          hasPrevPage: studentPage > 1
        }
      }
    });
  } catch (err) {
    console.error("CLASSES DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load classes data"
    });
  }
});
// ---------- TEACHER SETTINGS ----------
router.get("/teacher-settings", authMiddleware, async (req, res) => {
  try {
    const School = require("../models/School");
    const ClassSubject = require("../models/ClassSubject");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const [teacher, school, mappings, students, tests, results] =
      await Promise.all([
        User.findOne({
          _id: teacherId,
          role: "teacher",
          ...(schoolId ? { schoolId } : {})
        })
          .select("name email role schoolId schoolCode")
          .lean(),
        schoolId
          ? School.findById(schoolId).lean()
          : null,
        ClassSubject.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("className subject teacherId schoolId schoolCode")
          .sort({ className: 1, subject: 1 })
          .lean(),
        Student.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("studentId name class teacherId")
          .lean(),
        Test.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("name subject className status createdAt")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Result.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("studentId testId score total date")
          .sort({ date: -1 })
          .limit(500)
          .lean()
      ]);
    const mappingRows = mappings.map(m => `
<tr>
  <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(m.className || "-")}</td>
  <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(m.subject || "-")}</td>
</tr>
`).join("");
    const uniqueClasses = [...new Set(
      mappings.map(m => m.className).filter(Boolean)
    )];
    const uniqueSubjects = [...new Set(
      mappings.map(m => m.subject).filter(Boolean)
    )];
    const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Teacher Settings</h1>
  ${backButton("/teacher")}
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">Account Info</h2>
  <p><b>Name:</b> ${escapeHtml(teacher?.name || "N/A")}</p>
  <p><b>Email:</b> ${escapeHtml(teacher?.email || "N/A")}</p>
  <p><b>Role:</b> ${escapeHtml(teacher?.role || "N/A")}</p>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">School Info</h2>
  <p><b>School Name:</b> ${escapeHtml(school?.name || "N/A")}</p>
  <p><b>School Code:</b> ${escapeHtml(school?.code || req.user.schoolCode || "N/A")}</p>
  <div style="
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:14px;
    margin-top:18px;
  ">
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${uniqueClasses.length}</b><br>Assigned Classes
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${uniqueSubjects.length}</b><br>Assigned Subjects
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${students.length}</b><br>Mapped Students
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${tests.length}</b><br>Tests Created
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${results.length}</b><br>Recent Results
    </div>
  </div>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">My Class and Subject Mappings</h2>
  <p style="color:#64748b;">This is read-only. Contact your school admin to change mappings.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;">
    <tr style="background:#f8fafc;">
      <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Class</th>
      <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Subject</th>
    </tr>
    ${mappingRows || "<tr><td colspan='2' style='padding:10px;border:1px solid #e5e7eb;'>No mappings found</td></tr>"}
  </table>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
">
  <h2 style="margin-top:0;">Future Settings</h2>
  <p style="color:#64748b;">Change password, notifications, default test duration, and default timer settings can be added later.</p>
</div>
`;
    res.send(layout(content, "settings"));
  } catch (err) {
    console.error("TEACHER SETTINGS ERROR:", err);
    res.send("Error loading teacher settings");
  }
});
module.exports = router;