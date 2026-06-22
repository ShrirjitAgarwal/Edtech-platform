const express = require("express");
const router = express.Router();
const Student = require("../../models/Student");
const Result = require("../../models/Result");
const Test = require("../../models/Test");
const School = require("../../models/School");
const sidebar = require("../../views/sidebar");
const { requireStudentPageSession } = require("./session");
const { recordUsageEvent } = require("../../services/usageTracker");
const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../../utils/html");

// ======================================================
// TEST PAGE
// ======================================================
router.get("/test", requireStudentPageSession, async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect("/student-entry");
    }
    const decodedStudent = req.studentSession.decodedStudent;
    const student = req.studentSession.student;
    const studentId = decodedStudent.studentId;

    if (!student.schoolId) {
      return res.send("<h1>School context required</h1>");
    }

const alreadyAttempted = await Result.findOne({
  studentId,
  testId: id,
  teacherId: String(student.teacherId || ""),
  schoolId: student.schoolId
})
  .select("_id")
  .lean();
    if (alreadyAttempted) {
      return res.redirect("/my-tests");
    }
    const test = await Test.findOne({
      _id: id,
      schoolId: student.schoolId
    }).lean();
    if (!test || test.status !== "published") {
      return res.send("<h1>Test not available</h1>");
    }
    if (test.scheduledAt && new Date(test.scheduledAt) > new Date()) {
      return res.send("<h1>Test not available yet</h1>");
    }
    const Question = require("../../models/Question");
    const questionIds = test.questionIds.map(qid => String(qid));
    const mongoQuestions = await Question.find({
      _id: { $in: questionIds },
      $or: [
        { scope: "public" },
        ...(test.schoolId ? [{ schoolId: test.schoolId }] : [])
      ]
    }).lean();
    const questionMap = {};
    mongoQuestions.forEach(q => {
      questionMap[String(q._id)] = q;
    });
    const testQuestions = questionIds
      .map(qid => questionMap[String(qid)])
      .filter(Boolean);
    const html = testQuestions.map((q, i) => {
      const qid = String(q._id);
      if (q.type === "mcq" && q.options && q.options.length) {
return `
<div
  class="test-question-card"
  data-question-index="${i}"
  data-question-id="${qid}"
  style="background:white;padding:20px;margin:15px 0;border-radius:12px;"
>
  <p><b>Q${i + 1}: ${escapeHtml(q.question)}</b></p>
  ${q.options.map(o => `
    <label>
      ${(q.correctAnswers && q.correctAnswers.length > 1)
        ? `<input type="checkbox" name="q${escapeAttribute(qid)}" value="${escapeAttribute(o)}"> ${escapeHtml(o)}`
        : `<input type="radio" name="q${escapeAttribute(qid)}" value="${escapeAttribute(o)}"> ${escapeHtml(o)}`
      }
    </label><br>
  `).join("")}
</div>
`;
      }
return `
<div
  class="test-question-card"
  data-question-index="${i}"
  data-question-id="${qid}"
  style="background:white;padding:20px;margin:15px 0;border-radius:12px;"
>
  <p><b>Q${i + 1}: ${escapeHtml(q.question)}</b></p>
  <div style="
    background:#020617;
    border-radius:12px;
    overflow:hidden;
    border:1px solid #1e293b;
  ">
    <div style="
      height:42px;
      background:#0f172a;
      border-bottom:1px solid #1e293b;
      display:flex;
      align-items:center;
      padding:0 14px;
      color:#94a3b8;
      font-size:13px;
      font-family:Arial;
      justify-content:space-between;
    ">
      <div>
        coding-answer-${i + 1}.txt
      </div>
      <div style="
        display:flex;
        gap:12px;
        align-items:center;
      ">
        <button
          id="run-${escapeAttribute(qid)}"
          class="run-code-button"
          data-question-id="${escapeAttribute(qid)}"
          style="
            padding:6px 12px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:6px;
            cursor:pointer;
            font-size:12px;
            font-weight:700;
          "
        >
          Run Code
        </button>
        <span
          class="language-badge"
          data-question-id="${qid}"
          style="
            background:#1e293b;
            color:#e2e8f0;
            border:1px solid #334155;
            border-radius:6px;
            padding:5px 9px;
            font-size:12px;
            font-weight:700;
            line-height:1;
            display:inline-flex;
            align-items:center;
            min-height:24px;
            box-sizing:border-box;
          "
        >
          ${(q.codingMeta?.language === "python") ? "Python" : "JavaScript"}
        </span>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#ef4444;
        "></div>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#f59e0b;
        "></div>
        <div style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#22c55e;
        "></div>
      </div>
    </div>
    <div style="
      display:flex;
      min-height:360px;
      background:#020617;
    ">
      <div
        id="cm-${qid}"
        class="cm-editor-host"
        data-question-id="${qid}"
        style="
          display:none;
          flex:1;
          width:100%;
          min-height:360px;
          height:360px;
        "
      ></div>
      <textarea
        id="code-${qid}"
        class="code-editor"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        data-question-id="${qid}"
        data-line-numbers="line-numbers-${qid}"
        style="
          flex:1;
          min-height:360px;
          height:360px;
          font-family:Consolas, Monaco, 'Courier New', monospace;
          font-size:14px;
          background:#020617;
          color:#e2e8f0;
          padding:14px;
          border:none;
          outline:none;
          resize:vertical;
          box-sizing:border-box;
          line-height:1.6;
          tab-size:2;
          white-space:pre;
          display:block;
          overflow:auto;
        "
        placeholder="Write your code here..."
      >${escapeHtml(q.codingMeta?.starterCode || "")}</textarea>
    </div>
    <div
      id="output-${qid}"
      style="
        background:#0f172a;
        border-top:1px solid #1e293b;
        padding:14px;
        color:#e2e8f0;
        font-family:Consolas, Monaco, monospace;
        font-size:13px;
        min-height:110px;
        white-space:pre-wrap;
      "
    >Run code to see output...</div>
  </div>
</div>
`;
    }).join("");
        const studentNameForPage =
      student.fullName || student.name || "Student";
    const studentClassForPage =
      student.class || "N/A";
    const studentIdForPage =
      student.studentId || studentId || "N/A";
    const questionSidebarHtml = testQuestions.map((q, i) => {
      const questionPreview = String(q.question || "")
        .replace(/\s+/g, " ")
        .trim();
      return `
        <div
          class="student-test-question-row"
          data-sidebar-question-index="${i}"
        >
          <div class="student-test-question-number">
            Q${i + 1}
          </div>
          <div class="student-test-question-preview">
            ${escapeHtml(questionPreview || "Question")}
          </div>
        </div>
      `;
    }).join("");
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(test.name)} | WZDM Test</title>
<style>
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Arial, Helvetica, sans-serif;
    color: #0f172a;
    background: #eef2ff;
  }
  .student-test-shell {
    min-height: 100vh;
    display: flex;
    background:
      radial-gradient(circle at top left, rgba(79, 70, 229, 0.10), transparent 34%),
      linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  }
  .student-test-sidebar {
    width: 280px;
    min-height: 100vh;
    background: #0f172a;
    color: white;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .student-test-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .student-test-brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }
  .student-test-sidebar-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 16px;
  }
  .student-test-sidebar-label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .student-test-sidebar-value {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 12px;
    word-break: break-word;
  }
  .student-test-sidebar-value:last-child {
    margin-bottom: 0;
  }
  .student-test-question-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
  }
  .student-test-question-row {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 10px;
    align-items: start;
    padding: 10px;
    border-radius: 12px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.10);
  }
  .student-test-question-row.is-current {
    border-color: #818cf8;
    background: rgba(79, 70, 229, 0.22);
  }
  .student-test-question-row.is-answered {
    border-color: rgba(34, 197, 94, 0.65);
    background: rgba(22, 163, 74, 0.18);
  }
  .student-test-question-row.is-skipped {
    border-color: rgba(234, 179, 8, 0.75);
    background: rgba(234, 179, 8, 0.18);
  }
  .student-test-question-number {
    height: 34px;
    border-radius: 10px;
    background: #334155;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
  }
  .student-test-question-row.is-current .student-test-question-number {
    background: #4f46e5;
  }
  .student-test-question-row.is-answered .student-test-question-number {
    background: #16a34a;
  }
  .student-test-question-row.is-skipped .student-test-question-number {
    background: #ca8a04;
  }
  .student-test-question-preview {
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 700;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .student-test-content {
    flex: 1;
    min-width: 0;
    height: 100vh;
    overflow: auto;
    padding: 28px;
  }
  .student-test-header {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 22px;
    margin-bottom: 18px;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
  }
  .student-test-header-top {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }
  .student-test-title {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  .student-test-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .student-test-chip {
    background: #eef2ff;
    border: 1px solid #dbe4ff;
    color: #3730a3;
    border-radius: 999px;
    padding: 8px 11px;
    font-size: 13px;
    font-weight: 800;
  }
  .student-test-student-box {
    text-align: right;
    color: #475569;
    font-size: 13px;
    line-height: 1.5;
  }
  .student-test-student-box b {
    color: #0f172a;
  }
  .student-test-main-card {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 22px;
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
  }
  .student-test-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    align-items: center;
  }
  #submitBtn,
  #previousQuestionBtn,
  #skipQuestionBtn,
  #nextQuestionBtn {
    padding: 12px 16px;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 800;
  }
  #nextQuestionBtn {
    background: #4f46e5;
  }
  #previousQuestionBtn {
    background: #64748b;
  }
  #skipQuestionBtn {
    background: #ca8a04;
  }
  #submitBtn {
    background: #16a34a;
  }
  #previousQuestionBtn:disabled,
  #skipQuestionBtn:disabled,
  #nextQuestionBtn:disabled,
  #submitBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  @media (max-width: 900px) {
    .student-test-shell {
      flex-direction: column;
    }
    .student-test-sidebar {
      width: 100%;
      min-height: auto;
    }
    .student-test-content {
      height: auto;
      padding: 18px;
    }
    .student-test-header-top {
      flex-direction: column;
    }
    .student-test-student-box {
      text-align: left;
    }
  }
