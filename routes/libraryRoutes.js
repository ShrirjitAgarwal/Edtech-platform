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
<button onclick="go('/create-question')" style="
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
<button onclick="go('/my-questions')" style="
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
oninput="renderLibrary()"
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
<select id="subjectFilter" onchange="renderLibrary()" style="
width:100%;
padding:6px 8px;
border:1px solid #cbd5e1;
font-size:13px;
">
<option value="all">All</option>
</select>
</div>
<div>
<label style="font-size:13px;">Board</label><br>
<select id="boardFilter" onchange="renderLibrary()" style="
width:100%;
padding:6px 8px;
border:1px solid #cbd5e1;
font-size:13px;
">
<option value="all">All</option>
</select>
</div>
<div>
<label style="font-size:13px;">Difficulty</label><br>
<select id="difficultyFilter" onchange="renderLibrary()" style="
width:100%;
padding:6px 8px;
border:1px solid #cbd5e1;
font-size:13px;
">
<option value="all">All</option>
<option value="easy">Easy</option>
<option value="medium">Medium</option>
<option value="hard">Hard</option>
</select>
</div>
<div>
<label style="font-size:13px;">Attempt</label><br>
<select id="attemptFilter" onchange="renderLibrary()" style="
width:100%;
padding:6px 8px;
border:1px solid #cbd5e1;
font-size:13px;
">
<option value="all">All</option>
<option value="attempted">Attempted</option>
<option value="not_attempted">Not Attempted</option>
</select>
</div>
<div>
<label style="font-size:13px;">Library Type</label><br>
<select id="scopeFilter" onchange="renderLibrary()" style="
width:100%;
padding:6px 8px;
border:1px solid #cbd5e1;
font-size:13px;
">
<option value="all">All</option>
<option value="public">Platform Questions</option>
<option value="teacher">My Questions</option>
</select>
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
document.getElementById("libraryList").innerHTML =
"<p style='color:#64748b;'>Loading questions...</p>";
fetch("/api/library-data", {
headers:{
"Authorization": "Bearer " + localStorage.getItem("token")
}
})
.then(res => {
if(!res.ok){
throw new Error("Failed to load library");
}
return res.json();
})
.then(data => {
questions = data.questions || [];
populateFilters();
renderLibrary();
})
.catch(err => {
console.error("LIBRARY LOAD ERROR:", err);
document.getElementById("libraryList").innerHTML =
"<p style='color:#dc2626;'>Failed to load questions. Please refresh.</p>";
});
function getVisibleQuestions(){
return questions.filter(q => {
const scope = String(q.scope || "").trim();

return (
scope === "public" ||
scope === "" ||
(
scope === "teacher" &&
String(q.teacherId) === String(teacherId)
)
);
});
}
function populateFilters(){
const visibleQuestions = getVisibleQuestions();
const subjects = [...new Set(
visibleQuestions
.map(q => q.subject || q.category)
.filter(Boolean)
)];
const boards = [...new Set(
visibleQuestions
.map(q => q.board || "General")
.filter(Boolean)
)];
const subjectFilter = document.getElementById("subjectFilter");
const boardFilter = document.getElementById("boardFilter");
subjects.forEach(s => {
const option = document.createElement("option");
option.value = s;
option.textContent = s;
subjectFilter.appendChild(option);
});
boards.forEach(b => {
const option = document.createElement("option");
option.value = b;
option.textContent = b;
boardFilter.appendChild(option);
});
}
function buildQuestionCard(q){
const sourceLabel =
q.scope === "teacher"
? "My Question"
: "Platform Question";
return \`
<div
onclick="previewQuestion('\${q._id}')"
style="
background:#f8fafc;
padding:18px;
margin:12px 0;
border-radius:12px;
border:1px solid #e5e7eb;
display:flex;
justify-content:space-between;
align-items:center;
gap:16px;
cursor:pointer;
">
<div>
<p style="margin:0 0 8px 0;font-weight:600;">
\${q.question || "Untitled Question"}
</p>
<p style="margin:0;color:#666;font-size:14px;">
\${q.subject || q.category || "No Subject"} |
\${q.board || "Other"} |
\${q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "No Difficulty"} |
\${sourceLabel}
</p>
<p style="margin:6px 0 0 0;color:#64748b;font-size:13px;">
Attempted: \${q.analytics?.attempted || 0} |
Completed: \${q.analytics?.correct || 0} |
Incomplete: \${q.analytics?.incorrect || 0}
</p>
</div>
<button onclick="event.stopPropagation(); addToTest('\${q._id}')" style="
padding:10px 14px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
font-weight:600;
cursor:pointer;
">
+ Add to Test
</button>
</div>
\`;
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
"<b>Option " + (index + 1) + ":</b> " + opt +
"</div>"
).join("")
: "<p style='color:#64748b;'>No options found. This may be a coding or written question.</p>";
const sourceLabel =
q.scope === "teacher"
? "My Question"
: "Platform Question";
document.getElementById("questionPreview").innerHTML =
"<h2 style='margin-top:0;'>Question Preview</h2>" +
"<div style='background:#f8fafc;padding:15px;border-radius:10px;margin-bottom:15px;'>" +
"<b>Question:</b><br>" +
"<div style='margin-top:8px;line-height:1.5;'>" + (q.question || "No question text") + "</div>" +
"</div>" +
"<div style='margin-bottom:15px;'>" +
optionsHtml +
"</div>" +
"<div style='background:#ecfdf5;padding:12px;border-radius:10px;margin-bottom:12px;'>" +
"<b>Correct Answer:</b> " + (q.correct || "N/A") +
"</div>" +
"<p><b>Subject:</b> " + (q.subject || q.category || "N/A") + "</p>" +
"<p><b>Board:</b> " + (q.board || "N/A") + "</p>" +
"<p><b>Difficulty:</b> " + (q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "N/A") + "</p>" +
"<p><b>Library Type:</b> " + sourceLabel + "</p>" +
"<div style='background:#eef2ff;padding:12px;border-radius:10px;margin-top:12px;'>" +
"<b>Analytics</b><br>" +
"Attempted: " + (q.analytics?.attempted || 0) + "<br>" +
"Completed: " + (q.analytics?.correct || 0) + "<br>" +
"Incomplete: " + (q.analytics?.incorrect || 0) +
"</div>" +
"<button onclick=\\"addToTest('" + q._id + "')\\" style=\\"" +
"margin-top:18px;" +
"padding:10px 14px;" +
"background:#4f46e5;" +
"color:white;" +
"border:none;" +
"border-radius:8px;" +
"font-weight:600;" +
"cursor:pointer;" +
"\\">+ Add to Test</button>";
}
function renderLibrary(){
const subject = document.getElementById("subjectFilter").value;
const board = document.getElementById("boardFilter").value;
const scope = document.getElementById("scopeFilter").value;
const difficulty = document.getElementById("difficultyFilter").value;
const attempt = document.getElementById("attemptFilter").value;
const searchValue =
(document.getElementById("questionSearch").value || "")
.trim()
.toLowerCase();
let visibleQuestions = getVisibleQuestions();
visibleQuestions = visibleQuestions.filter(q => {
const qSubject = q.subject || q.category;
const qBoard = q.board || "General";
const questionText = String(q.question || "").toLowerCase();
const subjectMatch =
subject === "all" || qSubject === subject;
const boardMatch =
board === "all" || qBoard === board;
const scopeMatch =
scope === "all" || q.scope === scope;
const searchMatch =
!searchValue || questionText.includes(searchValue);
const difficultyMatch =
difficulty === "all" ||
String(q.difficulty || "").toLowerCase() === difficulty;
const attemptedCount = q.analytics?.attempted || 0;
const attemptMatch =
attempt === "all" ||
(attempt === "attempted" && attemptedCount > 0) ||
(attempt === "not_attempted" && attemptedCount === 0);
return subjectMatch && boardMatch && scopeMatch && searchMatch && difficultyMatch && attemptMatch;
});
document.getElementById("libraryList").innerHTML =
visibleQuestions.length
? visibleQuestions.map(q => buildQuestionCard(q)).join("")
: "<p>No questions found</p>";
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
   $or: [
     publicQuestionQuery,
     teacherQuestionQuery
   ]
 };
    const [questions, total] = await Promise.all([
      Question.find(query)
        .select("question options correct correctAnswers subject category board difficulty scope teacherId type analytics createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(query)
    ]);
    res.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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