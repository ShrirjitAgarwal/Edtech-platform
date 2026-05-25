const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
const backButton = require("../views/backButton");

// ---------- TEACHER TEST LIST ----------
router.get("/teacher-tests", authMiddleware, async (req, res) => {
  const content = `
    <div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Tests</h1>
  ${backButton("/teacher")}
</div>
    <div style="margin-bottom:20px;">
      <button onclick="go('/create-test')" style="
        padding:14px 20px;
        background:linear-gradient(135deg,#4f46e5,#6366f1);
        color:white;
        border:none;
        border-radius:10px;
        font-weight:700;
        cursor:pointer;
        margin-bottom:15px;
        font-size:15px;
      ">
        + Create Test
      </button>
      <button onclick="openSelectedSettings()" style="
  margin-left:10px;
  padding:12px 16px;
  background:#334155;
  color:white;
  border:none;
  border-radius:8px;
  cursor:pointer;
  font-weight:600;
">
  Test Settings
</button>
      <button onclick="deleteSelected()" style="
        margin-left:10px;
        padding:12px 16px;
        background:#dc3545;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        font-weight:600;
      ">
        Delete Selected
      </button>
    </div>
    <div style="
 display:grid;
 grid-template-columns:1fr 1fr;
 gap:22px;
 align-items:stretch;
 height:calc(100vh - 180px);
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
        <h2 style="margin-top:0;">Test List</h2>
        <div id="testList"></div>
      </div>
      <div
        id="testPreview"
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
        <h2 style="margin-top:0;">Test Analytics</h2>
        <p style="color:#64748b;">
          Select a test to preview analytics here.
        </p>
      </div>
    </div>
    <script>
      let myTests = [];
      let myAssignments = [];
      let myStudents = [];
      let myResults = [];
      window.onload = function(){
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const token = localStorage.getItem("token");
        if(!user || !token){
          return window.location.replace("/");
        }
        document.getElementById("testList").innerHTML =
          "<p style='color:#64748b;'>Loading tests...</p>";
        fetch("/api/teacher-tests-data", {
          headers:{
            "Authorization": "Bearer " + token
          }
        })
        .then(res => {
          if(!res.ok){
            throw new Error("Failed to load tests data");
          }
          return res.json();
        })
        .then(data => {
          myTests = data.tests || [];
          myAssignments = data.assignments || [];
          myStudents = data.students || [];
          myResults = data.results || [];
        const html = myTests.map(t => \`
          <div
            onclick="previewTest('\${t._id}')"
            style="
              background:#f8fafc;
              padding:18px 20px;
              margin:15px 0;
              border-radius:12px;
              display:flex;
              justify-content:space-between;
              align-items:center;
              cursor:pointer;
              border:1px solid #e5e7eb;
            "
          >
            <div style="display:flex;align-items:center;gap:10px;">
              <input
                type="checkbox"
                class="testCheckbox"
                value="\${t._id}"
                onclick="event.stopPropagation()"
              >
              <div>
                <div style="font-size:18px;font-weight:700;">
                  \${t.name || "Untitled Test"}
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;">
  <span style="
    font-size:12px;
    background:#4f46e5;
    color:white;
    padding:5px 10px;
    border-radius:999px;
    font-weight:700;
  ">
    \${t.subject || "No Subject"}
  </span>
  <span style="
    font-size:12px;
    background:#6366f1;
    color:white;
    padding:5px 10px;
    border-radius:999px;
    font-weight:700;
  ">
    \${t.className || "No Class"}
  </span>
  <span style="
    font-size:12px;
    padding:5px 10px;
    border-radius:999px;
    font-weight:700;
    background:\${t.status === "published" ? "#16a34a" : "#7c3aed"};
    color:white;
  ">
    \${t.status === "published" ? "Published" : "Draft"}
  </span>
</div>
              </div>
            </div>
<div style="display:flex;gap:10px;align-items:center;">
  \${t.status !== "published" ? \`
    <button onclick="event.stopPropagation(); go('/create-test?id=\${t._id}')"
      style="padding:10px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
      Edit
    </button>
  \` : ""}
  <button onclick="event.stopPropagation(); assignTest('\${t._id}')"
    style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
    \${t.status === "published" ? "Published" : "Publish"}
  </button>
</div>
          </div>
        \`).join("");
        document.getElementById("testList").innerHTML =
          html || "<p>No tests found</p>";
          window.previewTest = function(testId){
          const test = myTests.find(t =>
            String(t._id) === String(testId)
          );
          if(!test){
            return;
          }
          const assignment = myAssignments.find(a =>
            String(a.testId) === String(testId)
          );
          const className =
            test.className ||
            assignment?.className ||
            "N/A";
          const classStudents = myStudents.filter(s =>
            String(s.class || "").trim().toUpperCase() ===
            String(className || "").trim().toUpperCase()
          );
          const testResults = myResults.filter(r =>
            String(r.testId) === String(testId)
          );
          const attempted = testResults.length;
          const totalStudents = classStudents.length;
          const notAttempted = Math.max(totalStudents - attempted, 0);
          let passed = 0;
          let failed = 0;
          let totalPercent = 0;
          testResults.forEach(r => {
            const percent = r.total
              ? Math.round((r.score / r.total) * 100)
              : 0;
            totalPercent += percent;
            if(percent >= 50){
              passed++;
            } else {
              failed++;
            }
          });
          const classAverage = attempted
            ? Math.round(totalPercent / attempted)
            : 0;
          const createdDate = test.createdAt
            ? new Date(test.createdAt).toLocaleString()
            : "N/A";
          const assignedDate = assignment?.createdAt
            ? new Date(assignment.createdAt).toLocaleString()
            : "N/A";
          document.getElementById("testPreview").innerHTML = \`
            <h2 style="margin-top:0;">\${test.name || "Untitled Test"}</h2>
            <div style="
              background:#f8fafc;
              padding:14px;
              border-radius:10px;
              margin-bottom:14px;
              border:1px solid #e5e7eb;
            ">
              <p><b>Assigned Class:</b> \${className}</p>
              <p><b>Subject:</b> \${test.subject || "N/A"}</p>
              <p><b>Status:</b> \${test.status === "published" ? "Published" : "Draft"}</p>
<p><b>Test Type:</b> \${test.testType || "practice"}</p>
<p><b>Duration:</b> \${test.durationMinutes || 60} minutes</p>
<p><b>Scheduled At:</b> \${test.scheduledAt ? new Date(test.scheduledAt).toLocaleString() : "Not scheduled"}</p>
<p><b>Date Created:</b> \${createdDate}</p>
              <p><b>Date Assigned:</b> \${assignedDate}</p>
            </div>
            <div style="
              display:grid;
              grid-template-columns:1fr 1fr;
              gap:12px;
              margin-bottom:14px;
            ">
              <div style="background:#eef2ff;padding:14px;border-radius:10px;">
                <b>Total Students</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;">
                  \${totalStudents}
                </div>
              </div>
              <div style="background:#ecfdf5;padding:14px;border-radius:10px;">
                <b>Attempted</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;">
                  \${attempted}
                </div>
              </div>
              <div style="background:#fff7ed;padding:14px;border-radius:10px;">
                <b>Not Attempted</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;">
                  \${notAttempted}
                </div>
              </div>
              <div style="background:#f8fafc;padding:14px;border-radius:10px;">
                <b>Class Average</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;">
                  \${classAverage}%
                </div>
              </div>
              <div style="background:#ecfdf5;padding:14px;border-radius:10px;">
                <b>Passed</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;color:#16a34a;">
                  \${passed}
                </div>
              </div>
              <div style="background:#fef2f2;padding:14px;border-radius:10px;">
                <b>Failed</b>
                <div style="font-size:28px;font-weight:800;margin-top:8px;color:#dc2626;">
                  \${failed}
                </div>
              </div>
            </div>
            <p style="color:#64748b;">
              Passing score is 50% and above.
            </p>
          \`;
        };
        })
        .catch(err => {
          console.error("TEACHER TESTS LOAD ERROR:", err);
          document.getElementById("testList").innerHTML =
            "<p style='color:#dc2626;'>Failed to load tests. Please refresh.</p>";
        });
      };
      function assignTest(testId){
        fetch("/assign-test", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ testId })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert(data.message || "Test assigned");
          location.reload();
        })
        .catch(() => alert("Assignment failed"));
      }
      function confirmDelete(id){
        if(!confirm("Delete test?")) return;
        fetch("/delete-test", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert("Test deleted");
          location.reload();
        })
        .catch(() => alert("Delete failed"));
      }
function openSelectedSettings(){
  window.location.replace("/test-settings");
}
      function deleteSelected(){
        const selected = Array.from(
          document.querySelectorAll(".testCheckbox:checked")
        ).map(cb => cb.value);
        if(selected.length === 0){
          alert("No tests selected");
          return;
        }
        if(!confirm("Delete selected tests?")) return;
        fetch("/delete-multiple-tests", {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({ ids: selected })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(data.error);
            return;
          }
          alert("Deleted successfully");
          location.reload();
        })
        .catch(() => alert("Bulk delete failed"));
      }
    </script>
  `;
  res.send(layout(content, "tests"));
});
// ---------- TEACHER TESTS DATA API ----------
router.get("/api/teacher-tests-data", authMiddleware, async (req, res) => {
  try {
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const Student = require("../models/Student");
    const Result = require("../models/Result");
    const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const schoolScopedFilter = schoolId
  ? { teacherId, schoolId }
  : { teacherId };
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50"), 1),
      100
    );
    const skip = (page - 1) * limit;
    const [tests, totalTests, assignments, students, results] =
      await Promise.all([
        Test.find(schoolScopedFilter)
          .select("name subject className status teacherId testType durationMinutes scheduledAt createdAt publishedAt")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Test.countDocuments(schoolScopedFilter),
        Assignment.find(schoolScopedFilter)
          .select("testId testName className teacherId createdAt")
          .lean(),
        Student.find(schoolScopedFilter)
          .select("studentId name class teacherId")
          .limit(5000)
          .lean(),
Result.find(schoolScopedFilter)
  .select("studentId testId testName teacherId score total date")
  .sort({ date: -1 })
  .limit(500)
  .lean()
      ]);
    res.json({
      tests,
      assignments,
      students,
      results,
      pagination: {
        page,
        limit,
        total: totalTests,
        totalPages: Math.ceil(totalTests / limit),
        hasNextPage: page * limit < totalTests,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error("TEACHER TESTS DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load teacher tests data"
    });
  }
});
// ---------- CREATE TEST ----------
router.get("/create-test", authMiddleware, async (req, res) => {
try {
const Question = require("../models/Question");
const ClassSubject = require("../models/ClassSubject");

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

const assignedClasses = [...new Set(
  classSubjectMappings
    .map(mapping => String(mapping.className || "").trim().toUpperCase())
    .filter(Boolean)
)];

const assignedSubjects = [...new Set(
  classSubjectMappings
    .filter(mapping => {
      if (!editTest?.className) {
        return true;
      }

      return (
        String(mapping.className || "").trim().toUpperCase() ===
        String(editTest.className || "").trim().toUpperCase()
      );
    })
    .map(mapping => String(mapping.subject || "").trim())
    .filter(Boolean)
)];

const classOptionsHtml = assignedClasses.length
  ? assignedClasses.map(className => `
<option value="${className}" ${editTest?.className === className ? "selected" : ""}>${className}</option>
`).join("")
  : `<option value="">No assigned classes</option>`;

const subjectOptionsHtml = assignedSubjects.length
  ? assignedSubjects.map(subject => `
<option value="${subject}" ${editTest?.subject === subject ? "selected" : ""}>${subject}</option>
`).join("")
  : `<option value="">No assigned subjects</option>`;

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
  margin-bottom:20px;
">
  <h1 style="margin:0;">Create Test</h1>
${backButton("/teacher-tests")}
</div>
${noMappingsNotice}
<div style="
background:white;
padding:20px;
border-radius:14px;
box-shadow:0 4px 12px rgba(0,0,0,0.08);
margin-bottom:20px;
">
<div style="
 display:grid;
 grid-template-columns:1.2fr 0.9fr 0.9fr;
 gap:14px;
">
 <input id="testName" value="${editTest?.name || ""}" placeholder="Enter test name" style="
 padding:12px;
 border-radius:8px;
 border:1px solid #ccc;
 "/>
 <select id="className" onchange="updateSubjectOptions()" style="
 padding:12px;
 border-radius:8px;
 border:1px solid #ccc;
 ">
 <option value="">Select Class</option>
${classOptionsHtml}
 </select>
 <select id="subject" style="
 padding:12px;
 border-radius:8px;
 border:1px solid #ccc;
 ">
 <option value="">Select Subject</option>
${subjectOptionsHtml}
 </select>
</div>
</div>
<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:22px;
align-items:start;
">
<div style="
background:white;
padding:20px;
border-radius:14px;
box-shadow:0 4px 12px rgba(0,0,0,0.08);
height:620px;
box-sizing:border-box;
display:flex;
flex-direction:column;
">
 <div style="
 display:flex;
 justify-content:space-between;
 align-items:center;
 gap:12px;
 margin-bottom:14px;
 flex-wrap:wrap;
 ">
 <h3 style="margin:0;">Select Questions</h3>
 <div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px;
min-width:260px;
">
 <select id="questionSubjectFilter" onchange="filterQuestions()" style="
 padding:8px;
 border-radius:8px;
 border:1px solid #cbd5e1;
 ">
 <option value="all">All Subjects</option>
 </select>
 <select id="questionBoardFilter" onchange="filterQuestions()" style="
 padding:8px;
 border-radius:8px;
 border:1px solid #cbd5e1;
 ">
 <option value="all">All Boards</option>
 </select>
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
 <button onclick="clearSelection()" style="
 margin-top:14px;
 padding:8px 12px;
 background:#dc3545;
 color:white;
 border:none;
 border-radius:6px;
 cursor:pointer;
 ">
 Clear Selection
 </button>
 <button onclick="saveTest()" style="
 margin-top:20px;
 width:100%;
 padding:12px;
 background:#4f46e5;
 color:white;
 border:none;
 border-radius:8px;
 font-weight:600;
 cursor:pointer;
 font-size:16px;
 ">
 Save Test
 </button>
</div>
<div
 id="questionPreview"
 style="
 background:white;
 padding:22px;
 border-radius:14px;
 box-shadow:0 4px 12px rgba(0,0,0,0.08);
 height:620px;
 overflow-y:auto;
 box-sizing:border-box;
 "
>
 <h3 style="margin-top:0;">Question Preview</h3>
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
const assignedClassSubjects = ${JSON.stringify(classSubjectMappings)};
const editingTestId = "${editTest?._id || ""}";
const editingQuestionIds = ${JSON.stringify((editTest?.questionIds || []).map(id => String(id)))};
if(editingTestId){
 localStorage.setItem("selectedQuestions", JSON.stringify(editingQuestionIds));
}
const allQuestions = ${JSON.stringify(questions)};
const questions = allQuestions.filter(q =>
 q.scope === "public" ||
 (
   q.scope === "teacher" &&
   String(q.teacherId) === String(teacherId)
 )
);
function getQuestionId(q){
 return String(q._id);
}
function buildQuestionRow(q){
 const id = getQuestionId(q);
 return \`
<label
onclick="previewQuestion('\${id}')"
style="
 display:block;
 padding:12px;
 border:1px solid #ddd;
 border-radius:10px;
 margin-bottom:10px;
 cursor:pointer;
 background:white;
"
>
<input type="checkbox" value="\${id}" class="qbox" onclick="event.stopPropagation()">
\${q.question}
</label>
\`;
}
function populateQuestionFilters(){
 const subjectSelect =
 document.getElementById("questionSubjectFilter");
 const boardSelect =
 document.getElementById("questionBoardFilter");
 const subjects = [...new Set(
 questions.map(q => q.subject || q.category).filter(Boolean)
 )];
 const boards = [...new Set(
 questions.map(q => q.board || "General").filter(Boolean)
 )];
 subjects.forEach(s => {
 const option = document.createElement("option");
 option.value = s;
 option.textContent = s;
 subjectSelect.appendChild(option);
 });
 boards.forEach(b => {
 const option = document.createElement("option");
 option.value = b;
 option.textContent = b;
 boardSelect.appendChild(option);
 });
}
function filterQuestions(){
 const subject =
 document.getElementById("questionSubjectFilter").value;
 const board =
 document.getElementById("questionBoardFilter").value;
 const filtered = questions.filter(q => {
 const qSubject = q.subject || q.category;
 const qBoard = q.board || "General";
 const subjectMatch =
 subject === "all" || qSubject === subject;
 const boardMatch =
 board === "all" || qBoard === board;
 return subjectMatch && boardMatch;
 });
 document.getElementById("questionList").innerHTML =
 filtered.length
 ? filtered.map(q => buildQuestionRow(q)).join("")
 : "<p style='color:#64748b;'>No questions found</p>";
 restoreSelectedQuestions();
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
 });
 });
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
 document.getElementById("questionPreview").innerHTML =
 "<h3 style='margin-top:0;'>Question Preview</h3>" +
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
 "<p><b>Difficulty:</b> " + (q.difficulty || "N/A") + "</p>";
}
function updateSubjectOptions(){
 const className = document.getElementById("className").value;
 const subjectSelect = document.getElementById("subject");
 const currentSubject = subjectSelect.value;

 const subjects = [...new Set(
 assignedClassSubjects
 .filter(mapping =>
 String(mapping.className || "").trim().toUpperCase() ===
 String(className || "").trim().toUpperCase()
 )
 .map(mapping => String(mapping.subject || "").trim())
 .filter(Boolean)
 )];

 subjectSelect.innerHTML = "<option value=''>Select Subject</option>";

 if(!subjects.length){
 subjectSelect.innerHTML += "<option value=''>No assigned subjects</option>";
 return;
 }

 subjects.forEach(subject => {
 const option = document.createElement("option");
 option.value = subject;
 option.textContent = subject;

 if(subject === currentSubject){
 option.selected = true;
 }

 subjectSelect.appendChild(option);
 });
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
 fetch("/save-test", {
 method:"POST",
 headers:{
 "Content-Type":"application/json",
 "Authorization": "Bearer " + localStorage.getItem("token")
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
 if(data.error) return alert(data.error);
 localStorage.removeItem("selectedQuestions");
 alert(editingTestId ? "Draft updated!" : "Test saved as draft!");
 window.location.replace("/teacher-tests");
 })
 .catch(() => alert("Failed to create test"));
}
function clearSelection(){
 localStorage.removeItem("selectedQuestions");
 location.reload();
}
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
router.post("/save-test", authMiddleware, async (req, res) => {
  try {
    const { testId, name, questionIds, className, subject } = req.body;
    if (!name || !Array.isArray(questionIds) || !questionIds.length) {
  return res.status(400).json({ error: "Invalid test data" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Class and subject required" });
    }
    console.log("SAVE TEST BODY:", req.body);
    const ClassSubject = require("../models/ClassSubject");
    const normalizedClass = String(className || "").trim().toUpperCase();
const rawSubject = String(subject || "").trim();
let normalizedSubject = rawSubject;
if (
  rawSubject.toLowerCase() === "cs" ||
  rawSubject.toLowerCase() === "computer science"
) {
  normalizedSubject = "Computer Science";
} else if (
  rawSubject.toLowerCase() === "maths" ||
  rawSubject.toLowerCase() === "math"
) {
  normalizedSubject = "Maths";
} else if (rawSubject.toLowerCase() === "physics") {
  normalizedSubject = "Physics";
}
    console.log("INPUT VALUES:", {
  normalizedClass,
  normalizedSubject
});
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
      existingTest.name = name;
      existingTest.questionIds = questionIds;
      existingTest.className = normalizedClass;
      existingTest.subject = normalizedSubject;
      existingTest.schoolId = existingTest.schoolId || req.user.schoolId || null;
existingTest.schoolCode = existingTest.schoolCode || req.user.schoolCode || null;
      await existingTest.save();
      return res.json({
        status: "draft_updated",
        test: existingTest
      });
    }
const newTest = await Test.create({
  name,
  questionIds,
  teacherId: req.user.id,
  schoolId: req.user.schoolId || null,
  schoolCode: req.user.schoolCode || null,
  className: normalizedClass,
  subject: normalizedSubject,
  status: "draft",
  publishedAt: null
});
    res.json({ status: "draft_saved", test: newTest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save test" });
  }
});
// ---------- TEST SETTINGS PAGE ----------
router.get("/test-settings", authMiddleware, async (req, res) => {
  try {
    const selectedTestId = req.query.id || "";
const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const tests = await Test.find({
  teacherId,
  ...(schoolId ? { schoolId } : {})
})
  .select("name className subject status teacherId scheduledAt durationMinutes testType questionTimersEnabled createdAt")
  .sort({ createdAt: -1 })
  .limit(1000)
  .lean();
    const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Test Settings</h1>
  ${backButton("/teacher-tests")}
</div>
<div style="
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  max-width:760px;
">
  <div style="margin-bottom:20px;">
    <label style="font-weight:700;">Select Test</label><br>
    <select
      id="testSelector"
      onchange="loadSelectedTest()"
      style="
        width:100%;
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        margin-top:6px;
      "
    >
      <option value="">Choose a test</option>
      ${tests.map(t => `
        <option value="${t._id}" ${String(t._id) === String(selectedTestId) ? "selected" : ""}>
          ${t.name || "Untitled Test"} - ${t.className || "No Class"} - ${t.status === "published" ? "Published" : "Draft"}
        </option>
      `).join("")}
    </select>
  </div>
  <div id="settingsPanel"></div>
</div>
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
const teacherId = pageUser._id || pageUser.id;
const allTests = ${JSON.stringify(tests)};
const tests = allTests.filter(t =>
  String(t.teacherId) === String(teacherId)
);
let selectedTestId = "${selectedTestId}";
function formatDateForInput(value){
  if(!value) return "";
  const date = new Date(value);
  if(isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
function loadSelectedTest(){
  selectedTestId = document.getElementById("testSelector").value;
  if(!selectedTestId){
    document.getElementById("settingsPanel").innerHTML =
      "<p style='color:#64748b;'>Select a test to edit settings.</p>";
    return;
  }
  const test = tests.find(t =>
    String(t._id) === String(selectedTestId)
  );
  if(!test){
    document.getElementById("settingsPanel").innerHTML =
      "<p style='color:#dc2626;'>Test not found.</p>";
    return;
  }
  document.getElementById("settingsPanel").innerHTML = \`
    <h2 style="margin-top:0;">\${test.name || "Untitled Test"}</h2>
    <div style="
      background:#f8fafc;
      padding:14px;
      border-radius:10px;
      margin-bottom:20px;
      border:1px solid #e5e7eb;
    ">
      <p><b>Class:</b> \${test.className || "N/A"}</p>
      <p><b>Subject:</b> \${test.subject || "N/A"}</p>
      <p><b>Status:</b> \${test.status === "published" ? "Published" : "Draft"}</p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Schedule Date / Time</label><br>
      <input
        id="scheduledAt"
        type="datetime-local"
        value="\${formatDateForInput(test.scheduledAt)}"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      />
      <p style="color:#64748b;font-size:13px;margin-top:6px;">
        Published tests appear to students only after this date and time. Leave blank to make it available immediately after publishing.
      </p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Timer Duration</label><br>
      <input
        id="durationMinutes"
        type="number"
        min="1"
        max="1440"
        value="\${test.durationMinutes || 60}"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      />
      <p style="color:#64748b;font-size:13px;margin-top:6px;">
        Duration is in minutes. Maximum allowed is 1440 minutes / 24 hours.
      </p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Test Type</label><br>
      <select
        id="testType"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      >
        <option value="practice" \${test.testType === "practice" ? "selected" : ""}>Practice</option>
        <option value="unit" \${test.testType === "unit" ? "selected" : ""}>Unit</option>
        <option value="exam" \${test.testType === "exam" ? "selected" : ""}>Exam</option>
      </select>
    </div>
    <div style="
      margin-bottom:22px;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:10px;
      padding:14px;
    ">
      <label style="
        display:flex;
        align-items:center;
        gap:10px;
        font-weight:700;
        cursor:pointer;
      ">
        <input
          id="questionTimersEnabled"
          type="checkbox"
          \${test.questionTimersEnabled ? "checked" : ""}
          style="width:18px;height:18px;"
        />
        Enable question timers
      </label>
      <p style="color:#64748b;font-size:13px;margin:8px 0 0 28px;">
        When enabled, students will answer one question at a time. Easy questions get 2 minutes, medium questions get 5 minutes, and hard questions get 10 minutes.
      </p>
    </div>
    <div style="display:flex;gap:12px;">
      <button onclick="saveSettings()" style="
        padding:12px 18px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;
      ">
        Save Settings
      </button>
      <button onclick="go('/teacher-tests')" style="
        padding:12px 18px;
        background:#64748b;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;
      ">
        Back
      </button>
    </div>
  \`;
}
function saveSettings(){
  if(!selectedTestId){
    return alert("Select a test first");
  }
  const scheduledAt = document.getElementById("scheduledAt").value;
  const durationMinutes = Number(document.getElementById("durationMinutes").value);
    const testType = document.getElementById("testType").value;
  const questionTimersEnabled =
    document.getElementById("questionTimersEnabled")?.checked || false;
  if(!durationMinutes || durationMinutes < 1){
    return alert("Duration must be at least 1 minute");
  }
  if(durationMinutes > 1440){
    return alert("Duration cannot exceed 1440 minutes");
  }
  fetch("/save-test-settings", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      testId: selectedTestId,
      scheduledAt,
      durationMinutes,
    testType,
      questionTimersEnabled
    })
  })
  .then(res => res.json())
.then(data => {
  if(data.error){
    alert(data.error);
    return;
  }
  const index = tests.findIndex(t =>
    String(t._id) === String(selectedTestId)
  );
  if(index !== -1){
    tests[index] = data.test;
  }
  alert("Settings saved");
  loadSelectedTest();
})
  .catch(() => alert("Failed to save settings"));
}
loadSelectedTest();
</script>
`;
    res.send(layout(content, "tests"));
  } catch (err) {
    console.error("TEST SETTINGS PAGE ERROR:", err);
    res.send("Error loading test settings");
  }
});
// ---------- SAVE TEST SETTINGS ----------
router.post("/save-test-settings", authMiddleware, async (req, res) => {
  try {
    const {
      testId,
      scheduledAt,
      durationMinutes,
      testType,
      questionTimersEnabled
    } = req.body;
    if (!testId) {
      return res.status(400).json({ error: "Missing test id" });
    }
    const duration = Number(durationMinutes);
    if (!duration || duration < 1 || duration > 1440) {
      return res.status(400).json({
        error: "Duration must be between 1 and 1440 minutes"
      });
    }
    if (!["practice", "unit", "exam"].includes(testType)) {
      return res.status(400).json({
        error: "Invalid test type"
      });
    }
const test = await Test.findOne({
  _id: testId,
  teacherId: String(req.user.id),
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    if (!test) {
      return res.status(404).json({
        error: "Test not found or unauthorized"
      });
    }
    test.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    test.durationMinutes = duration;
    test.testType = testType;
    test.questionTimersEnabled = !!questionTimersEnabled;
    await test.save();
    res.json({
      status: "settings_saved",
      test
    });
  } catch (err) {
    console.error("SAVE TEST SETTINGS ERROR:", err);
    res.status(500).json({
      error: "Failed to save test settings"
    });
  }
});
// ---------- DELETE TEST ----------
router.post("/delete-test", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing test id" });
    }
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    // 🔒 Only allow deleting own tests
const test = await Test.findOne({
  _id: id,
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    // 🗑 Delete test
    await Test.deleteOne({
  _id: id,
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    // 🧹 Remove assignments linked to this test
    await Assignment.deleteMany({
  testId: id,
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("DELETE TEST ERROR:", err);
    res.status(500).json({ error: "Failed to delete test" });
  }
});
router.post("/delete-multiple-tests", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "No test ids provided" });
    }
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    // 🔒 Only delete teacher's own tests
await Test.deleteMany({
  _id: { $in: ids },
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
await Assignment.deleteMany({
  testId: { $in: ids },
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
});

module.exports = router;
