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
background:#e0633a;
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
<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;">
<label style="font-size:13px;white-space:nowrap;">Tags</label>
<div style="position:relative;">
  <button
    id="tagFilterButton"
    type="button"
    style="
      min-width:140px;
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
      gap:8px;
      box-sizing:border-box;
    "
  >
    <span id="tagFilterLabel">All tags</span>
    <span>▾</span>
  </button>
  <div
    id="tagFilterMenu"
    style="
      display:none;
      position:absolute;
      top:calc(100% + 6px);
      left:0;
      min-width:200px;
      background:white;
      border:1px solid #cbd5e1;
      border-radius:10px;
      box-shadow:0 8px 24px rgba(15,23,42,0.16);
      z-index:100;
    "
  >
    <div style="padding:8px;">
      <input
        id="tagFilterSearch"
        placeholder="Search tags..."
        style="
          width:100%;
          padding:6px 8px;
          border:1px solid #e2e8f0;
          border-radius:6px;
          font-size:12px;
          box-sizing:border-box;
        "
      />
    </div>
    <div id="tagFilterOptions" style="max-height:180px;overflow-y:auto;"></div>
  </div>
  <input id="tagFilter" type="hidden" value="all">
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
const createQuestionButton = event.target.closest("#libraryCreateQuestionButton");
if(createQuestionButton){
go("/create-question");
return;
}

const manageQuestionsButton = event.target.closest("#libraryManageQuestionsButton");
if(manageQuestionsButton){
go("/my-questions");
return;
}

const dropdownToggle = event.target.closest(".library-dropdown-toggle");
if(dropdownToggle){
const dropdownId = dropdownToggle.dataset.dropdownId;
if(dropdownId){
toggleCustomDropdown(dropdownId);
}
return;
}

const tagFilterButton = event.target.closest("#tagFilterButton");
if(tagFilterButton){
const menu = document.getElementById("tagFilterMenu");
if(menu){
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  menu.style.display = isOpen ? "none" : "block";
  if(!isOpen){
    const search = document.getElementById("tagFilterSearch");
    if(search){ search.value = ""; search.dispatchEvent(new Event("input")); search.focus(); }
  }
}
return;
}

const paginationButton = event.target.closest(".library-pagination-button");
if(paginationButton){
loadLibrary(parseInt(paginationButton.dataset.page || "1", 10));
return;
}

const addToTestButton = event.target.closest(".library-add-to-test-button");
if(addToTestButton){
addToTest(addToTestButton.dataset.questionId || "");
return;
}

const questionCard = event.target.closest(".library-question-card");
if(questionCard){
previewQuestion(questionCard.dataset.questionId || "");
return;
}

