const express = require("express");
const router = express.Router();
const Test = require("../../models/Test");
const Student = require("../../models/Student");
const ClassModel = require("../../models/Class");
const User = require("../../models/User");
const Result = require("../../models/Result");
const ClassSubject = require("../../models/ClassSubject");
const layout = require("../../views/layout");
const backButton = require("../../views/backButton");
const authMiddleware = require("../../middleware/auth");
const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../../utils/html");

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
// ---------- TEACHER DASHBOARD ----------
router.get("/teacher", authMiddleware, async (req, res) => {
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
    option.addEventListener("click", function(){
      input.value = optionData.value;
      label.textContent = optionData.label;
      closeCustomDropdowns();
      if(typeof onSelect === "function"){
        onSelect(optionData.value);
      }
    });
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
      <div
        class="recent-test-card"
        data-test-id="\${escapeClientHtml(t._id)}"
        style="
          padding:12px 0;
          border-bottom:1px solid #e5e7eb;
          cursor:pointer;
        "
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
            <tr class="teacher-tests-link" style="cursor:pointer;">
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
      <button id="createTestButton" style="
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
          <button id="teacherTestsButton" style="
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
            class="teacher-dropdown-toggle"
            data-dropdown-id="testFilter"
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
    document.addEventListener("click", function(event){
    const recentTestCard = event.target.closest(".recent-test-card");
    if(recentTestCard){
      selectTest(recentTestCard.dataset.testId || "all");
      return;
    }

    const teacherTestsLink = event.target.closest(".teacher-tests-link");
    if(teacherTestsLink){
      go("/teacher-tests");
      return;
    }

    const createTestButton = event.target.closest("#createTestButton");
    if(createTestButton){
      go("/create-test");
      return;
    }

    const teacherTestsButton = event.target.closest("#teacherTestsButton");
    if(teacherTestsButton){
      go("/teacher-tests");
    }
  });
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
    const ClassSubject = require("../../models/ClassSubject");
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

module.exports = router;
