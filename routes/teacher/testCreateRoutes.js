const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const Test = require("../../models/Test");
const layout = require("../../views/layout");
const backButton = require("../../views/backButton");
const { logAuditEvent } = require("../../services/auditLogger");
const { recordUsageEvent } = require("../../services/usageTracker");
const { canCreateTest } = require("../../services/planEnforcement");
const { escapeHtml, escapeAttribute, safeJsonForScript, escapeRegExp, buildExactNameRegex } = require("../../utils/html");

const Question = require("../../models/Question");
const ClassSubject = require("../../models/ClassSubject");

router.get("/create-test", authMiddleware, async (req, res) => {
try {
if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
  return res.redirect("/");
}
const Question = require("../../models/Question");
const ClassSubject = require("../../models/ClassSubject");
const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const questions = await Question.find({
  $or: [
    { scope: "public" },
    schoolId
      ? {
          scope: "teacher",
          teacherId,
          schoolId
        }
      : {
          scope: "teacher",
          teacherId
        }
  ]
})
  .select("question options correct correctAnswers subject category board difficulty scope teacherId type codingMeta testCases createdAt")
  .sort({ createdAt: -1 })
  .limit(500)
  .lean();
let editTest = null;
if (req.query.id) {
  editTest = await Test.findOne({
  _id: req.query.id,
  teacherId,
  ...(schoolId ? { schoolId } : {})
}).lean();
}
const classSubjectMappings = await ClassSubject.find({
  teacherId,
  ...(schoolId ? { schoolId } : {})
})
  .select("className subject teacherId schoolId schoolCode")
  .sort({ className: 1, subject: 1 })
  .lean();
const noMappingsNotice = classSubjectMappings.length
  ? ""
  : `
<div style="
  background:#fff7ed;
  border:1px solid #fed7aa;
  color:#9a3412;
  padding:14px;
  border-radius:10px;
  margin-bottom:16px;
  font-weight:600;
">
  No class or subject has been assigned to you yet. Please contact your school admin before creating a test.
</div>
`;
const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:22px;
">
  <div>
    <h1 style="margin:0;font-size:30px;color:#0f172a;">Create Test</h1>
    <p style="margin:8px 0 0 0;color:#64748b;font-size:14px;">
      Build a draft test by selecting class, subject, and questions from your library.
    </p>
  </div>
  ${backButton("/teacher-tests")}
</div>
${noMappingsNotice}
<div style="
  background:linear-gradient(135deg,#ffffff,#f8fafc);
  padding:22px;
  border-radius:18px;
  box-shadow:0 10px 28px rgba(15,23,42,0.08);
  margin-bottom:22px;
  border:1px solid #e5e7eb;
">
  <div style="
    display:grid;
    grid-template-columns:1.2fr 0.9fr 0.9fr;
    gap:14px;
  ">
    <div>
      <label style="display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:8px;">
        Test Name
      </label>
      <input id="testName" value="${escapeAttribute(editTest?.name || "")}" placeholder="Example: Fractions Unit Test" style="
        width:100%;
        padding:13px 14px;
        border-radius:12px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        outline:none;
        font-size:14px;
      "/>
    </div>
    <div>
      <label style="display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:8px;">
        Class
      </label>
      <div style="position:relative;width:100%;">
        <button
          id="classNameButton"
          type="button"
          class="custom-dropdown-toggle"
          data-dropdown-id="className"
          style="
            width:100%;
            padding:13px 14px;
            border-radius:12px;
            border:1px solid #cbd5e1;
            box-sizing:border-box;
            outline:none;
            font-size:14px;
            background:white;
            cursor:pointer;
            text-align:left;
            display:flex;
            justify-content:space-between;
            align-items:center;
          "
        >
          <span id="classNameLabel">Select Class</span>
          <span>▾</span>
        </button>
        <div
          id="classNameMenu"
          style="
            display:none;
            position:absolute;
            top:calc(100% + 6px);
            left:0;
            right:0;
            background:white;
            border:1px solid #cbd5e1;
            border-radius:12px;
            box-shadow:0 8px 24px rgba(15,23,42,0.16);
            max-height:220px;
            overflow-y:auto;
            z-index:120;
          "
        ></div>
        <input id="className" type="hidden" value="${escapeAttribute(editTest?.className || "")}">
      </div>
    </div>
    <div>
      <label style="display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:8px;">
        Subject
      </label>
      <div style="position:relative;width:100%;">
        <button
          id="subjectButton"
          type="button"
          class="custom-dropdown-toggle"
          data-dropdown-id="subject"
          style="
            width:100%;
            padding:13px 14px;
            border-radius:12px;
            border:1px solid #cbd5e1;
            box-sizing:border-box;
            outline:none;
            font-size:14px;
            background:white;
            cursor:pointer;
            text-align:left;
            display:flex;
            justify-content:space-between;
            align-items:center;
          "
        >
          <span id="subjectLabel">Select Subject</span>
          <span>▾</span>
        </button>
        <div
          id="subjectMenu"
          style="
            display:none;
            position:absolute;
            top:calc(100% + 6px);
            left:0;
            right:0;
            background:white;
            border:1px solid #cbd5e1;
            border-radius:12px;
            box-shadow:0 8px 24px rgba(15,23,42,0.16);
            max-height:220px;
            overflow-y:auto;
            z-index:120;
          "
        ></div>
        <input id="subject" type="hidden" value="${escapeAttribute(editTest?.subject || "")}">
      </div>
    </div>
  </div>
</div>
<div style="
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(360px,0.9fr);
  gap:22px;
  align-items:start;
">
  <div style="
    background:white;
    padding:20px;
    border-radius:18px;
    box-shadow:0 10px 28px rgba(15,23,42,0.08);
    height:680px;
    box-sizing:border-box;
    display:flex;
    flex-direction:column;
    border:1px solid #e5e7eb;
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      margin-bottom:14px;
    ">
      <div>
        <h3 style="margin:0;font-size:20px;color:#0f172a;">Select Questions</h3>
        <p id="selectedQuestionCount" style="margin:6px 0 0 0;color:#64748b;font-size:13px;">
          0 selected
        </p>
      </div>
      <button id="clearQuestionFiltersButton" style="
        padding:9px 12px;
        background:#fee2e2;
        color:#991b1b;
        border:1px solid #fecaca;
        border-radius:10px;
        cursor:pointer;
        font-weight:800;
        font-size:12px;
      ">
        Clear Filters
      </button>
    </div>
    <input
      id="questionSearch"
      oninput="filterQuestions()"
      placeholder="Search question text..."
      style="
        width:100%;
        padding:12px 14px;
        border-radius:12px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        outline:none;
        margin-bottom:12px;
        font-size:14px;
      "
    />
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:10px;
      margin-bottom:10px;
    ">
      <div style="position:relative;width:100%;">
                <button id="questionSubjectFilterButton" type="button" class="custom-dropdown-toggle" data-dropdown-id="questionSubjectFilter" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionSubjectFilterLabel">All Subjects</span>
          <span>▾</span>
        </button>
        <div id="questionSubjectFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionSubjectFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
         <button id="questionBoardFilterButton" type="button" class="custom-dropdown-toggle" data-dropdown-id="questionBoardFilter" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionBoardFilterLabel">All Boards</span>
          <span>▾</span>
        </button>
        <div id="questionBoardFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionBoardFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
        <button id="questionDifficultyFilterButton" type="button" class="custom-dropdown-toggle" data-dropdown-id="questionDifficultyFilter" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionDifficultyFilterLabel">All Difficulty</span>
          <span>▾</span>
        </button>
        <div id="questionDifficultyFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionDifficultyFilter" type="hidden" value="all">
      </div>
    </div>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-bottom:14px;
    ">
      <div style="position:relative;width:100%;">
        <button id="questionTypeFilterButton" type="button" class="custom-dropdown-toggle" data-dropdown-id="questionTypeFilter" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionTypeFilterLabel">All Types</span>
          <span>▾</span>
        </button>
        <div id="questionTypeFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionTypeFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
        <button id="questionScopeFilterButton" type="button" class="custom-dropdown-toggle" data-dropdown-id="questionScopeFilter" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionScopeFilterLabel">All Sources</span>
          <span>▾</span>
        </button>
        <div id="questionScopeFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionScopeFilter" type="hidden" value="all">
      </div>
    </div>
    <div
      id="questionList"
      style="
        flex:1;
        overflow-y:auto;
        padding-right:6px;
        min-height:0;
      "
    >
      <p style="color:#64748b;">Loading questions...</p>
    </div>
    <button id="saveTestButton" style="
      margin-top:18px;
      width:100%;
      padding:14px;
      background:linear-gradient(135deg,#e0633a,#c9542e);
      color:white;
      border:none;
      border-radius:12px;
      font-weight:800;
      cursor:pointer;
      font-size:15px;
      box-shadow:0 8px 18px rgba(79,70,229,0.25);
    ">
      Save Test
    </button>
  </div>
  <div
    id="questionPreview"
    style="
      background:white;
      padding:24px;
      border-radius:18px;
      box-shadow:0 10px 28px rgba(15,23,42,0.08);
      height:680px;
      overflow-y:auto;
      box-sizing:border-box;
      border:1px solid #e5e7eb;
    "
  >
    <h3 style="margin-top:0;font-size:20px;color:#0f172a;">Question Preview</h3>
    <p style="color:#64748b;line-height:1.6;">
      Select a question to preview details, answer, metadata, and options here.
    </p>
  </div>
</div>
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(
 !user ||
 (
   user.role !== "teacher" &&
   user.role !== "admin"
 )
){
 window.location.replace("/");
}
const assignedClassSubjects = ${safeJsonForScript(classSubjectMappings)};
const editingTestId = ${safeJsonForScript(String(editTest?._id || ""))};
const editingQuestionIds = ${safeJsonForScript((editTest?.questionIds || []).map(id => String(id)))};
if(editingTestId){
 localStorage.setItem("selectedQuestions", JSON.stringify(editingQuestionIds));
}
const questions = ${safeJsonForScript(questions)};
function escapeHtml(value){
 const div = document.createElement("div");
 div.textContent = String(value || "");
 return div.innerHTML;
}
function jsString(value){
 return JSON.stringify(String(value || ""));
}
function getErrorMessage(error){
 if(!error){
   return "Something went wrong";
 }
 if(typeof error === "string"){
   return error;
 }
 return error.message || "Something went wrong";
}
function getQuestionId(q){
 return String(q._id);
}
function getQuestionType(q){
  return String(q.type || "mcq").trim().toLowerCase();
}
function getQuestionSubject(q){
  return String(q.subject || q.category || "Uncategorized").trim();
}
function getQuestionBoard(q){
  return String(q.board || "General").trim();
}
function getQuestionDifficulty(q){
  return String(q.difficulty || "").trim().toLowerCase();
}
function getQuestionDifficultyLabel(q){
  const difficulty = getQuestionDifficulty(q);
  if(difficulty === "easy") return "Easy";
  if(difficulty === "medium") return "Medium";
  if(difficulty === "hard") return "Hard";
  return "";
}
function getQuestionScope(q){
  return String(q.scope || "public").trim().toLowerCase();
}
function getBadge(label, background, color){
  return "<span style='" +
    "display:inline-flex;" +
    "align-items:center;" +
    "padding:4px 8px;" +
    "border-radius:999px;" +
    "font-size:11px;" +
    "font-weight:800;" +
    "background:" + background + ";" +
    "color:" + color + ";" +
    "border:1px solid rgba(15,23,42,0.08);" +
  "'>" + escapeHtml(label) + "</span>";
}
function buildQuestionRow(q){
  const id = getQuestionId(q);
  const idForAttribute = escapeHtml(id);
  const questionText = escapeHtml(q.question || "Untitled question");
  const type = getQuestionType(q);
  const subject = getQuestionSubject(q);
  const board = getQuestionBoard(q);
  const difficulty = getQuestionDifficultyLabel(q);
  const scope = getQuestionScope(q);
  const selected = JSON.parse(
    localStorage.getItem("selectedQuestions") || "[]"
  ).map(item => String(item)).includes(id);
  const typeLabel =
    type === "coding"
      ? "Coding"
      : type === "written"
      ? "Written"
      : "MCQ";
  return \`
    <label
      class="question-preview-card"
      data-question-id="\${idForAttribute}"
      style="
        display:block;
        padding:14px;
        border:\${selected ? "2px solid #e0633a" : "1px solid #e5e7eb"};
        border-radius:14px;
        margin-bottom:12px;
        cursor:pointer;
        background:\${selected ? "#eef2ff" : "#ffffff"};
        box-shadow:\${selected ? "0 8px 18px rgba(79,70,229,0.14)" : "0 4px 10px rgba(15,23,42,0.04)"};
        transition:all 0.15s ease;
      "
    >
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <input
          type="checkbox"
          value="\${idForAttribute}"
          class="qbox"
          \${selected ? "checked" : ""}
          style="margin-top:4px;width:16px;height:16px;"
        >
        <div style="min-width:0;flex:1;">
          <div style="
            color:#0f172a;
            font-weight:800;
            font-size:14px;
            line-height:1.35;
            margin-bottom:10px;
          ">
            \${questionText}
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;">
            \${getBadge(typeLabel, "#eef2ff", "#3730a3")}
            \${getBadge(subject, "#ecfdf5", "#166534")}
            \${getBadge(board, "#f8fafc", "#334155")}
            \${getBadge(difficulty, "#fff7ed", "#9a3412")}
            \${getBadge(scope === "teacher" ? "My Question" : "Public", "#f1f5f9", "#475569")}
          </div>
        </div>
      </div>
    </label>
  \`;
}
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
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
  const dropdownToggle = event.target.closest(".custom-dropdown-toggle");
  if(dropdownToggle){
    toggleCustomDropdown(dropdownToggle.dataset.dropdownId || "");
    return;
  }

  const saveTestButton = event.target.closest("#saveTestButton");
  if(saveTestButton){
    saveTest();
    return;
  }

  const saveTestSettingsButton = event.target.closest("#saveTestSettingsButton");
  if(saveTestSettingsButton){
    saveSettings();
    return;
  }

  const backToTeacherTestsButton = event.target.closest("#backToTeacherTestsButton");
  if(backToTeacherTestsButton){
    go("/teacher-tests");
    return;
  }

  const clearQuestionFiltersButton = event.target.closest("#clearQuestionFiltersButton");
  if(clearQuestionFiltersButton){
    clearFilters();
    return;
  }

  const questionPreviewCard = event.target.closest(".question-preview-card");
  if(questionPreviewCard){
    previewQuestion(questionPreviewCard.dataset.questionId || "");
    return;
  }

  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");
  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
function populateQuestionFilters(){
  const subjects = [...new Set(
    questions.map(q => getQuestionSubject(q)).filter(Boolean)
  )].sort();
  const boards = [...new Set(
    questions.map(q => getQuestionBoard(q)).filter(Boolean)
  )].sort();
  const difficulties = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" }
  ];
  const types = [...new Set(
    questions.map(q => getQuestionType(q)).filter(Boolean)
  )].sort();
  setCustomDropdownOptions(
    "questionSubjectFilter",
    [
      { value: "all", label: "All Subjects" },
      ...subjects.map(subject => ({ value: subject, label: subject }))
    ],
    filterQuestions
  );
  setCustomDropdownOptions(
    "questionBoardFilter",
    [
      { value: "all", label: "All Boards" },
      ...boards.map(board => ({ value: board, label: board }))
    ],
    filterQuestions
  );
  setCustomDropdownOptions(
    "questionDifficultyFilter",
    [
      { value: "all", label: "All Difficulty" },
      ...difficulties
    ],
    filterQuestions
  );
  setCustomDropdownOptions(
    "questionTypeFilter",
    [
      { value: "all", label: "All Types" },
      ...types.map(type => ({
        value: type,
        label: type === "coding" ? "Coding" : type === "written" ? "Written" : "MCQ"
      }))
    ],
    filterQuestions
  );
  setCustomDropdownOptions(
    "questionScopeFilter",
    [
      { value: "all", label: "All Sources" },
      { value: "public", label: "Public" },
      { value: "teacher", label: "My Questions" }
    ],
    filterQuestions
  );
}
function updateSelectedQuestionCount(){
  const selected = JSON.parse(
    localStorage.getItem("selectedQuestions") || "[]"
  ).map(id => String(id));
  const counter = document.getElementById("selectedQuestionCount");
  if(counter){
    counter.textContent =
      selected.length === 1
        ? "1 question selected"
        : selected.length + " questions selected";
  }
}
function filterQuestions(){
  const search = String(
    document.getElementById("questionSearch")?.value || ""
  ).trim().toLowerCase();
  const subject = document.getElementById("questionSubjectFilter").value;
  const board = document.getElementById("questionBoardFilter").value;
  const difficulty = document.getElementById("questionDifficultyFilter").value;
  const type = document.getElementById("questionTypeFilter").value;
  const scope = document.getElementById("questionScopeFilter").value;
  const filtered = questions.filter(q => {
    const qText = String(q.question || "").toLowerCase();
    const qSubject = getQuestionSubject(q);
    const qBoard = getQuestionBoard(q);
    const qDifficulty = getQuestionDifficulty(q);
    const qType = getQuestionType(q);
    const qScope = getQuestionScope(q);
    const searchMatch =
      !search ||
      qText.includes(search) ||
      qSubject.toLowerCase().includes(search) ||
      qBoard.toLowerCase().includes(search);
    const subjectMatch =
      subject === "all" || qSubject === subject;
    const boardMatch =
      board === "all" || qBoard === board;
    const difficultyMatch =
      difficulty === "all" || qDifficulty === difficulty;
    const typeMatch =
      type === "all" || qType === type;
    const scopeMatch =
      scope === "all" || qScope === scope;
    return (
      searchMatch &&
      subjectMatch &&
      boardMatch &&
      difficultyMatch &&
      typeMatch &&
      scopeMatch
    );
  });
  document.getElementById("questionList").innerHTML =
    filtered.length
      ? filtered.map(q => buildQuestionRow(q)).join("")
      : "<div style='background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;padding:28px;text-align:center;color:#64748b;font-weight:700;'>No questions match these filters.</div>";
  restoreSelectedQuestions();
  updateSelectedQuestionCount();
}
function restoreSelectedQuestions(){
  const selected = JSON.parse(
    localStorage.getItem("selectedQuestions") || "[]"
  ).map(id => String(id));
  document.querySelectorAll(".qbox").forEach(cb => {
    if(selected.includes(String(cb.value))){
      cb.checked = true;
    }
    cb.addEventListener("change", function(){
      let selectedQuestions = JSON.parse(
        localStorage.getItem("selectedQuestions") || "[]"
      ).map(id => String(id));
      const value = String(this.value);
      if(this.checked && !selectedQuestions.includes(value)){
        selectedQuestions.push(value);
      }
      if(!this.checked){
        selectedQuestions = selectedQuestions.filter(id => id !== value);
      }
      localStorage.setItem(
        "selectedQuestions",
        JSON.stringify(selectedQuestions)
      );
      updateSelectedQuestionCount();
      filterQuestions();
    });
  });
  updateSelectedQuestionCount();
}
function previewQuestion(id){
  const q = questions.find(item =>
    String(item._id) === String(id)
  );
  if(!q){
    return;
  }
  const type = getQuestionType(q);
  const subject = getQuestionSubject(q);
  const board = getQuestionBoard(q);
  const difficulty = getQuestionDifficultyLabel(q);
  const scope = getQuestionScope(q);
  const optionsHtml =
    q.options && q.options.length
      ? q.options.map((opt, index) =>
        "<div style='background:#f8fafc;padding:12px;margin:8px 0;border-radius:10px;border:1px solid #e5e7eb;'>" +
        "<b>Option " + (index + 1) + ":</b> " + escapeHtml(opt) +
        "</div>"
      ).join("")
      : "<p style='color:#64748b;'>No options found. This may be a coding or written question.</p>";
  const testCasesHtml =
    q.testCases && q.testCases.length
      ? "<div style='margin-top:14px;'>" +
        "<h4 style='margin:0 0 8px 0;'>Test Cases</h4>" +
        q.testCases.map((testCase, index) =>
          "<div style='background:#f8fafc;padding:12px;margin:8px 0;border-radius:10px;border:1px solid #e5e7eb;'>" +
          "<b>Case " + (index + 1) + "</b><br>" +
          "<span style='color:#64748b;'>Input:</span> " + escapeHtml(JSON.stringify(testCase.input || "")) + "<br>" +
          "<span style='color:#64748b;'>Expected:</span> " + escapeHtml(JSON.stringify(testCase.expected || "")) +
          "</div>"
        ).join("") +
        "</div>"
      : "";
  document.getElementById("questionPreview").innerHTML =
    "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;'>" +
      "<div>" +
        "<h3 style='margin:0;font-size:20px;color:#0f172a;'>Question Preview</h3>" +
        "<p style='margin:6px 0 0 0;color:#64748b;font-size:13px;'>Review before adding it to your test.</p>" +
      "</div>" +
      getBadge(type === "coding" ? "Coding" : type === "written" ? "Written" : "MCQ", "#eef2ff", "#3730a3") +
    "</div>" +
    "<div style='background:#f8fafc;padding:18px;border-radius:14px;margin-bottom:16px;border:1px solid #e5e7eb;'>" +
      "<b style='color:#0f172a;'>Question</b><br>" +
      "<div style='margin-top:10px;line-height:1.55;color:#1e293b;font-size:15px;'>" +
        escapeHtml(q.question || "No question text") +
      "</div>" +
    "</div>" +
    "<div style='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;'>" +
      getBadge(subject, "#ecfdf5", "#166534") +
      getBadge(board, "#f8fafc", "#334155") +
      getBadge(difficulty, "#fff7ed", "#9a3412") +
      getBadge(scope === "teacher" ? "My Question" : "Public", "#f1f5f9", "#475569") +
    "</div>" +
    "<div style='margin-bottom:16px;'>" +
      optionsHtml +
    "</div>" +
    "<div style='background:#ecfdf5;padding:14px;border-radius:12px;margin-bottom:14px;border:1px solid #bbf7d0;'>" +
      "<b>Correct Answer:</b> " + escapeHtml(Array.isArray(q.correctAnswers) ? q.correctAnswers.join(", ") : (q.correct || q.correctAnswers || "N/A")) +
    "</div>" +
    testCasesHtml;
}
function updateSubjectOptions(){
  const className = document.getElementById("className").value;
  const currentSubject = document.getElementById("subject").value;
  const subjects = [...new Set(
    assignedClassSubjects
      .filter(mapping => {
        if(!className){
          return true;
        }
        return (
          String(mapping.className || "").trim().toUpperCase() ===
          String(className || "").trim().toUpperCase()
        );
      })
      .map(mapping => String(mapping.subject || "").trim())
      .filter(Boolean)
  )].sort();
  setCustomDropdownOptions(
    "subject",
    subjects.length
      ? [
          { value: "", label: "Select Subject" },
          ...subjects.map(subject => ({ value: subject, label: subject }))
        ]
      : [{ value: "", label: "No assigned subjects" }]
  );
  if(subjects.includes(currentSubject)){
    document.getElementById("subject").value = currentSubject;
    document.getElementById("subjectLabel").textContent = currentSubject;
  }
}
function saveTest(){
 const name = document.getElementById("testName").value;
 const subject = document.getElementById("subject").value;
 const className = document.getElementById("className").value;
 const selected = Array.from(
 document.querySelectorAll(".qbox:checked")
 ).map(i => String(i.value));
 if(!name) return alert("Enter test name");
 if(!className) return alert("Select class");
 if(!subject) return alert("Select subject");
 if(selected.length === 0) return alert("Select at least one question");
 fetch("/api/teacher/tests/save", {
 method:"POST",
headers:{
 "Content-Type":"application/json"
},
body: JSON.stringify({
 testId: editingTestId,
 name,
 questionIds: selected,
 className,
 subject
})
 })
 .then(res => res.json())
 .then(data => {
 if(data.error) return alert(getErrorMessage(data.error));
 localStorage.removeItem("selectedQuestions");
 alert(editingTestId ? "Draft updated!" : "Test saved as draft!");
 go("/teacher-tests");
 })
 .catch(() => alert("Failed to create test"));
}
function clearFilters(){
  document.getElementById("questionSearch").value = "";
  document.getElementById("questionSubjectFilter").value = "all";
  document.getElementById("questionSubjectFilterLabel").textContent = "All Subjects";
  document.getElementById("questionBoardFilter").value = "all";
  document.getElementById("questionBoardFilterLabel").textContent = "All Boards";
  document.getElementById("questionDifficultyFilter").value = "all";
  document.getElementById("questionDifficultyFilterLabel").textContent = "All Difficulty";
  document.getElementById("questionTypeFilter").value = "all";
  document.getElementById("questionTypeFilterLabel").textContent = "All Types";
  document.getElementById("questionScopeFilter").value = "all";
  document.getElementById("questionScopeFilterLabel").textContent = "All Sources";
  closeCustomDropdowns();
  filterQuestions();
}
setCustomDropdownOptions(
  "className",
  assignedClassSubjects.length
    ? [
        { value: "", label: "Select Class" },
        ...[...new Set(
          assignedClassSubjects
            .map(mapping => String(mapping.className || "").trim().toUpperCase())
            .filter(Boolean)
        )].sort().map(className => ({ value: className, label: className }))
      ]
    : [{ value: "", label: "No assigned classes" }],
  function(){
    document.getElementById("subject").value = "";
    updateSubjectOptions();
  }
);
updateSubjectOptions();
populateQuestionFilters();
filterQuestions();
</script>
`;
res.send(layout(content, "tests"));
} catch (err) {
console.error("CREATE TEST ERROR:", err);
res.send("Error loading create test");
}
});
// ---------- SAVE TEST ----------
async function saveTestHandler(req, res) {
  try {
    if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { testId, name, questionIds, className, subject } = req.body;
    const normalizedName = String(name || "").trim();
    if (!normalizedName || !Array.isArray(questionIds) || !questionIds.length) {
      return res.status(400).json({ error: "Invalid test data" });
    }
    if (!className || !subject) {
      return res.status(400).json({ error: "Class and subject required" });
    }
    const ClassSubject = require("../../models/ClassSubject");
    const normalizedClass = String(className || "").trim().toUpperCase();
const normalizedSubject = String(subject || "").trim();
// 🔒 CHECK MAPPING
const mapping = await ClassSubject.findOne({
  className: normalizedClass,
  subject: normalizedSubject,
  teacherId: String(req.user.id),
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    if (!mapping) {
      return res.status(403).json({
        error: "You are not assigned to this class and subject"
      });
    }

    const duplicateNameFilter = {
      name: buildExactNameRegex(normalizedName),
      teacherId: String(req.user.id),
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    };

    if (testId) {
      duplicateNameFilter._id = { $ne: testId };
    }

    const duplicateTest = await Test.findOne(duplicateNameFilter)
      .select("_id name")
      .lean();

    if (duplicateTest) {
      return res.status(409).json({
        error: "You already have a test with this name. Please choose a different test name."
      });
    }

    if (testId) {
const existingTest = await Test.findOne({
  _id: testId,
  teacherId: String(req.user.id),
  status: "draft",
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
      if (!existingTest) {
        return res.status(404).json({
          error: "Draft test not found or cannot be edited"
        });
      }
      existingTest.name = normalizedName;
      existingTest.questionIds = questionIds;
      existingTest.className = normalizedClass;
      existingTest.subject = normalizedSubject;
      existingTest.schoolId = existingTest.schoolId || req.user.schoolId || null;
existingTest.schoolCode = existingTest.schoolCode || req.user.schoolCode || null;
await existingTest.save();
await logAuditEvent(req, {
  event: "teacher_test_updated",
  status: "success",
  metadata: {
    testId: existingTest._id,
    testName: existingTest.name,
    className: existingTest.className,
    subject: existingTest.subject,
    questionCount: existingTest.questionIds.length,
    schoolId: existingTest.schoolId || null,
    schoolCode: existingTest.schoolCode || null
  }
});

await recordUsageEvent({
  schoolId: existingTest.schoolId || req.user.schoolId || null,
  schoolCode: existingTest.schoolCode || req.user.schoolCode || null,
  userId: req.user.id,
  teacherId: req.user.id,
  role: req.user.role || "teacher",
  eventType: "test_updated",
  eventLabel: "Test updated",
  resourceType: "test",
  resourceId: String(existingTest._id),
  status: "updated",
  metadata: {
    testId: String(existingTest._id),
    testName: existingTest.name,
    className: existingTest.className,
    subject: existingTest.subject,
    questionCount: existingTest.questionIds.length
  }
});

return res.json({
 status: "draft_updated",
 test: existingTest
 });
    }

if (req.user.schoolId) {
  const testLimitCheck = await canCreateTest(req.user.schoolId);

  if (!testLimitCheck.allowed) {
    return res.status(403).json({
      error: {
        code: testLimitCheck.code,
        message: testLimitCheck.message,
        usage: testLimitCheck.usage,
        limit: testLimitCheck.limit
      }
    });
  }
}

const newTest = await Test.create({
  name: normalizedName,
  questionIds,
  teacherId: req.user.id,
  schoolId: req.user.schoolId || null,
  schoolCode: req.user.schoolCode || null,
  className: normalizedClass,
  subject: normalizedSubject,
  status: "draft",
  publishedAt: null
});
    await logAuditEvent(req, {
  event: "teacher_test_created",
  status: "success",
  metadata: {
    testId: newTest._id,
    testName: newTest.name,
    className: newTest.className,
    subject: newTest.subject,
    questionCount: newTest.questionIds.length,
    schoolId: newTest.schoolId || null,
    schoolCode: newTest.schoolCode || null
  }
});

await recordUsageEvent({
  schoolId: newTest.schoolId || req.user.schoolId || null,
  schoolCode: newTest.schoolCode || req.user.schoolCode || null,
  userId: req.user.id,
  teacherId: req.user.id,
  role: req.user.role || "teacher",
  eventType: "test_created",
  eventLabel: "Test created",
  resourceType: "test",
  resourceId: String(newTest._id),
  status: "created",
  metadata: {
    testId: String(newTest._id),
    testName: newTest.name,
    className: newTest.className,
    subject: newTest.subject,
    questionCount: newTest.questionIds.length
  }
});

res.json({ status: "draft_saved", test: newTest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save test" });
  }
}
router.post("/api/teacher/tests/save", authMiddleware, saveTestHandler);

module.exports = router;
