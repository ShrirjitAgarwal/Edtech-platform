const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
// ---------- LIBRARY ----------
router.get("/library", authMiddleware, async (req, res) => {
  try {
    const content = `
<div style="
display:flex;
justify-content:space-between;
align-items:center;
gap:14px;
margin-bottom:20px;
">
<h1 style="margin:0;">Questions Library</h1>
<div style="display:flex;gap:10px;align-items:center;">
${backButton("/teacher")}
<button id="libraryCreateQuestionButton" style="
padding:10px 14px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
+ Create Question
</button>
<button id="libraryManageQuestionsButton" style="
padding:10px 14px;
background:#0f172a;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
Manage Questions
</button>
</div>
</div>
<div style="
background:white;
padding:18px;
border-radius:14px;
box-shadow:0 4px 12px rgba(0,0,0,0.08);
margin-bottom:14px;
width:100%;
max-width:1120px;
box-sizing:border-box;
">
<div style="
display:grid;
grid-template-columns:220px 140px 140px 140px 140px 160px;
gap:12px;
justify-content:flex-start;
">
<div>
<label style="font-size:13px;">Search</label><br>
<input
id="questionSearch"
placeholder="Search questions"
oninput="scheduleLibrarySearch()"
style="
width:100%;
padding:6px 8px;
border-radius:8px;
border:1px solid #cbd5e1;
font-size:13px;
box-sizing:border-box;
"
/>
</div>
<div>
<label style="font-size:13px;">Subject</label><br>
<div style="position:relative;width:100%;">
  <button
    id="subjectFilterButton"
    type="button"
    class="library-dropdown-toggle"
    data-dropdown-id="subjectFilter"
    style="
      width:100%;
      padding:7px 8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      font-size:13px;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="subjectFilterLabel">All</span>
    <span>▾</span>
  </button>
  <div
    id="subjectFilterMenu"
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
      z-index:100;
    "
  ></div>
  <input id="subjectFilter" type="hidden" value="all">
</div>
</div>
<div>
<label style="font-size:13px;">Board</label><br>
<div style="position:relative;width:100%;">
  <button
    id="boardFilterButton"
    type="button"
    class="library-dropdown-toggle"
    data-dropdown-id="boardFilter"
    style="
      width:100%;
      padding:7px 8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      font-size:13px;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="boardFilterLabel">All</span>
    <span>▾</span>
  </button>
  <div
    id="boardFilterMenu"
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
      z-index:100;
    "
  ></div>
  <input id="boardFilter" type="hidden" value="all">
</div>
</div>
<div>
<label style="font-size:13px;">Difficulty</label><br>
<div style="position:relative;width:100%;">
  <button
    id="difficultyFilterButton"
    type="button"
    class="library-dropdown-toggle"
    data-dropdown-id="difficultyFilter"
    style="
      width:100%;
      padding:7px 8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      font-size:13px;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="difficultyFilterLabel">All</span>
    <span>▾</span>
  </button>
  <div
    id="difficultyFilterMenu"
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
      z-index:100;
    "
  ></div>
  <input id="difficultyFilter" type="hidden" value="all">
</div>
</div>
<div>
<label style="font-size:13px;">Attempt</label><br>
<div style="position:relative;width:100%;">
  <button
    id="attemptFilterButton"
    type="button"
    class="library-dropdown-toggle"
    data-dropdown-id="attemptFilter"
    style="
      width:100%;
      padding:7px 8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      font-size:13px;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="attemptFilterLabel">All</span>
    <span>▾</span>
  </button>
  <div
    id="attemptFilterMenu"
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
      z-index:100;
    "
  ></div>
  <input id="attemptFilter" type="hidden" value="all">
</div>
</div>
<div>
<label style="font-size:13px;">Library Type</label><br>
<div style="position:relative;width:100%;">
  <button
    id="scopeFilterButton"
    type="button"
    class="library-dropdown-toggle"
    data-dropdown-id="scopeFilter"
    style="
      width:100%;
      padding:7px 8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      font-size:13px;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="scopeFilterLabel">All</span>
    <span>▾</span>
  </button>
  <div
    id="scopeFilterMenu"
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
      z-index:100;
    "
  ></div>
  <input id="scopeFilter" type="hidden" value="all">
</div>
</div>
</div>
</div>
<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:22px;
align-items:stretch;
height:calc(100vh - 210px);
min-height:620px;
">
<div style="
background:white;
padding:20px;
border-radius:14px;
box-shadow:0 4px 12px rgba(0,0,0,0.08);
height:100%;
box-sizing:border-box;
overflow-y:auto;
">
<h2 style="margin-top:0;">Questions</h2>
<div id="libraryList"></div>
<div
  id="libraryPagination"
  style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    margin-top:14px;
    padding-top:12px;
    border-top:1px solid #e5e7eb;
  "
></div>
</div>
<div
id="questionPreview"
style="
background:white;
padding:22px;
border-radius:14px;
box-shadow:0 4px 12px rgba(0,0,0,0.08);
height:100%;
overflow-y:auto;
box-sizing:border-box;
"
>
<h2 style="margin-top:0;">Question Preview</h2>
<p style="color:#64748b;">
Select a question to preview it here.
</p>
</div>
</div>
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user || user.role !== "teacher"){
window.location.replace("/");
}
const teacherId = user._id || user.id;
let questions = [];
let libraryPage = 1;
let libraryLimit = 50;
let libraryPagination = {
page: 1,
limit: 50,
total: 0,
totalPages: 1,
hasNextPage: false,
hasPrevPage: false
};
let librarySearchTimer = null;
function escapeHtml(value){
const div = document.createElement("div");
div.textContent = String(value || "");
return div.innerHTML;
}
function jsString(value){
return JSON.stringify(String(value || ""));
}
function safeText(value, fallback){
const text = String(value || "").trim();
return text || fallback;
}
function closeCustomDropdowns(){
document.querySelectorAll("[id$='Menu']").forEach(menu => {
if(menu && menu.id.includes("FilterMenu")){
menu.style.display = "none";
}
});
}
function toggleCustomDropdown(inputId){
const menu = document.getElementById(inputId + "Menu");
if(!menu){
return;
}
const isOpen = menu.style.display === "block";
closeCustomDropdowns();
menu.style.display = isOpen ? "none" : "block";
}
function setCustomDropdownOptions(inputId, options){
const input = document.getElementById(inputId);
const menu = document.getElementById(inputId + "Menu");
const label = document.getElementById(inputId + "Label");
if(!input || !menu || !label){
return;
}
const currentValue = input.value || "all";
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
loadLibrary(1);
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
input.value = options[0]?.value || "all";
label.textContent = options[0]?.label || "All";
}
}
document.addEventListener("click", function(event){
const clickedInsideDropdown = event.target.closest("[id$='Button']") ||
event.target.closest("[id$='Menu']");
if(!clickedInsideDropdown){
closeCustomDropdowns();
}
});
setCustomDropdownOptions("difficultyFilter", [
{ value: "all", label: "All" },
{ value: "easy", label: "Easy" },
{ value: "medium", label: "Medium" },
{ value: "hard", label: "Hard" }
]);
setCustomDropdownOptions("attemptFilter", [
{ value: "all", label: "All" },
{ value: "attempted", label: "Attempted" },
{ value: "not_attempted", label: "Not Attempted" }
]);
setCustomDropdownOptions("scopeFilter", [
{ value: "all", label: "All" },
{ value: "public", label: "Platform Questions" },
{ value: "teacher", label: "My Questions" }
]);
loadLibrary(1);
function getLibraryParams(page){
const params = new URLSearchParams();
params.set("page", String(page || libraryPage || 1));
params.set("limit", String(libraryLimit));
const searchValue =
(document.getElementById("questionSearch")?.value || "")
.trim();
const subject = document.getElementById("subjectFilter")?.value || "all";
const board = document.getElementById("boardFilter")?.value || "all";
const scope = document.getElementById("scopeFilter")?.value || "all";
const difficulty = document.getElementById("difficultyFilter")?.value || "all";
const attempt = document.getElementById("attemptFilter")?.value || "all";
if(searchValue){
params.set("search", searchValue);
}
if(subject !== "all"){
params.set("subject", subject);
}
if(board !== "all"){
params.set("board", board);
}
if(scope !== "all"){
params.set("scope", scope);
}
if(difficulty !== "all"){
params.set("difficulty", difficulty);
}
if(attempt !== "all"){
params.set("attempt", attempt);
}
return params;
}
function scheduleLibrarySearch(){
clearTimeout(librarySearchTimer);
librarySearchTimer = setTimeout(function(){
loadLibrary(1);
}, 300);
}
function loadLibrary(page){
libraryPage = page || 1;
document.getElementById("libraryList").innerHTML =
"<p style='color:#64748b;'>Loading questions...</p>";
fetch("/api/library-data?" + getLibraryParams(libraryPage).toString())
.then(res => {
if(!res.ok){
throw new Error("Failed to load library");
}
return res.json();
})
.then(data => {
questions = data.questions || [];
libraryPagination = data.pagination || libraryPagination;
if(data.filters){
populateFilters(data.filters);
}
renderLibrary();
renderPagination();
})
.catch(err => {
console.error("LIBRARY LOAD ERROR:", err);
document.getElementById("libraryList").innerHTML =
"<p style='color:#dc2626;'>Failed to load questions. Please refresh.</p>";
});
}
function populateFilters(filters){
const subjects = (filters?.subjects || []).filter(Boolean).sort();
const boards = (filters?.boards || []).filter(Boolean).sort();
setCustomDropdownOptions(
"subjectFilter",
[
{ value: "all", label: "All" },
...subjects.map(subject => ({
value: subject,
label: subject
}))
]
);
setCustomDropdownOptions(
"boardFilter",
[
{ value: "all", label: "All" },
...boards.map(board => ({
value: board,
label: board
}))
]
);
}
function buildQuestionCard(q){
const sourceLabel =
q.scope === "teacher"
? "My Question"
: "Platform Question";
const questionId = jsString(q._id);
const questionText = escapeHtml(safeText(q.question, "Untitled Question"));
const subjectText = escapeHtml(safeText(q.subject || q.category, "No Subject"));
const boardText = escapeHtml(safeText(q.board, "Other"));
const difficultyText = escapeHtml(
q.difficulty
? String(q.difficulty).charAt(0).toUpperCase() + String(q.difficulty).slice(1)
: "No Difficulty"
);
const attempted = Number(q.analytics?.attempted || 0);
const completed = Number(q.analytics?.correct || 0);
const incomplete = Number(q.analytics?.incorrect || 0);
return "" +
"<div class='library-question-card' data-question-id=" + questionId + " style='" +
"background:#f8fafc;" +
"padding:18px;" +
"margin:12px 0;" +
"border-radius:12px;" +
"border:1px solid #e5e7eb;" +
"display:flex;" +
"justify-content:space-between;" +
"align-items:center;" +
"gap:16px;" +
"cursor:pointer;" +
"'>" +
"<div>" +
"<p style='margin:0 0 8px 0;font-weight:600;'>" +
questionText +
"</p>" +
"<p style='margin:0;color:#666;font-size:14px;'>" +
subjectText + " | " +
boardText + " | " +
difficultyText + " | " +
escapeHtml(sourceLabel) +
"</p>" +
"<p style='margin:6px 0 0 0;color:#64748b;font-size:13px;'>" +
"Attempted: " + attempted + " | " +
"Completed: " + completed + " | " +
"Incomplete: " + incomplete +
"</p>" +
"</div>" +
"<button class='library-add-to-test-button' data-question-id=" + questionId + " style='" +
"padding:10px 14px;" +
"background:#4f46e5;" +
"color:white;" +
"border:none;" +
"border-radius:8px;" +
"font-weight:600;" +
"cursor:pointer;" +
"'>" +
"+ Add to Test" +
"</button>" +
"</div>";
}
function previewQuestion(id){
const q = questions.find(item =>
String(item._id) === String(id)
);
if(!q){
return;
}
const optionsHtml =
q.options && q.options.length
? q.options.map((opt, index) =>
"<div style='background:#f8fafc;padding:10px;margin:8px 0;border-radius:8px;'>" +
"<b>Option " + (index + 1) + ":</b> " + escapeHtml(opt) +
"</div>"
).join("")
: "<p style='color:#64748b;'>No options found. This may be a coding or written question.</p>";
const sourceLabel =
q.scope === "teacher"
? "My Question"
: "Platform Question";
const questionId = jsString(q._id);
const difficultyText = q.difficulty
? String(q.difficulty).charAt(0).toUpperCase() + String(q.difficulty).slice(1)
: "N/A";
document.getElementById("questionPreview").innerHTML =
"<h2 style='margin-top:0;'>Question Preview</h2>" +
"<div style='background:#f8fafc;padding:15px;border-radius:10px;margin-bottom:15px;'>" +
"<b>Question:</b><br>" +
"<div style='margin-top:8px;line-height:1.5;'>" + escapeHtml(q.question || "No question text") + "</div>" +
"</div>" +
"<div style='margin-bottom:15px;'>" +
optionsHtml +
"</div>" +
"<div style='background:#ecfdf5;padding:12px;border-radius:10px;margin-bottom:12px;'>" +
"<b>Correct Answer:</b> " + escapeHtml(q.correct || "N/A") +
"</div>" +
"<p><b>Subject:</b> " + escapeHtml(q.subject || q.category || "N/A") + "</p>" +
"<p><b>Board:</b> " + escapeHtml(q.board || "N/A") + "</p>" +
"<p><b>Difficulty:</b> " + escapeHtml(difficultyText) + "</p>" +
"<p><b>Library Type:</b> " + escapeHtml(sourceLabel) + "</p>" +
"<div style='background:#eef2ff;padding:12px;border-radius:10px;margin-top:12px;'>" +
"<b>Analytics</b><br>" +
"Attempted: " + Number(q.analytics?.attempted || 0) + "<br>" +
"Completed: " + Number(q.analytics?.correct || 0) + "<br>" +
"Incomplete: " + Number(q.analytics?.incorrect || 0) +
"</div>" +
 "<button class='library-add-to-test-button' data-question-id=" + questionId + " style='" +
 "margin-top:18px;" +
 "padding:10px 14px;" +
 "background:#4f46e5;" +
 "color:white;" +
 "border:none;" +
 "border-radius:8px;" +
 "font-weight:600;" +
 "cursor:pointer;" +
 "'>+ Add to Test</button>";
}
function renderLibrary(){
document.getElementById("libraryList").innerHTML =
questions.length
? questions.map(q => buildQuestionCard(q)).join("")
: "<p style='color:#64748b;'>No questions found</p>";
}
function renderPagination(){
const paginationBox = document.getElementById("libraryPagination");
if(!paginationBox){
return;
}
const total = Number(libraryPagination.total || 0);
const page = Number(libraryPagination.page || 1);
const totalPages = Number(libraryPagination.totalPages || 1);
paginationBox.innerHTML =
"<div style='color:#64748b;font-size:13px;'>" +
"Showing page " + page + " of " + totalPages + " • " + total + " questions" +
"</div>" +
"<div style='display:flex;gap:8px;'>" +
"<button " +
(libraryPagination.hasPrevPage ? "" : "disabled ") +
"class='library-pagination-button' " +
"data-page='" + (page - 1) + "' " +
"style='padding:8px 12px;border:none;border-radius:8px;background:#334155;color:white;cursor:pointer;font-weight:700;" +
(libraryPagination.hasPrevPage ? "" : "opacity:0.45;cursor:not-allowed;") +
"'>" +
"Previous" +
"</button>" +
"<button " +
(libraryPagination.hasNextPage ? "" : "disabled ") +
"class='library-pagination-button' " +
"data-page='" + (page + 1) + "' " +
"style='padding:8px 12px;border:none;border-radius:8px;background:#4f46e5;color:white;cursor:pointer;font-weight:700;" +
(libraryPagination.hasNextPage ? "" : "opacity:0.45;cursor:not-allowed;") +
"'>" +
"Next" +
"</button>" +
"</div>";
}
function addToTest(id){
let selected = JSON.parse(localStorage.getItem("selectedQuestions") || "[]");
if(!selected.includes(id)){
selected.push(id);
localStorage.setItem("selectedQuestions", JSON.stringify(selected));
alert("Added to test");
} else {
alert("Question already added");
}
}
</script>
`;
    res.send(layout(content, "library"));
  } catch (err) {
    console.error(err);
    res.send("Error loading library");
  }
});
// ---------- LIBRARY DATA API ----------
router.get("/api/library-data", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50"), 1),
      100
    );
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const subject = String(req.query.subject || "").trim();
    const board = String(req.query.board || "").trim();
    const scope = String(req.query.scope || "").trim();
    const difficulty = String(req.query.difficulty || "").trim().toLowerCase();
    const attempt = String(req.query.attempt || "").trim();
    const publicQuestionQuery = {
      $or: [
        { scope: "public" },
        { scope: { $exists: false } },
        { scope: null },
        { scope: "" }
      ]
    };
    const teacherQuestionQuery = schoolId
      ? {
          scope: "teacher",
          teacherId,
          schoolId
        }
      : {
          scope: "teacher",
          teacherId
        };
    const query = {
      $and: [
        {
          $or: [
            publicQuestionQuery,
            teacherQuestionQuery
          ]
        }
      ]
    };
    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      query.$and.push({
        $or: [
          { question: searchRegex },
          { subject: searchRegex },
          { category: searchRegex },
          { board: searchRegex },
          { difficulty: searchRegex }
        ]
      });
    }
    if (subject && subject !== "all") {
      query.$and.push({
        $or: [
          { subject },
          { category: subject }
        ]
      });
    }
    if (board && board !== "all") {
      query.$and.push({
        board
      });
    }
    if (scope && scope !== "all") {
      if (scope === "public") {
        query.$and.push(publicQuestionQuery);
      } else if (scope === "teacher") {
        query.$and.push(teacherQuestionQuery);
      }
    }
    if (difficulty && difficulty !== "all") {
      query.$and.push({
        difficulty
      });
    }
    if (attempt && attempt !== "all") {
      if (attempt === "attempted") {
        query.$and.push({
          "analytics.attempted": { $gt: 0 }
        });
      }
      if (attempt === "not_attempted") {
        query.$and.push({
          $or: [
            { "analytics.attempted": { $exists: false } },
            { "analytics.attempted": 0 }
          ]
        });
      }
    }
    const filterBaseQuery = {
      $or: [
        publicQuestionQuery,
        teacherQuestionQuery
      ]
    };
    const [questions, total, filterQuestions] = await Promise.all([
      Question.find(query)
        .select("question options correct correctAnswers subject category board difficulty scope teacherId type analytics createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(query),
      Question.find(filterBaseQuery)
        .select("subject category board")
        .lean()
    ]);
    const subjects = [...new Set(
      filterQuestions
        .map(q => q.subject || q.category)
        .filter(Boolean)
        .map(value => String(value))
    )];
    const boards = [...new Set(
      filterQuestions
        .map(q => q.board || "General")
        .filter(Boolean)
        .map(value => String(value))
    )];
    res.json({
      questions,
      filters: {
        subjects,
        boards
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error("LIBRARY DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load library data"
    });
  }
});
module.exports = router;