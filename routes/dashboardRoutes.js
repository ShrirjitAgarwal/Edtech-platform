const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const { readJSON } = require("../utils/file"); // keep this (for tests.json)
// ---------- NAVBAR ----------
function navbar(){
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
     <button onclick="go('/')" class="nav-btn">Home</button>
     <button onclick="go('/tests')" class="nav-btn">Tests</button>
     <button onclick="go('/library')" class="nav-btn">Library</button>
     <button onclick="go('/teacher')" class="nav-btn">Teacher</button>
     <button onclick="go('/question-builder')" class="nav-btn">Create Question</button>
     <button onclick="go('/dashboard')" class="nav-btn">Dashboard</button>
     <button onclick="logout()" class="nav-btn logout">Logout</button>
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
</script>
 `;
}
// ---------- GLOBAL LAYOUT ----------
function layout(content, active = "") {
  return `
  <body style="margin:0;font-family:Arial;">
    <div style="display:flex;height:100vh;">
      ${sidebar(active)}
      <div style="
        flex:1;
        padding:30px;
        background:#eef2ff;
        overflow:auto;
      ">
        ${content}
      </div>
    </div>
    <script>
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user || user.role !== "teacher") {
        window.location.replace("/");
      }
      function go(path){
        window.location.replace(path);
      }
function logout(){
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.replace("/");
  });
}
      function toggleManage(){
        const menu = document.getElementById("manageMenu");
        if (!menu) return;
        menu.style.display =
          menu.style.display === "none" ? "block" : "none";
      }
    </script>
  </body>
  `;
}
// ---------- DASHBOARD ----------
router.get("/dashboard", async (req, res) => {
  const Test = require("../models/Test");
const allResults = await Result.find()
  .select("studentId name class testId testName teacherId score total date")
  .sort({ date: -1 })
  .limit(5000)
  .lean();
const tests = await Test.find()
  .select("name teacherId")
  .sort({ createdAt: -1 })
  .limit(1000)
  .lean();
  const selectedTest = req.query.test || "all";
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
      <input id="testFilter" type="hidden" value="${selectedTest}">
    </div>
    <!-- SUMMARY -->
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
    <button onclick="sortScores()">Sort by Highest Score</button>
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
// 🚫 block back button
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
  window.location.replace("/");
};
const teacherId = user._id;
const allResults = ${JSON.stringify(allResults)};
const tests = ${JSON.stringify(tests)};
const selectedTest = "${selectedTest}";
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
// FILTER
let filtered = allResults.filter(r => r.teacherId === teacherId);
if(selectedTest !== "all"){
  filtered = filtered.filter(r => String(r.testId) === String(selectedTest));
}
// SUMMARY
let attempts = filtered.length;
let avg = attempts ? filtered.reduce((s,r)=>s+r.score,0)/attempts : 0;
let topScorer = attempts ? filtered.reduce((max,r)=> r.score > max.score ? r : max) : null;
let passed = filtered.filter(r => (r.score / r.total) >= 0.5).length;
let passRate = attempts ? Math.round((passed / attempts) * 100) + "%" : "-";
let selectedTestObj = tests.find(t => String(t._id) === String(selectedTest));
document.getElementById("summaryTestName").innerText =
  selectedTest === "all" ? "All Tests" : (selectedTestObj ? selectedTestObj.name : "-");
document.getElementById("summaryAttempts").innerText = attempts;
document.getElementById("summaryAvg").innerText = avg.toFixed(2);
document.getElementById("summaryTop").innerText = topScorer ? topScorer.score : "-";
document.getElementById("summaryPass").innerText = passRate;
// CLASS STATS
let byClass = {};
filtered.forEach(r => {
  const cls = r.class || "Unknown";
  if(!byClass[cls]) byClass[cls] = [];
  byClass[cls].push(r.score);
});
document.getElementById("classStats").innerHTML =
  Object.entries(byClass).map(([cls,scores]) => {
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
    return "<div><b>"+cls+"</b> → "+avg.toFixed(2)+"</div>";
  }).join("") || "<p>No class data</p>";
// STUDENT GROUPING
let byStudent = {};
filtered.forEach(r => {
  const id = r.studentId || "unknown";
  if(!byStudent[id]){
    byStudent[id] = { name: r.name, scores: [] };
  }
  byStudent[id].scores.push(r.score);
});
document.getElementById("studentStats").innerHTML =
  Object.values(byStudent).map(s => {
    const attempts = s.scores.length;
    const avg = s.scores.reduce((a,b)=>a+b,0)/attempts;
    const best = Math.max(...s.scores);
    return \`
      <div style="background:#f9fafb;padding:12px;margin:10px 0;border-radius:8px;">
        <b>\${s.name}</b><br>
        Attempts: \${attempts}<br>
        Average: \${avg.toFixed(2)}<br>
        Best: \${best}
      </div>
    \`;
  }).join("") || "<p>No student data</p>";
// TABLE
const rows = filtered.map(r => \`
<tr
data-test="\${r.testId}"
data-student-id="\${r.studentId || ""}"
style="cursor:pointer;"
>
<td style="padding:14px;text-align:center;">\${r.studentId || "-"}</td>
<td style="padding:14px;text-align:center;">\${r.name}</td>
<td style="padding:14px;text-align:center;">\${r.testName}</td>
<td style="padding:14px;text-align:center;font-weight:600;">\${r.score}/\${r.total}</td>
</tr>
\`).join("");
document.getElementById("resultsBody").innerHTML = rows;
// CLICKABLE ROWS
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
// SORT
function sortScores(){
  const table = document.querySelector("table");
  const rows = Array.from(table.rows).slice(1);
  rows.sort((a,b) => {
    const aScore = parseInt(a.cells[3].innerText);
const bScore = parseInt(b.cells[3].innerText);
    return bScore - aScore;
  });
  rows.forEach(row => table.appendChild(row));
}
</script>
    </div>
    </div>
  </body>
  `);
});
module.exports = router;