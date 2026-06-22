const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const authMiddleware = require("../middleware/auth");
const { readJSON } = require("../utils/file"); // keep this (for tests.json)
const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../utils/html");
// ---------- NAVBAR ----------
function navbar() {
  return `
<div style="
 position:sticky;
 top:0;
 z-index:1000;
 background:#333;
 padding:10px;
 display:flex;
 gap:10px;
 width:100%;
 box-sizing:border-box;
">
  <button data-path="/" class="nav-btn dashboard-nav-btn">Home</button>
  <button data-path="/tests" class="nav-btn dashboard-nav-btn">Tests</button>
  <button data-path="/library" class="nav-btn dashboard-nav-btn">Library</button>
  <button data-path="/teacher" class="nav-btn dashboard-nav-btn">Teacher</button>
  <button data-path="/question-builder" class="nav-btn dashboard-nav-btn">Create Question</button>
  <button data-path="/dashboard" class="nav-btn dashboard-nav-btn">Dashboard</button>
  <button id="dashboardLogoutButton" class="nav-btn logout">Logout</button>
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
  window.location.href = path;
}
function logout(){
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.href = "/";
  });
}

document.addEventListener("click", function(event){
  const navButton = event.target.closest(".dashboard-nav-btn");
  if(navButton){
    go(navButton.dataset.path || "/");
    return;
  }

  const logoutButton = event.target.closest("#dashboardLogoutButton");
  if(logoutButton){
    logout();
  }
});
</script>
`;
}
// ---------- DASHBOARD ----------
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return res.status(403).send("Access denied");
    }
    const Test = require("../models/Test");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const teacherScopedFilter = {
      teacherId,
      ...(schoolId ? { schoolId } : {})
    };
    const allResults = await Result.find(teacherScopedFilter)
      .select("studentId name class testId testName teacherId score total date schoolId schoolCode")
      .sort({ date: -1 })
      .limit(5000)
      .lean();
    const tests = await Test.find(teacherScopedFilter)
      .select("name teacherId schoolId schoolCode")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    const selectedTest = String(req.query.test || "all").trim();
    res.send(`
<body style="background:linear-gradient(to bottom, #eef2ff, #f8fafc);font-family:Arial;margin:0;">
  ${navbar()}
  <div style="max-width:1100px;margin:30px auto;padding:0 10px;">
    <div style="background:white;padding:25px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,0.08);">
      <h1>Dashboard</h1>
      <div style="margin:15px 0;position:relative;width:260px;">
        <button
          id="testFilterButton"
          type="button"
          class="dashboard-dropdown-toggle"
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
        <input id="testFilter" type="hidden" value="${escapeAttribute(selectedTest)}">
      </div>
      <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap;">
        <div style="flex:1;padding:18px;background:#eef2ff;border-radius:12px;text-align:center;">
          <div>Test</div>
          <div id="summaryTestName">-</div>
        </div>
        <div style="flex:1;padding:18px;background:#eef2ff;border-radius:12px;text-align:center;">
          <div>Attempts</div>
          <div id="summaryAttempts">0</div>
        </div>
        <div style="flex:1;padding:18px;background:#eef2ff;border-radius:12px;text-align:center;">
          <div>Average</div>
          <div id="summaryAvg">0</div>
        </div>
        <div style="flex:1;padding:18px;background:#eef2ff;border-radius:12px;text-align:center;">
          <div>Highest</div>
          <div id="summaryTop">0</div>
        </div>
        <div style="flex:1;padding:18px;background:#eef2ff;border-radius:12px;text-align:center;">
          <div>Pass Rate</div>
          <div id="summaryPass">0%</div>
        </div>
      </div>
      <h2>Class Performance</h2>
      <div id="classStats"></div>
      <h2>Student Performance</h2>
      <div id="studentStats"></div>
      <h2>Student Results</h2>
      <button id="sortScoresButton">Sort by Highest Score</button>
      <table style="width:100%;margin-top:10px;">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Name</th>
            <th>Test</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody id="resultsBody"></tbody>
      </table>
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
  window.location.replace("/");
} else if(user.role !== "teacher"){
  window.location.replace("/");
}
window.history.pushState(null, null, window.location.href);
window.onpopstate = function(){
  window.location.replace("/");
};
const teacherId = ${safeJsonForScript(teacherId)};
const allResults = ${safeJsonForScript(allResults)};
const tests = ${safeJsonForScript(tests)};
const selectedTest = ${safeJsonForScript(selectedTest)};
function escapeClientHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
function escapeClientAttribute(value){
  return escapeClientHtml(value).replace(new RegExp(String.fromCharCode(96), "g"), "&#096;");
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
document.addEventListener("click", function(event){
  const dropdownToggle = event.target.closest(".dashboard-dropdown-toggle");
  if(dropdownToggle){
    toggleCustomDropdown(dropdownToggle.dataset.dropdownId || "");
    return;
  }

  const sortScoresButton = event.target.closest("#sortScoresButton");
  if(sortScoresButton){
    sortScores();
    return;
  }

  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");
  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
setCustomDropdownOptions(
  "testFilter",
  [
    { value: "all", label: "All Tests" },
    ...tests.map(test => ({
      value: String(test._id),
      label: test.name || "Untitled Test"
    }))
  ],
  function(value){
    window.location.href =
      "/dashboard?test=" + encodeURIComponent(value);
  }
);
let filtered = allResults.filter(result =>
  String(result.teacherId) === String(teacherId)
);
if(selectedTest !== "all"){
  filtered = filtered.filter(result =>
    String(result.testId) === String(selectedTest)
  );
}
const attempts = filtered.length;
const avg = attempts
  ? filtered.reduce(
      (sum, result) => sum + (Number(result.score) || 0),
      0
    ) / attempts
  : 0;
const topScorer = attempts
  ? filtered.reduce((max, result) =>
      (Number(result.score) || 0) > (Number(max.score) || 0)
        ? result
        : max
    )
  : null;
const passed = filtered.filter(result => {
  const total = Number(result.total) || 0;
  if(!total){
    return false;
  }
  return (Number(result.score) || 0) / total >= 0.5;
}).length;
const passRate =
  attempts
    ? Math.round((passed / attempts) * 100) + "%"
    : "-";
const selectedTestObj = tests.find(test =>
  String(test._id) === String(selectedTest)
);
document.getElementById("summaryTestName").innerText =
  selectedTest === "all"
    ? "All Tests"
    : selectedTestObj
    ? selectedTestObj.name
    : "-";
document.getElementById("summaryAttempts").innerText = attempts;
document.getElementById("summaryAvg").innerText = avg.toFixed(2);
document.getElementById("summaryTop").innerText =
  topScorer ? topScorer.score : "-";
document.getElementById("summaryPass").innerText = passRate;
const byClass = {};
filtered.forEach(result => {
  const className = result.class || "Unknown";
  if(!byClass[className]){
    byClass[className] = [];
  }
  byClass[className].push(Number(result.score) || 0);
});
document.getElementById("classStats").innerHTML =
  Object.entries(byClass).map(([className, scores]) => {
    const classAverage =
      scores.reduce((a, b) => a + b, 0) / scores.length;
    return "" +
      "<div><b>" +
      escapeClientHtml(className) +
      "</b> → " +
      escapeClientHtml(classAverage.toFixed(2)) +
      "</div>";
  }).join("") || "<p>No class data</p>";
const byStudent = {};
filtered.forEach(result => {
  const studentId = result.studentId || "unknown";
  if(!byStudent[studentId]){
    byStudent[studentId] = {
      name: result.name,
      scores: []
    };
  }
  byStudent[studentId].scores.push(Number(result.score) || 0);
});
document.getElementById("studentStats").innerHTML =
  Object.values(byStudent).map(student => {
    const studentAttempts = student.scores.length;
    const studentAverage =
      student.scores.reduce((a, b) => a + b, 0) / studentAttempts;
    const best = Math.max(...student.scores);
    return "" +
      "<div style='background:#f9fafb;padding:12px;margin:10px 0;border-radius:8px;'>" +
        "<b>" +
        escapeClientHtml(student.name) +
        "</b><br>" +
        "Attempts: " +
        escapeClientHtml(studentAttempts) +
        "<br>" +
        "Average: " +
        escapeClientHtml(studentAverage.toFixed(2)) +
        "<br>" +
        "Best: " +
        escapeClientHtml(best) +
      "</div>";
  }).join("") || "<p>No student data</p>";
const rows = filtered.map(result => {
  return "" +
    "<tr " +
      "data-test='" +
      escapeClientAttribute(result.testId) +
      "' " +
      "data-student-id='" +
      escapeClientAttribute(result.studentId || "") +
      "' " +
      "style='cursor:pointer;'" +
    ">" +
      "<td style='padding:14px;text-align:center;'>" +
        escapeClientHtml(result.studentId || "-") +
      "</td>" +
      "<td style='padding:14px;text-align:center;'>" +
        escapeClientHtml(result.name) +
      "</td>" +
      "<td style='padding:14px;text-align:center;'>" +
        escapeClientHtml(result.testName) +
      "</td>" +
      "<td style='padding:14px;text-align:center;font-weight:600;'>" +
        escapeClientHtml(result.score) +
        "/" +
        escapeClientHtml(result.total) +
      "</td>" +
    "</tr>";
}).join("");
document.getElementById("resultsBody").innerHTML = rows;
document.querySelectorAll("#resultsBody tr").forEach(row => {
  row.addEventListener("click", function(){
    const testId = this.getAttribute("data-test");
    const studentId = this.getAttribute("data-student-id");
    if(!testId || !studentId){
      alert("Result details are missing");
      return;
    }
    window.location.href =
      "/result?testId=" +
      encodeURIComponent(testId) +
      "&studentId=" +
      encodeURIComponent(studentId);
  });
});
function sortScores(){
  const table = document.querySelector("table");
  const rows = Array.from(table.rows).slice(1);
  rows.sort((a, b) => {
    const aScore = parseInt(a.cells[3].innerText, 10);
    const bScore = parseInt(b.cells[3].innerText, 10);
    return bScore - aScore;
  });
  rows.forEach(row => table.appendChild(row));
}
</script>
    </div>
  </div>
</body>
`);
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).send("Error loading dashboard");
  }
});
module.exports = router;