</style>
</head>
<body>
<div id="examGate" style="
position:fixed;
top:0;
left:0;
width:100%;
height:100%;
background:#000;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
z-index:9999;
">
<h2 style="color:white;margin-bottom:20px;">Start Test</h2>
<button id="startExamBtn" style="
padding:14px 22px;
font-size:16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Click to Start
</button>
</div>
<div class="student-test-shell">
  <aside class="student-test-sidebar">
    <div class="student-test-brand">
      <div class="student-test-brand-mark">W</div>
      <div>WZDM Test</div>
    </div>
    <div class="student-test-sidebar-card">
      <div class="student-test-sidebar-label">Student</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentNameForPage)}</div>
      <div class="student-test-sidebar-label">Class</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentClassForPage)}</div>
      <div class="student-test-sidebar-label">Student ID</div>
      <div class="student-test-sidebar-value">${escapeHtml(studentIdForPage)}</div>
    </div>
    <div class="student-test-sidebar-card">
      <div class="student-test-sidebar-label">Questions</div>
      <div class="student-test-question-grid">
        ${questionSidebarHtml}
      </div>
    </div>
  </aside>
  <main class="student-test-content">
    <section class="student-test-header">
      <div class="student-test-header-top">
        <div>
          <h1 class="student-test-title">${escapeHtml(test.name)}</h1>
          <div class="student-test-meta">
            <span class="student-test-chip">Duration: ${test.durationMinutes || 60} minutes</span>
            <span class="student-test-chip">Type: ${escapeHtml(test.testType || "practice")}</span>
            <span class="student-test-chip">${testQuestions.length} questions</span>
          </div>
        </div>
        <div class="student-test-student-box">
          <div><b>${escapeHtml(studentNameForPage)}</b></div>
          <div>Class: ${escapeHtml(studentClassForPage)}</div>
          <div>ID: ${escapeHtml(studentIdForPage)}</div>
        </div>
      </div>
    </section>
    <section class="student-test-main-card">
      <div
        id="questionTimerPanel"
        style="
          display:none;
          background:#f8fafc;
          padding:16px 20px;
          border-radius:12px;
          margin:0 0 16px;
          border:1px solid #e2e8f0;
        "
      >
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <b id="questionProgressText">Question 1 of ${testQuestions.length}</b>
            <div id="questionTimerNote" style="font-size:13px;color:#64748b;margin-top:4px;">
              Answer the question before the timer ends.
            </div>
          </div>
          <div
            id="questionTimerText"
            style="
              font-size:22px;
              font-weight:800;
              color:#dc2626;
            "
          >
            00:00
          </div>
        </div>
      </div>
    ${html}
    <div class="student-test-actions">
      <button
        id="previousQuestionBtn"
        style="display:none;"
      >
        Previous Question
      </button>
      <button
        id="skipQuestionBtn"
        style="display:none;"
      >
        Skip Question
      </button>
      <button
        id="nextQuestionBtn"
        style="display:none;"
      >
        Next Question
      </button>
      <button id="submitBtn">Submit</button>
    </div>
    </section>
  </main>
