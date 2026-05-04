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
     <button onclick="go('/bulk-upload')" class="nav-btn">Bulk Upload</button>
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
     function go(path){ window.location.href = path; }
     function logout(){
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("role"); // keep this if you're using it
  window.location.replace("/");
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
        localStorage.clear();
        window.location.replace("/");
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
  const allResults = await Result.find();
  const tests = await Test.find();
  const selectedTest = req.query.test || "all";
  res.send(`
  <body style="background:linear-gradient(to bottom, #eef2ff, #f8fafc);font-family:Arial;margin:0;">
    ${navbar()}
    <div style="max-width:1100px;margin:30px auto;padding:0 10px;">
    <div style="background:white;padding:25px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,0.08);">
    <h1>Dashboard</h1>
    <form style="margin:15px 0;">
      <select name="test" onchange="this.form.submit()">
        <option value="all">All Tests</option>
        ${tests.map(t => `
          <option value="${t._id}" ${String(t._id) === selectedTest ? "selected" : ""}>
            ${t.name}
          </option>
        `).join("")}
      </select>
    </form>
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
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
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
<tr data-test="\${r.testId}" data-name="\${r.name}" style="cursor:pointer;">
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
    const name = this.getAttribute("data-name");
    window.location.href =
      "/result?testId=" + testId + "&name=" + encodeURIComponent(name);
  });
});
// SORT
function sortScores(){
  const table = document.querySelector("table");
  const rows = Array.from(table.rows).slice(1);
  rows.sort((a,b) => {
    const aScore = parseInt(a.cells[2].innerText);
    const bScore = parseInt(b.cells[2].innerText);
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