const clickedInsideDropdown = event.target.closest("[id$='Button']") ||
event.target.closest("[id$='Menu']") ||
event.target.closest("#tagFilterMenu");
if(!clickedInsideDropdown){
closeCustomDropdowns();
document.getElementById("tagFilterMenu") && (document.getElementById("tagFilterMenu").style.display = "none");
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
const tag = document.getElementById("tagFilter")?.value || "all";
if(tag !== "all"){
params.set("tag", tag);
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
const tags = (filters?.tags || []).filter(Boolean).sort();
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
populateTagFilter(tags);
}
function populateTagFilter(tags){
const optionsContainer = document.getElementById("tagFilterOptions");
if(!optionsContainer) return;
function renderTagOptions(query){
  const q = (query || "").trim().toLowerCase();
  const allOptions = [{ value: "all", label: "All" }].concat(tags.map(function(t){ return { value: t, label: t }; }));
  const filtered = allOptions.filter(function(opt){ return !q || opt.label.toLowerCase().indexOf(q) !== -1; });
  const currentTag = (document.getElementById("tagFilter") || {}).value || "all";
  optionsContainer.innerHTML = "";
  if(!filtered.length){
    const msg = document.createElement("p");
    msg.style.cssText = "padding:8px 12px;color:#94a3b8;font-size:12px;margin:0;";
    msg.textContent = "No tags found";
    optionsContainer.appendChild(msg);
    return;
  }
  filtered.forEach(function(opt){
    const isActive = opt.value === currentTag;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-filter-option";
    btn.dataset.value = opt.value;
    btn.textContent = opt.label;
    btn.style.cssText = "width:100%;padding:9px 12px;text-align:left;border:none;background:" + (isActive ? "#eef2ff" : "white") + ";cursor:pointer;font-size:13px;box-sizing:border-box;font-weight:" + (isActive ? "700" : "400") + ";";
    btn.addEventListener("mouseenter", function(){ this.style.background = "#eef2ff"; });
    btn.addEventListener("mouseleave", function(){ this.style.background = isActive ? "#eef2ff" : "white"; });
    optionsContainer.appendChild(btn);
  });
}
renderTagOptions("");
const tagFilterSearch = document.getElementById("tagFilterSearch");
if(tagFilterSearch){
  tagFilterSearch.addEventListener("input", function(){ renderTagOptions(tagFilterSearch.value); });
}
optionsContainer.addEventListener("click", function(e){
  const btn = e.target.closest(".tag-filter-option");
  if(!btn) return;
  const value = btn.dataset.value;
  const input = document.getElementById("tagFilter");
  const label = document.getElementById("tagFilterLabel");
  if(input) input.value = value;
  if(label) label.textContent = value === "all" ? "All" : value;
  const menu = document.getElementById("tagFilterMenu");
  if(menu) menu.style.display = "none";
  loadLibrary(1);
});
}
function buildQuestionCard(q){
const sourceLabel = q.scope === "teacher" ? "My Question" : "Platform";
const questionId = jsString(q._id);
const questionText = escapeHtml(safeText(q.question, "Untitled Question"));
const subjectText = escapeHtml(safeText(q.subject || q.category, "No Subject"));
const boardText = escapeHtml(safeText(q.board, ""));
const difficultyText = escapeHtml(
  q.difficulty
  ? String(q.difficulty).charAt(0).toUpperCase() + String(q.difficulty).slice(1)
  : "No Difficulty"
);
const typeText = q.type === "coding" ? "Coding" : q.type === "written" ? "Written" : "MCQ";
const tagChips = (q.tags && q.tags.length)
? "<div style='display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;'>" +
  q.tags.map(t => "<span style='background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.01em;'>" + escapeHtml(t) + "</span>").join("") +
  "</div>"
: "";
function badge(label, bg, color){
  return "<span style='display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:" + bg + ";color:" + color + ";'>" + label + "</span>";
}
return "" +
"<div class='library-question-card' data-question-id=" + questionId + " style='" +
"background:white;" +
"padding:16px 18px;" +
"margin:10px 0;" +
"border-radius:14px;" +
"border:1px solid #e5e7eb;" +
"box-shadow:0 2px 6px rgba(15,23,42,0.05);" +
"display:flex;" +
"justify-content:space-between;" +
"align-items:center;" +
"gap:16px;" +
"cursor:pointer;" +
"'>" +
"<div style='min-width:0;flex:1;'>" +
"<p style='margin:0 0 10px 0;font-weight:700;font-size:14px;line-height:1.4;color:#0f172a;'>" +
questionText +
"</p>" +
"<div style='display:flex;flex-wrap:wrap;gap:6px;'>" +
badge(typeText, "#eef2ff", "#3730a3") +
badge(subjectText, "#ecfdf5", "#166534") +
(boardText ? badge(boardText, "#f8fafc", "#334155") : "") +
badge(difficultyText, "#fff7ed", "#9a3412") +
badge(sourceLabel, "#f1f5f9", "#475569") +
"</div>" +
tagChips +
"</div>" +
"<button class='library-add-to-test-button' data-question-id=" + questionId + " style='" +
"padding:9px 14px;" +
"background:#e0633a;" +
"color:white;" +
"border:none;" +
"border-radius:8px;" +
"font-weight:700;" +
"font-size:13px;" +
"cursor:pointer;" +
"flex-shrink:0;" +
"white-space:nowrap;" +
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
function previewBadge(label, bg, color){
  return "<span style='display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:" + bg + ";color:" + color + ";'>" + label + "</span>";
}
const typeText = q.type === "coding" ? "Coding" : q.type === "written" ? "Written" : "MCQ";
document.getElementById("questionPreview").innerHTML =
"<p style='margin:0 0 14px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;'>Question Preview</p>" +
"<div style='font-weight:700;font-size:15px;line-height:1.5;color:#0f172a;margin-bottom:14px;'>" +
escapeHtml(q.question || "No question text") +
"</div>" +
"<div style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;'>" +
previewBadge(typeText, "#eef2ff", "#3730a3") +
previewBadge(escapeHtml(q.subject || q.category || "N/A"), "#ecfdf5", "#166534") +
(q.board ? previewBadge(escapeHtml(q.board), "#f8fafc", "#334155") : "") +
previewBadge(difficultyText, "#fff7ed", "#9a3412") +
previewBadge(escapeHtml(sourceLabel), "#f1f5f9", "#475569") +
"</div>" +
(q.tags && q.tags.length
  ? "<div style='display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;'>" +
    q.tags.map(t => "<span style='background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.01em;'>" + escapeHtml(t) + "</span>").join("") +
    "</div>"
  : "") +
(q.options && q.options.length
  ? "<div style='margin-bottom:12px;'>" +
    "<p style='margin:0 0 6px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;'>Options</p>" +
    q.options.map((opt, i) =>
      "<div style='background:#f8fafc;border:1px solid #e5e7eb;padding:9px 12px;margin:5px 0;border-radius:9px;font-size:13px;color:#1e293b;'>" +
      "<span style='font-weight:700;color:#64748b;margin-right:8px;'>" + String.fromCharCode(65 + i) + ".</span>" +
      escapeHtml(opt) +
      "</div>"
    ).join("") +
    "</div>"
  : "") +
(q.correct
  ? "<div style='background:#ecfdf5;border:1px solid #bbf7d0;padding:10px 14px;border-radius:10px;margin-bottom:14px;font-size:13px;'>" +
    "<span style='font-weight:700;color:#166534;'>Correct Answer: </span>" +
    "<span style='color:#15803d;'>" + escapeHtml(q.correct) + "</span>" +
    "</div>"
  : "") +
"<div style='background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:16px;'>" +
"<p style='margin:0 0 8px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;'>Analytics</p>" +
"<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;'>" +
"<div style='text-align:center;'><div style='font-size:18px;font-weight:800;color:#0f172a;'>" + Number(q.analytics?.attempted || 0) + "</div><div style='font-size:11px;color:#64748b;'>Attempted</div></div>" +
"<div style='text-align:center;'><div style='font-size:18px;font-weight:800;color:#16a34a;'>" + Number(q.analytics?.correct || 0) + "</div><div style='font-size:11px;color:#64748b;'>Correct</div></div>" +
"<div style='text-align:center;'><div style='font-size:18px;font-weight:800;color:#dc2626;'>" + Number(q.analytics?.incorrect || 0) + "</div><div style='font-size:11px;color:#64748b;'>Incorrect</div></div>" +
"</div>" +
"</div>" +
"<button class='library-add-to-test-button' data-question-id=" + questionId + " style='" +
"width:100%;" +
"padding:11px 14px;" +
"background:#e0633a;" +
"color:white;" +
"border:none;" +
"border-radius:10px;" +
"font-weight:700;" +
"font-size:14px;" +
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
"style='padding:8px 12px;border:none;border-radius:8px;background:#e0633a;color:white;cursor:pointer;font-weight:700;" +
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
    const tag = String(req.query.tag || "").trim();
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
    if (tag && tag !== "all") {
      query.$and.push({ tags: tag });
    }
    const filterBaseQuery = {
      $or: [
        publicQuestionQuery,
        teacherQuestionQuery
      ]
    };
    const [questions, total, filterQuestions] = await Promise.all([
      Question.find(query)
        .select("question options correct correctAnswers subject category board difficulty scope teacherId type analytics tags createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(query),
      Question.find(filterBaseQuery)
        .select("subject category board tags")
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
    const tags = [...new Set(
      filterQuestions
        .flatMap(q => Array.isArray(q.tags) ? q.tags : [])
        .filter(Boolean)
        .map(value => String(value))
    )].sort();
    res.json({
      questions,
      filters: {
        subjects,
        boards,
        tags
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