</div>
<script>
const qs = ${safeJsonForScript(testQuestions)};
window.__testQuestions = qs;
const questionTimersEnabled = ${test.questionTimersEnabled ? "true" : "false"};
const testId = ${safeJsonForScript(String(test._id))};
window.__testId = testId;
const testName = ${safeJsonForScript(test.name)};
const studentId = ${safeJsonForScript(studentId)};
const schoolId = ${safeJsonForScript(String(test.schoolId || ""))};
const schoolCode = ${safeJsonForScript(String(test.schoolCode || ""))};
window.codeMirrorEditors = window.codeMirrorEditors || {};
function blockTestClipboardAction(event){
  event.preventDefault();
  return false;
}
["copy", "paste", "cut", "contextmenu", "dragstart", "drop"].forEach(eventName => {
  document.addEventListener(eventName, blockTestClipboardAction);
});
document.addEventListener("keydown", function(event){
  const key = String(event.key || "").toLowerCase();
  if (
    (event.ctrlKey || event.metaKey) &&
    ["c", "v", "x"].includes(key)
  ) {
    event.preventDefault();
    return false;
  }
});
window.getCodeAnswer = function(qid){
  const editor = window.codeMirrorEditors?.[qid];
  if(editor){
    return editor.state.doc.toString();
  }
  const textarea = document.getElementById("code-" + qid);
  return textarea ? textarea.value : "";
};
document.querySelectorAll(".run-code-button").forEach(button => {
  button.addEventListener("click", function(){
    window.runCode(this.dataset.questionId || "");
  });
});
window.runCode = async function(qid){
  const q = (window.__testQuestions || []).find(item =>
    String(item._id) === String(qid)
  );
  if(!q){
    return;
  }
  const outputBox = document.getElementById("output-" + qid);
  if(!outputBox){
    return;
  }
    const runBtn = document.getElementById("run-" + qid);
  if(runBtn){
    runBtn.disabled = true;
    runBtn.innerText = "Running...";
    runBtn.style.opacity = "0.7";
    runBtn.style.cursor = "not-allowed";
  }
    outputBox.textContent = "Running code...";
  const code = window.getCodeAnswer(qid);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);
  try {
    const res = await fetch("/api/code/run", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        code,
        language: q.codingMeta?.language || "javascript",
        functionName: q.codingMeta?.functionName || "",
        testCases: q.testCases || [],
        schoolId,
        schoolCode,
        studentId,
        testId,
        questionId: qid,
        testName,
        questionType: q.type || "coding"
      })
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if(data.error){
      outputBox.textContent = "Error:\\n\\n" + data.error;
    } else {
      outputBox.textContent = data.output || "No output";
    }
  } catch(err){
    clearTimeout(timeoutId);
    if(err.name === "AbortError"){
      outputBox.textContent =
        "Execution timed out. Check for infinite loops or server /run-code issue.";
    } else {
      outputBox.textContent = "Execution failed";
    }
  }
  if(runBtn){
    runBtn.disabled = false;
    runBtn.innerText = "Run Code";
    runBtn.style.opacity = "1";
    runBtn.style.cursor = "pointer";
  }
};
document.addEventListener("keydown", function(e){
  if(!e.target.classList.contains("code-editor")) return;
  const textarea = e.target;
  if(e.key === "Tab"){
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const indent = "  ";
    textarea.value =
      value.substring(0, start) +
      indent +
      value.substring(end);
    textarea.selectionStart = textarea.selectionEnd =
      start + indent.length;
  }
if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
  e.preventDefault();
  const questionId = textarea.dataset.questionId;
  const storageKey = "code_answer_" + testId + "_" + questionId;
  localStorage.setItem(storageKey, textarea.value);
  return;
}
  if(e.key === "Enter"){
    e.preventDefault();
    const start = textarea.selectionStart;
    const value = textarea.value;
    const beforeCursor = value.substring(0, start);
    const currentLine = beforeCursor.split("\\n").pop();
    const indentMatch = currentLine.match(/^(\s+)/);
    const currentIndent = indentMatch ? indentMatch[1] : "";
    const extraIndent =
      currentLine.trim().endsWith("{") ||
      currentLine.trim().endsWith(":")
        ? "  "
        : "";
    const insertText =
      "\\n" + currentIndent + extraIndent;
    textarea.value =
      value.substring(0, start) +
      insertText +
      value.substring(textarea.selectionEnd);
    const newPos = start + insertText.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
  }
});
document.querySelectorAll(".code-editor").forEach(editor => {
  const questionId = editor.dataset.questionId;
  const storageKey = "code_answer_" + testId + "_" + questionId;
  const saved = localStorage.getItem(storageKey);
  if(saved !== null){
    editor.value = saved;
  }
  editor.addEventListener("input", function(){
    localStorage.setItem(storageKey, editor.value);
    answeredQuestions[String(questionId)] = true;
    delete skippedQuestions[String(questionId)];
    updateQuestionCompletion(questionId);
  });
});
let currentQuestionIndex = 0;
let questionTimerInterval = null;
let questionTimeRemaining = 0;
let timedOutQuestions = {};
let skippedQuestions = {};
let answeredQuestions = {};
function updateSidebarQuestionStatus(){
  document.querySelectorAll(".student-test-question-row").forEach(row => {
    const index = Number(row.dataset.sidebarQuestionIndex);
    const q = qs[index];
    row.classList.remove("is-current", "is-answered", "is-skipped");
    if(!q){
      return;
    }
    const qid = String(q._id);
    if(index === currentQuestionIndex && currentQuestionIndex < qs.length){
      row.classList.add("is-current");
      return;
    }
    if(skippedQuestions[qid]){
      row.classList.add("is-skipped");
      return;
    }
    if(isQuestionAnswered(qid)){
      row.classList.add("is-answered");
    }
  });
}
function getQuestionDurationSeconds(q){
  const difficulty = String(q.difficulty || "medium").toLowerCase();
  if(difficulty === "easy"){
    return 2 * 60;
  }
  if(difficulty === "hard"){
    return 10 * 60;
  }
  return 5 * 60;
}
function formatQuestionTime(seconds){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}
function isQuestionAnswered(qid){
  const q = qs.find(item => String(item._id) === String(qid));
  if(!q){
    return false;
  }
  if(q.type === "coding"){
    return Boolean(answeredQuestions[String(qid)]) &&
      String(window.getCodeAnswer(qid) || "").trim().length > 0;
  }
  const checked = document.querySelectorAll('input[name="q' + qid + '"]:checked');
  return checked.length > 0;
}
function updateQuestionCompletion(qid){
  const qidKey = String(qid);
  if(isQuestionAnswered(qidKey)){
    answeredQuestions[qidKey] = true;
    delete skippedQuestions[qidKey];
  }
  updateSidebarQuestionStatus();
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(!currentQuestion || String(currentQuestion._id) !== String(qid)){
    return;
  }
  const nextBtn = document.getElementById("nextQuestionBtn");
  if(!nextBtn){
    return;
  }
  nextBtn.style.display = isQuestionAnswered(qid) ? "inline-block" : "none";
}
function showCurrentQuestion(){
  const cards = document.querySelectorAll(".test-question-card");
  const timerPanel = document.getElementById("questionTimerPanel");
  const nextBtn = document.getElementById("nextQuestionBtn");
  const previousBtn = document.getElementById("previousQuestionBtn");
  const skipBtn = document.getElementById("skipQuestionBtn");
  const submitBtn = document.getElementById("submitBtn");
  cards.forEach(card => {
    card.style.display = "none";
  });
  const currentCard = cards[currentQuestionIndex];
  if(currentCard){
    currentCard.style.display = "block";
  }
  if(timerPanel){
    timerPanel.style.display = "block";
  }
  if(previousBtn){
    previousBtn.style.display = questionTimersEnabled ? "inline-block" : "none";
    previousBtn.disabled = currentQuestionIndex <= 0;
  }
  if(skipBtn){
    skipBtn.style.display = questionTimersEnabled ? "inline-block" : "none";
  }
  if(nextBtn){
    nextBtn.style.display = "none";
  }
  if(submitBtn){
    submitBtn.style.display = "none";
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(!currentQuestion){
    if(submitBtn){
      submitBtn.style.display = "inline-block";
    }
    return;
  }
  const progressText = document.getElementById("questionProgressText");
  if(progressText){
    progressText.innerText =
      "Question " + (currentQuestionIndex + 1) + " of " + qs.length;
  }
  if(window.codeMirrorEditors){
    const editor = window.codeMirrorEditors[String(currentQuestion._id)];
    if(editor && typeof editor.requestMeasure === "function"){
      setTimeout(() => editor.requestMeasure(), 50);
    }
  }
  updateQuestionCompletion(String(currentQuestion._id));
  updateSidebarQuestionStatus();
  startQuestionTimer(currentQuestion);
}
function startQuestionTimer(q){
  clearInterval(questionTimerInterval);
  questionTimeRemaining = getQuestionDurationSeconds(q);
  const timerText = document.getElementById("questionTimerText");
  if(timerText){
    timerText.innerText = formatQuestionTime(questionTimeRemaining);
  }
  questionTimerInterval = setInterval(() => {
    questionTimeRemaining--;
    if(timerText){
      timerText.innerText = formatQuestionTime(Math.max(questionTimeRemaining, 0));
    }
    if(questionTimeRemaining <= 0){
      clearInterval(questionTimerInterval);
      timedOutQuestions[String(q._id)] = true;
      goToNextQuestion("timer");
    }
  }, 1000);
}
function goToQuestionIndex(index){
  if(!questionTimersEnabled){
    return;
  }
  if(index < 0 || index >= qs.length){
    return;
  }
  clearInterval(questionTimerInterval);
  currentQuestionIndex = index;
  showCurrentQuestion();
}
function goToPreviousQuestion(){
  goToQuestionIndex(currentQuestionIndex - 1);
}
function skipCurrentQuestion(){
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(currentQuestion){
    const qid = String(currentQuestion._id);
    if(!isQuestionAnswered(qid)){
      skippedQuestions[qid] = true;
    }
  }
  goToNextQuestion("skipped");
}
function goToNextQuestion(reason){
  if(!questionTimersEnabled){
    return;
  }
  const currentQuestion = qs[currentQuestionIndex];
  if(currentQuestion && reason === "answered"){
    const qid = String(currentQuestion._id);
    if(isQuestionAnswered(qid)){
      answeredQuestions[qid] = true;
      delete skippedQuestions[qid];
    }
  }
  clearInterval(questionTimerInterval);
  currentQuestionIndex++;
  if(currentQuestionIndex >= qs.length){
    const timerPanel = document.getElementById("questionTimerPanel");
    const nextBtn = document.getElementById("nextQuestionBtn");
    const previousBtn = document.getElementById("previousQuestionBtn");
    const skipBtn = document.getElementById("skipQuestionBtn");
    const submitBtn = document.getElementById("submitBtn");
    document.querySelectorAll(".test-question-card").forEach(card => {
      card.style.display = "block";
    });
    if(timerPanel){
      timerPanel.style.display = "none";
    }
    if(previousBtn){
      previousBtn.style.display = "none";
    }
    if(skipBtn){
      skipBtn.style.display = "none";
    }
    if(nextBtn){
      nextBtn.style.display = "none";
    }
    if(submitBtn){
      submitBtn.style.display = "inline-block";
    }
    updateSidebarQuestionStatus();
    return;
  }
  showCurrentQuestion();
}
  const previousQuestionBtn = document.getElementById("previousQuestionBtn");
if(previousQuestionBtn){
  previousQuestionBtn.addEventListener("click", goToPreviousQuestion);
}

const skipQuestionBtn = document.getElementById("skipQuestionBtn");
if(skipQuestionBtn){
  skipQuestionBtn.addEventListener("click", skipCurrentQuestion);
}

const nextQuestionBtn = document.getElementById("nextQuestionBtn");
if(nextQuestionBtn){
  nextQuestionBtn.addEventListener("click", function(){
    goToNextQuestion("answered");
  });
}

const submitBtn = document.getElementById("submitBtn");
if(submitBtn){
  submitBtn.addEventListener("click", submitTest);
}
function initializeQuestionTimers(){
  if(!questionTimersEnabled){
    return;
  }
  document.querySelectorAll(".test-question-card input").forEach(input => {
    input.addEventListener("change", function(){
      const card = this.closest(".test-question-card");
      if(!card){
        return;
      }
      const qid = String(card.dataset.questionId || "");
      if(qid){
        answeredQuestions[qid] = true;
        delete skippedQuestions[qid];
      }
      updateQuestionCompletion(card.dataset.questionId);
    });
  });
  showCurrentQuestion();
    document.querySelectorAll(".student-test-question-row").forEach(row => {
    row.addEventListener("click", function(){
      const index = Number(row.dataset.sidebarQuestionIndex);
      goToQuestionIndex(index);
    });
  });
  updateSidebarQuestionStatus();
  window.updateQuestionCompletion = updateQuestionCompletion;
}
const startExamBtn = document.getElementById("startExamBtn");
if(startExamBtn){
  startExamBtn.addEventListener("click", function(){
    const startBtn = document.getElementById("startExamBtn");
    if(startBtn){
      startBtn.disabled = true;
      startBtn.innerText = "Starting...";
    }
    const startNow = function(){
      startExamMode();
      initializeQuestionTimers();
      document.getElementById("examGate").remove();
    };
    if(document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen()
        .then(startNow)
        .catch(startNow);
    } else {
      startNow();
    }
  });
}
function startExamMode(){
  window.__examTriggered = false;
  history.pushState(null, null, location.href);
  const durationMinutes = ${test.durationMinutes || 0};
  if(durationMinutes > 0){
    const durationMs = durationMinutes * 60 * 1000;
    setTimeout(() => {
      if (!window.__examTriggered) {
        window.__examTriggered = true;
        autoSubmit("Time up");
      }
    }, durationMs);
  }
  window.onpopstate = function () {
    if (!window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Back button");
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Tab switch");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Exited fullscreen");
    }
  });
  setTimeout(() => {
    window.addEventListener("blur", () => {
      if (!window.__examTriggered) {
        window.__examTriggered = true;
        autoSubmit("Focus lost");
      }
    });
  }, 1500);
}
function autoSubmit(reason){
  window.__submitReason = reason || "Manual submit";
  submitTest();
}
function submitTest(){
  if(window.__submitting){
    return;
  }
  window.__submitting = true;
  const btn = document.getElementById("submitBtn");
  if(btn){
    btn.disabled = true;
    btn.innerText = window.__submitReason
      ? "Auto-submitting..."
      : "Submitting...";
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";
  }
  let score = 0;
  let answers = [];
  try {
    qs.forEach(q => {
      const qid = String(q._id);
      let selected = null;
      let isCorrect = false;
      if(q.type === "coding"){
        selected = window.getCodeAnswer(qid);
      } else {
        if(q.correctAnswers && q.correctAnswers.length > 1){
          selected = Array.from(
            document.querySelectorAll('input[name="q'+qid+'"]:checked')
          ).map(el => el.value);
        } else {
          const s = document.querySelector('input[name="q'+qid+'"]:checked');
          selected = s ? s.value : null;
        }
        if(q.correctAnswers && q.correctAnswers.length){
          if(Array.isArray(selected)){
            isCorrect =
              selected.length === q.correctAnswers.length &&
              selected.every(v => q.correctAnswers.includes(v));
          } else {
            isCorrect = q.correctAnswers.includes(selected);
          }
        } else {
          isCorrect = selected === q.correct;
        }
        if(isCorrect){
          score++;
        }
      }
      answers.push({
        questionId: qid,
        type: q.type,
        selected,
        correctAnswer: q.correctAnswers && q.correctAnswers.length
          ? q.correctAnswers
          : q.correct,
        isCorrect
      });
    });
  } catch(err){
    alert("Submit failed while collecting answers");
    window.__submitting = false;
    if(btn){
      btn.disabled = false;
      btn.innerText = "Submit";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
    return;
  }
  fetch("/api/student/submit", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    keepalive:true,
    body: JSON.stringify({
      studentId,
      testId,
      testName,
      score,
      total: qs.length,
      answers
    })
  })
  .then(res => res.json())
  .then(() => {
        document.querySelectorAll(".code-editor").forEach(editor => {
      const questionId = editor.dataset.questionId;
      localStorage.removeItem("code_answer_" + testId + "_" + questionId);
      localStorage.removeItem("code_language_" + testId + "_" + questionId);
    });
        alert(window.__submitReason
      ? "Test submitted automatically: " + window.__submitReason
      : "Submitted"
    );
    window.location.replace("/my-tests");
  })
  .catch(() => {
    alert("Submit failed");
    window.__submitting = false;
    if(btn){
      btn.disabled = false;
      btn.innerText = "Submit";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  });
}
</script>
<script type="module">
import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { python } from "https://esm.sh/@codemirror/lang-python@6.1.7";
window.codeMirrorEditors = window.codeMirrorEditors || {};
document.querySelectorAll(".cm-editor-host").forEach(host => {
  const questionId = host.dataset.questionId;
  const textarea = document.getElementById("code-" + questionId);
  const storageKey = "code_answer_" + testId + "_" + questionId;
  const saved = localStorage.getItem(storageKey);
  const initialCode =
    saved !== null
      ? saved
      : textarea
        ? textarea.value
        : "";
    const question = (window.__testQuestions || []).find(item =>
  String(item._id) === String(questionId)
);
const savedLanguage = question?.codingMeta?.language || "javascript";
  const editor = new EditorView({
    doc: initialCode,
    extensions: [
      basicSetup,
      savedLanguage === "python" ? python() : javascript(),
      EditorView.theme({
        "&": {
          height: "360px",
          backgroundColor: "#020617",
          color: "#e2e8f0",
          fontSize: "14px"
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "Consolas, Monaco, monospace",
          lineHeight: "1.6"
        },
        ".cm-content": {
          padding: "14px",
          caretColor: "#ffffff"
        },
        ".cm-gutters": {
          backgroundColor: "#0f172a",
          color: "#64748b",
          border: "none"
        },
        ".cm-activeLine": {
          backgroundColor: "#0f172a"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#0f172a"
        },
        ".cm-cursor": {
          borderLeftColor: "#ffffff"
        }
      }),
      EditorView.domEventHandlers({
        keydown(event, view){
          if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s"){
            event.preventDefault();
            const value = view.state.doc.toString();
            localStorage.setItem(storageKey, value);
            if(textarea){
              textarea.value = value;
            }
            return true;
          }
          return false;
        }
      }),
      EditorView.updateListener.of(update => {
        if(update.docChanged){
          const value = update.state.doc.toString();
          localStorage.setItem(storageKey, value);
          if(textarea){
            textarea.value = value;
          }
          answeredQuestions[String(questionId)] = true;
          delete skippedQuestions[String(questionId)];
          if(typeof window.updateQuestionCompletion === "function"){
            window.updateQuestionCompletion(questionId);
          }
        }
      })
    ],
    parent: host
  });
  window.codeMirrorEditors[questionId] = editor;
  host.style.display = "block";
  host.style.flex = "1";
  host.style.width = "100%";
  if(textarea){
    textarea.style.display = "none";
  }
  const languageBadge = document.querySelector(
    '.language-badge[data-question-id="' + questionId + '"]'
  );
  if(languageBadge){
    languageBadge.textContent =
      savedLanguage === "python" ? "Python" : "JavaScript";
    languageBadge.title = "Language is set by the question";
  }
});
window.getCodeAnswer = function(qid){
  const editor = window.codeMirrorEditors?.[qid];
  if(editor){
    return editor.state.doc.toString();
  }
  const textarea = document.getElementById("code-" + qid);
  return textarea ? textarea.value : "";
};
</script>
</body>
</html>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading test");
  }
});
module.exports = router;
module.exports = router;
