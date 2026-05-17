const express = require("express");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/file");
const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
// ---------- NAVBAR ----------
function navbar(){
return `
<div style="
position:fixed;
top:0;
left:0;
z-index:1000;
width:100%;
background:#333;
padding:10px;
display:flex;
gap:10px;
width:100%;
box-sizing:border-box;
">
<button onclick="go('/teacher')" class="nav-btn">Dashboard</button>
<button onclick="go('/library')" class="nav-btn">Library</button>
<button onclick="go('/teacher-tests')" class="nav-btn">Tests</button>
<button onclick="go('/classes')" class="nav-btn">Classes</button>
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
  window.location.replace(path);
}
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
</script>
`;
}
// ---------- TEACHER TEST LIST ----------
router.get("/teacher-tests", async (req, res) => {
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
    const tests = await Test.find({ teacherId })
      .select("name subject className status teacherId testType durationMinutes scheduledAt createdAt publishedAt")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    const assignments = await Assignment.find({ teacherId })
      .select("testId testName className teacherId createdAt")
      .lean();
    const students = await Student.find({ teacherId })
      .select("studentId name class teacherId")
      .lean();
    const results = await Result.find({ teacherId })
      .select("studentId testId testName teacherId score total date")
      .sort({ date: -1 })
      .limit(5000)
      .lean();
    res.json({
      tests,
      assignments,
      students,
      results
    });
  } catch (err) {
    console.error("TEACHER TESTS DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load teacher tests data"
    });
  }
});
// ---------- CREATE TEST ----------
router.get("/create-test", async (req, res) => {
try {
const Question = require("../models/Question");
const questions = await Question.find().lean();
let editTest = null;
if (req.query.id) {
  editTest = await Test.findById(req.query.id).lean();
}
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
 <select id="className" style="
 padding:12px;
 border-radius:8px;
 border:1px solid #ccc;
 ">
 <option value="">Select Class</option>
<option value="C1" ${editTest?.className === "C1" ? "selected" : ""}>C1</option>
<option value="C2" ${editTest?.className === "C2" ? "selected" : ""}>C2</option>
<option value="C3" ${editTest?.className === "C3" ? "selected" : ""}>C3</option>
 </select>
 <select id="subject" style="
 padding:12px;
 border-radius:8px;
 border:1px solid #ccc;
 ">
 <option value="">Select Subject</option>
<option value="Maths" ${editTest?.subject === "Maths" ? "selected" : ""}>Maths</option>
<option value="CS" ${editTest?.subject === "CS" ? "selected" : ""}>CS</option>
<option value="Physics" ${editTest?.subject === "Physics" ? "selected" : ""}>Physics</option>
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
const normalizedSubject =
  String(subject || "").trim().charAt(0).toUpperCase() +
  String(subject || "").trim().slice(1).toLowerCase();
    console.log("INPUT VALUES:", {
  normalizedClass,
  normalizedSubject
});
// 🔒 CHECK MAPPING
const mapping = await ClassSubject.findOne({
  className: normalizedClass,
  subject: normalizedSubject,
  teacherId: String(req.user.id)
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
        status: "draft"
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
router.get("/test-settings", async (req, res) => {
  try {
    const selectedTestId = req.query.id || "";
    const tests = await Test.find().lean();
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
      teacherId: String(req.user.id)
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
      teacherId: req.user.id
    });
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    // 🗑 Delete test
    await Test.deleteOne({ _id: id });
    // 🧹 Remove assignments linked to this test
    await Assignment.deleteMany({ testId: id });
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
      teacherId: req.user.id
    });
    await Assignment.deleteMany({
      testId: { $in: ids }
    });
    res.json({ status: "deleted" });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
});
// ---------- TEST PAGE ----------
router.get("/test", async (req, res, next) => {
  return next();
});
// ---------- SUBMIT TEST ----------
router.post("/submit", async (req, res) => {
try {
 const {
   studentId,
   testId,
   testName,
   score,
   total,
   answers
 } = req.body;
 if (!studentId || !testId || !Array.isArray(answers)) {
   return res.status(400).json({ error: "Invalid submission data" });
 }
  const Result = require("../models/Result");
 const Test = require("../models/Test");
 const Question = require("../models/Question");
 const vm = require("vm");
 const test = await Test.findById(testId);
 if (!test) {
   return res.status(404).json({ error: "Test not found" });
 }
 const existing = await Result.findOne({
   studentId,
   testId
 });
 if (existing) {
  if(!test.allowRetake){
    return res.status(409).json({ error: "Test already submitted" });
  }
}
  let finalScore = Number(score) || 0;
 const gradedAnswers = [];
 for(const answer of answers){
   if(answer.type !== "coding"){
     gradedAnswers.push(answer);
     continue;
   }
   const question = await Question.findById(answer.questionId).lean();
   if(!question || !question.codingMeta?.functionName){
     gradedAnswers.push({
       ...answer,
       isCorrect: false,
       codingScore: 0,
       codingTotal: 0
     });
     continue;
   }
   const code = String(answer.selected || "");
   const functionName = String(question.codingMeta.functionName || "").trim();
   const testCases = Array.isArray(question.testCases)
     ? question.testCases
     : [];
   let passedCount = 0;
   try {
     const sandbox = {
       console: {
         log: function(){},
         error: function(){},
         warn: function(){}
       }
     };
     vm.createContext(sandbox);
     vm.runInContext(code, sandbox, {
       timeout: 1000
     });
     let executableFunction = sandbox[functionName];
     if(typeof executableFunction !== "function"){
       const matchedKey = Object.keys(sandbox).find(key =>
         String(key).toLowerCase() ===
         String(functionName).toLowerCase()
       );
       if(matchedKey){
         executableFunction = sandbox[matchedKey];
       }
     }
     function parseInputValue(value){
       const trimmed = String(value || "").trim();
       if(trimmed === ""){
         return "";
       }
       try {
         return JSON.parse(trimmed);
       } catch (err) {
         if(!isNaN(trimmed)){
           return Number(trimmed);
         }
         return trimmed;
       }
     }
     function parseArgs(rawInput){
       const input = String(rawInput || "").trim();
       if(input === ""){
         return [];
       }
       if(input.startsWith("[") && input.endsWith("]")){
         try {
           const parsed = JSON.parse(input);
           return Array.isArray(parsed) ? [parsed] : [parsed];
         } catch (err) {
           return [input];
         }
       }
       return input.split(",").map(value => parseInputValue(value));
     }
     function normalizeOutput(value){
       if(value === undefined){
         return "undefined";
       }
       if(value === null){
         return "null";
       }
       if(typeof value === "object"){
         return JSON.stringify(value);
       }
       return String(value).trim();
     }
     if(typeof executableFunction === "function"){
       for(const tc of testCases){
         sandbox.__studentArgs = parseArgs(tc.input);
         sandbox.__studentResult = undefined;
         sandbox.__studentFunction = executableFunction;
         try {
           vm.runInContext(
             "__studentResult = __studentFunction(...__studentArgs)",
             sandbox,
             { timeout: 1000 }
           );
           const actual = normalizeOutput(sandbox.__studentResult);
           const expected = String(tc.expectedOutput || "").trim();
           if(actual === expected){
             passedCount++;
           }
         } catch (err) {}
         delete sandbox.__studentArgs;
         delete sandbox.__studentResult;
         delete sandbox.__studentFunction;
       }
     }
   } catch (err) {}
   const codingTotal = testCases.length;
   const codingPassed = codingTotal > 0 && passedCount === codingTotal;
   if(codingPassed){
     finalScore++;
   }
   gradedAnswers.push({
     ...answer,
     isCorrect: codingPassed,
     codingScore: passedCount,
     codingTotal
   });
 }
 const result = await Result.create({
   studentId,
   name: "",
   class: test.className || "",
   testId,
   testName: testName || test.name,
   teacherId: test.teacherId,
   score: finalScore,
   total,
   answers: gradedAnswers,
   date: new Date()
 });
  for (const answer of gradedAnswers) {
   if (!answer.questionId) continue;
   await Question.updateOne(
     { _id: answer.questionId },
     {
       $inc: {
         "analytics.attempted": 1,
         [answer.isCorrect ? "analytics.correct" : "analytics.incorrect"]: 1
       }
     }
   );
 }
 res.json({
   status: "submitted",
   result
 });
} catch (err) {
 console.error("SUBMIT ERROR:", err);
 if (err.code === 11000) {
   return res.status(409).json({ error: "Test already submitted" });
 }
 res.status(500).json({ error: "Failed to submit test" });
}
});
// ---------- LIBRARY ----------
router.get("/library", async (req, res) => {
  try {
    console.log("LIBRARY ROUTE HIT");
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
  return questions.filter(q =>
    q.scope === "public" ||
    (
      q.scope === "teacher" &&
      String(q.teacherId) === String(teacherId)
    )
  );
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
    const questions = await Question.find({
      $or: [
        { scope: "public" },
        {
          scope: "teacher",
          teacherId
        }
      ]
    })
      .select("question options correct correctAnswers subject category board difficulty scope teacherId type analytics createdAt")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();
    res.json({
      questions
    });
  } catch (err) {
    console.error("LIBRARY DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load library data"
    });
  }
});
// ---------- CREATE QUESTION PAGE ----------
router.get("/create-question", async (req, res) => {
  try {
    const Question = require("../models/Question");
let editQuestion = null;
if(req.query.id){
  editQuestion = await Question.findOne({
    _id: req.query.id,
    scope: "teacher"
  }).lean();
}
const allQuestionsForDropdowns = await Question.find().lean();
const subjectOptionsForQuestionBuilder = [...new Set(
  allQuestionsForDropdowns
    .map(q => q.subject || q.category)
    .filter(Boolean)
)];
const boardOptionsForQuestionBuilder = [...new Set(
  allQuestionsForDropdowns
    .map(q => q.board || "General")
    .filter(Boolean)
)];
if(!boardOptionsForQuestionBuilder.includes("General")){
  boardOptionsForQuestionBuilder.unshift("General");
}
    const content = `
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
</script>
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">${editQuestion ? "Edit Question" : "Create Question"}</h1>
  ${backButton("/library")}
</div>
<div style="
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  max-width:1100px;
">
  <div style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:20px;
  ">
    <div>
      <label style="font-weight:600;">Question Type</label><br>
      <select id="questionType" onchange="toggleQuestionType()" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
                <option value="mcq" ${editQuestion?.type === "mcq" ? "selected" : ""}>MCQ</option>
        <option value="coding" ${editQuestion?.type === "coding" ? "selected" : ""}>Coding</option>
      </select>
    </div>
    <div>
      <label style="font-weight:600;">Difficulty</label><br>
      <select id="difficulty" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
                <option value="easy" ${editQuestion?.difficulty === "easy" ? "selected" : ""}>Easy</option>
        <option value="medium" ${editQuestion?.difficulty === "medium" ? "selected" : ""}>Medium</option>
        <option value="hard" ${editQuestion?.difficulty === "hard" ? "selected" : ""}>Hard</option>
      </select>
    </div>
  </div>
  <div style="margin-bottom:20px;">
    <label style="font-weight:600;">Question</label><br>
    <textarea
      id="question"
      rows="5"
      placeholder="Enter question"
      style="
        width:100%;
        padding:14px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        resize:vertical;
      "
        >${editQuestion?.question || ""}</textarea>
  </div>
  <div style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:20px;
  ">
    <div>
      <label style="font-weight:600;">Subject</label><br>
      <select id="subject" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      ">
        <option value="">Select Subject</option>
        ${subjectOptionsForQuestionBuilder.map(subject => `
          <option value="${subject}" ${editQuestion?.subject === subject ? "selected" : ""}>${subject}</option>
        `).join("")}
      </select>
    </div>
    <div>
      <label style="font-weight:600;">Board</label><br>
      <select id="board" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      ">
        <option value="">Select Board</option>
        ${boardOptionsForQuestionBuilder.map(board => `
          <option value="${board}" ${editQuestion?.board === board ? "selected" : ""}>${board}</option>
        `).join("")}
      </select>
    </div>
  </div>
  <div id="mcqSection">
    <h3>Options</h3>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin-bottom:18px;
    ">
            <input id="option1" value="${editQuestion?.options?.[0] || ""}" placeholder="Option 1" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option2" value="${editQuestion?.options?.[1] || ""}" placeholder="Option 2" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option3" value="${editQuestion?.options?.[2] || ""}" placeholder="Option 3" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option4" value="${editQuestion?.options?.[3] || ""}" placeholder="Option 4" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
    </div>
    <label style="font-weight:600;">Correct Answer</label><br>
    <input
            id="correctAnswer"
      value="${editQuestion?.correct || ""}"
      placeholder="Enter exact correct option"
      style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      "
    />
  </div>
  <div id="codingSection" style="display:none;">
    <h3>Coding Settings</h3>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:20px;
      margin-bottom:18px;
    ">
      <input
                id="functionName"
        value="${editQuestion?.codingMeta?.functionName || ""}"
        placeholder="Function Name"
        style="
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
        "
      >
      <select id="language" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
        <option value="javascript">JavaScript</option>
      </select>
    </div>
    <textarea
      id="starterCode"
      rows="10"
      placeholder="Starter code"
      style="
        width:100%;
        padding:14px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        resize:vertical;
        font-family:monospace;
      "
        >${editQuestion?.codingMeta?.starterCode || ""}</textarea>
            <h3 style="margin-top:20px;">Test Cases</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <input id="testInput1" value="${editQuestion?.testCases?.[0]?.input || ""}" placeholder="Test Case 1 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput1" value="${editQuestion?.testCases?.[0]?.expectedOutput || ""}" placeholder="Test Case 1 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput2" value="${editQuestion?.testCases?.[1]?.input || ""}" placeholder="Test Case 2 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput2" value="${editQuestion?.testCases?.[1]?.expectedOutput || ""}" placeholder="Test Case 2 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput3" value="${editQuestion?.testCases?.[2]?.input || ""}" placeholder="Test Case 3 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput3" value="${editQuestion?.testCases?.[2]?.expectedOutput || ""}" placeholder="Test Case 3 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput4" value="${editQuestion?.testCases?.[3]?.input || ""}" placeholder="Test Case 4 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput4" value="${editQuestion?.testCases?.[3]?.expectedOutput || ""}" placeholder="Test Case 4 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
    </div>
  </div>
  <button onclick="saveQuestion()" style="
    margin-top:24px;
    padding:14px 20px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:10px;
    font-weight:700;
    cursor:pointer;
    font-size:15px;
  ">
    Save Question
  </button>
</div>
<script>
function toggleQuestionType(){
  const type = document.getElementById("questionType").value;
  document.getElementById("mcqSection").style.display =
    type === "mcq" ? "block" : "none";
  document.getElementById("codingSection").style.display =
    type === "coding" ? "block" : "none";
}
function saveQuestion(){
  const type =
    document.getElementById("questionType").value;
    const payload = {
    questionId: "${editQuestion?._id || ""}",
    type,
    question:
      document.getElementById("question").value.trim(),
    subject:
      document.getElementById("subject").value,
    board:
      document.getElementById("board").value,
    difficulty:
      document.getElementById("difficulty").value,
    options: [],
    correct: "",
    correctAnswers: [],
    codingMeta: {
      language:
        document.getElementById("language")?.value || "javascript",
      starterCode:
        document.getElementById("starterCode")?.value || "",
      functionName:
        document.getElementById("functionName")?.value || ""
     },
    testCases: []
  };
  if(!payload.question){
    return alert("Question is required");
  }
  if(!payload.subject){
    return alert("Select subject");
  }
  if(!payload.board){
    return alert("Select board");
  }
      if(type === "coding"){
    payload.testCases = [1, 2, 3, 4].map(i => ({
      input: document.getElementById("testInput" + i).value.trim(),
      expectedOutput: document.getElementById("testOutput" + i).value.trim(),
      isHidden: i > 2
    })).filter(tc => tc.input || tc.expectedOutput);
    if(!payload.codingMeta.functionName){
      return alert("Function name required");
    }
    if(payload.testCases.length < 4){
      return alert("Add all 4 test cases");
    }
    const incomplete = payload.testCases.some(tc =>
      !tc.input || !tc.expectedOutput
    );
    if(incomplete){
      return alert("Each test case needs input and expected output");
    }
  }
  if(type === "mcq"){
    payload.options = [
      document.getElementById("option1").value.trim(),
      document.getElementById("option2").value.trim(),
      document.getElementById("option3").value.trim(),
      document.getElementById("option4").value.trim()
    ].filter(Boolean);
    payload.correct =
      document.getElementById("correctAnswer").value.trim();
    payload.correctAnswers =
      payload.correct ? [payload.correct] : [];
    if(payload.options.length < 2){
      return alert("Add at least 2 options");
    }
    if(!payload.correct){
      return alert("Correct answer required");
    }
  }
  fetch("/save-question", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Question saved");
    window.location.replace("/library");
  })
  .catch(() => {
    alert("Failed to save question");
  });
}
toggleQuestionType();
</script>
`;
    res.send(layout(content, "create-question"));
  } catch (err) {
    console.error("CREATE QUESTION PAGE ERROR:", err);
    res.send("Error loading create question page");
  }
});
// ---------- SAVE QUESTION ----------
router.post("/save-question", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
    const {
      questionId,
      type,
      question,
      options,
      correct,
      correctAnswers,
      subject,
      board,
      difficulty,
      codingMeta,
      testCases
    } = req.body;
    if(!question){
      return res.status(400).json({
        error: "Question required"
      });
    }
    const questionData = {
      type: type || "mcq",
      scope: "teacher",
      teacherId: String(req.user.id),
      schoolId: null,
      question,
      options: Array.isArray(options)
        ? options
        : [],
      correct: correct || "",
      correctAnswers: Array.isArray(correctAnswers)
        ? correctAnswers
        : [],
      subject: subject || "",
      board: board || "General",
      difficulty: difficulty || "easy",
      category: subject || "",
            codingMeta: codingMeta || {
        language: "javascript",
        starterCode: "",
        functionName: ""
      },
      testCases: Array.isArray(testCases)
        ? testCases
        : []
    };
    if(questionId){
      const existingQuestion = await Question.findOne({
        _id: questionId,
        teacherId: String(req.user.id),
        scope: "teacher"
      });
      if(!existingQuestion){
        return res.status(404).json({
          error: "Question not found or unauthorized"
        });
      }
      Object.assign(existingQuestion, questionData);
      await existingQuestion.save();
      return res.json({
        status: "updated",
        question: existingQuestion
      });
    }
    const newQuestion = await Question.create({
      ...questionData,
      analytics: {
        attempted: 0,
        correct: 0,
        incorrect: 0
      }
    });
    res.json({
      status: "created",
      question: newQuestion
    });
  } catch (err) {
    console.error("SAVE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to save question"
    });
  }
});
// ---------- MY QUESTIONS ----------
router.get("/my-questions", async (req, res) => {
  try {
    const Question = require("../models/Question");
    const questions = await Question.find({
      scope: "teacher"
    }).sort({ createdAt: -1 }).lean();
    const content = `
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
</script>
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Manage Questions</h1>
  ${backButton("/library")}
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
    overflow-y:auto;
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:18px;
    ">
      <h2 style="margin:0;">My Questions</h2>
      <button onclick="go('/create-question')" style="
        padding:10px 14px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:600;
        cursor:pointer;
      ">
        + Create
      </button>
    </div>
    <div id="questionList"></div>
  </div>
  <div
    id="questionPreview"
    style="
      background:white;
      padding:22px;
      border-radius:14px;
      box-shadow:0 4px 12px rgba(0,0,0,0.08);
      overflow-y:auto;
    "
  >
    <h2 style="margin-top:0;">Question Preview</h2>
    <p style="color:#64748b;">
      Select a question to preview it here.
    </p>
  </div>
</div>
<script>
const allQuestions = ${JSON.stringify(questions)};
const user = JSON.parse(localStorage.getItem("user") || "null");
const teacherId = user?._id || user?.id;
const questions = allQuestions.filter(q =>
  String(q.teacherId) === String(teacherId)
);
function toTitleCase(value){
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\\b\\w/g, letter => letter.toUpperCase());
}
function renderMyQuestions(){
  const list = document.getElementById("questionList");
  if(!list){
    return;
  }
  if(!questions.length){
    list.innerHTML = "<p style='color:#64748b;'>No questions created yet.</p>";
    return;
  }
  list.innerHTML = questions.map(q => {
    return "" +
      "<div onclick=\\"previewQuestion('" + q._id + "')\\" style=\\"" +
        "background:#f8fafc;" +
        "padding:16px;" +
        "border-radius:12px;" +
        "border:1px solid #e5e7eb;" +
        "margin-bottom:14px;" +
        "cursor:pointer;" +
        "display:flex;" +
        "justify-content:space-between;" +
        "align-items:flex-start;" +
        "gap:16px;" +
      "\\">" +
        "<div style=\\"min-width:0;flex:1;\\">" +
          "<div style=\\"font-weight:700;margin-bottom:8px;line-height:1.4;\\">" +
            (q.question || "Untitled Question") +
          "</div>" +
          "<div style=\\"display:flex;gap:8px;flex-wrap:wrap;\\">" +
            "<span style=\\"background:#4f46e5;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              toTitleCase(q.subject || "No Subject") +
            "</span>" +
            "<span style=\\"background:#0f172a;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              String(q.type || "mcq").toUpperCase() +
            "</span>" +
            "<span style=\\"background:#16a34a;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              toTitleCase(q.difficulty || "easy") +
            "</span>" +
          "</div>" +
        "</div>" +
        "<div style=\\"display:flex;gap:10px;flex-shrink:0;align-items:center;\\">" +
          "<button onclick=\\"event.stopPropagation(); editQuestion('" + q._id + "')\\" style=\\"padding:8px 12px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;\\">Edit</button>" +
          "<button onclick=\\"event.stopPropagation(); deleteQuestion('" + q._id + "')\\" style=\\"padding:8px 12px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;\\">Delete</button>" +
        "</div>" +
      "</div>";
  }).join("");
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
          "<div style='background:#f8fafc;padding:10px;border-radius:8px;margin:8px 0;'>" +
          "<b>Option " + (index + 1) + ":</b> " + opt +
          "</div>"
        ).join("")
      : "<p style='color:#64748b;'>No options found.</p>";
  document.getElementById("questionPreview").innerHTML =
    "<h2 style='margin-top:0;'>Question Preview</h2>" +
    "<div style='background:#f8fafc;padding:16px;border-radius:12px;margin-bottom:18px;'>" +
      "<b>Question</b>" +
      "<div style='margin-top:10px;line-height:1.6;'>" +
        (q.question || "No question") +
      "</div>" +
    "</div>" +
    "<div style='margin-bottom:18px;'>" +
      optionsHtml +
    "</div>" +
    "<div style='background:#ecfdf5;padding:14px;border-radius:10px;margin-bottom:14px;'>" +
      "<b>Correct Answer:</b> " +
      (q.correct || "N/A") +
    "</div>" +
    "<p><b>Subject:</b> " + toTitleCase(q.subject || "N/A") + "</p>" +
    "<p><b>Board:</b> " + toTitleCase(q.board || "N/A") + "</p>" +
    "<p><b>Difficulty:</b> " + toTitleCase(q.difficulty || "N/A") + "</p>" +
    "<p><b>Type:</b> " + String(q.type || "mcq").toUpperCase() + "</p>" +
    "<div style='background:#eef2ff;padding:14px;border-radius:10px;margin-top:18px;'>" +
      "<b>Analytics</b><br><br>" +
      "Attempted: " + (q.analytics?.attempted || 0) + "<br>" +
      "Correct: " + (q.analytics?.correct || 0) + "<br>" +
      "Incorrect: " + (q.analytics?.incorrect || 0) +
    "</div>";
}
function editQuestion(id){
  window.location.replace("/create-question?id=" + id);
}
function deleteQuestion(id){
  if(!confirm("Delete this question?")){
    return;
  }
  fetch("/delete-question", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Question deleted");
    location.reload();
  })
  .catch(() => {
    alert("Delete failed");
  });
}
renderMyQuestions();
</script>
`;
    res.send(layout(content, "my-questions"));
  } catch (err) {
    console.error("MY QUESTIONS ERROR:", err);
    res.send("Error loading questions");
  }
});
// ---------- UPDATE QUESTION ----------
router.post("/update-question", authMiddleware, async (req, res) => {
  res.json({
    status: "placeholder"
  });
});
// ---------- DELETE QUESTION ----------
router.post("/delete-question", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
    const { id } = req.body;
    if(!id){
      return res.status(400).json({
        error: "Missing question id"
      });
    }
    const question = await Question.findOne({
      _id: id,
      teacherId: String(req.user.id),
      scope: "teacher"
    });
    if(!question){
      return res.status(404).json({
        error: "Question not found or unauthorized"
      });
    }
    await Question.deleteOne({
      _id: id
    });
    res.json({
      status: "deleted"
    });
  } catch (err) {
    console.error("DELETE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to delete question"
    });
  }
});
// ---------- BULK UPLOAD STUDENTS ----------
router.post("/upload-students", authMiddleware, async (req, res) => {
try {
 const Student = require("../models/Student");
 const User = require("../models/User");
 const ClassModel = require("../models/Class");
 const data = req.body;
 let created = 0;
 let updated = 0;
 let skipped = 0;
 for(const row of data){
   // ✅ VALIDATION
   if(!row.studentId || !row.name || !row.class || !row.teacherEmail){
     skipped++;
     continue;
   }
const teacher = await User.findOne({
  email: row.teacherEmail,
  role: "teacher"
});
if (!teacher) {
  skipped++;
  continue;
}
if (String(teacher._id) !== String(req.user.id)) {
  skipped++;
  continue;
}
// ✅ CHECK IF STUDENT EXISTS
let student = await Student.findOne({ studentId: row.studentId });
if(!student){
// CREATE NEW STUDENT
student = await Student.create({
  studentId: row.studentId,
  name: row.name,
  class: row.class,
  teacherId: teacher._id
});
created++;
} else {
// UPDATE EXISTING (ONLY IF SAME TEACHER)
if (String(student.teacherId) !== String(req.user.id)) {
 skipped++;
 continue;
}
student.name = row.name;
student.class = row.class;
await student.save();
updated++; // ✅ ADD THIS LINE
}
   // ===============================
   // CLASS LOGIC
   // ===============================
   let classDoc = await ClassModel.findOne({
     name: row.class,
     teacherId: req.user.id
   });
   if(!classDoc){
     classDoc = await ClassModel.create({
       name: row.class,
       teacherId: req.user.id,
       studentIds: [row.studentId]
     });
   } else {
     if(!classDoc.studentIds.includes(row.studentId)){
       classDoc.studentIds.push(row.studentId);
       await classDoc.save();
     }
   }
 }
 res.json({ created, updated, skipped });
} catch (err) {
 console.error(err);
 res.status(500).json({ error: "Upload failed" });
}
});
// ---------- PUBLISH TEST ----------
router.post("/assign-test", authMiddleware, async (req, res) => {
  try {
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const ClassSubject = require("../models/ClassSubject");
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: "Missing testId" });
    }
    const test = await Test.findOne({
      _id: testId,
      teacherId: String(req.user.id)
    });
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    const className = String(test.className).trim().toUpperCase();
    const subject =
      String(test.subject).charAt(0).toUpperCase() +
      String(test.subject).slice(1).toLowerCase();
    const mapping = await ClassSubject.findOne({
      className,
      subject,
      teacherId: String(req.user.id)
    });
    if (!mapping) {
      return res.status(403).json({
        error: "You are not allowed to publish this test"
      });
    }
    const exists = await Assignment.findOne({
      testId: String(testId),
      className,
      teacherId: String(req.user.id)
    });
    if (!exists) {
      await Assignment.create({
        testId: String(testId),
        testName: test.name,
        className,
        teacherId: String(req.user.id)
      });
    }
    test.status = "published";
    test.publishedAt = test.publishedAt || new Date();
    await test.save();
    res.json({
      status: "published",
      message: "Test published successfully",
      test
    });
  } catch (err) {
    console.error("PUBLISH ERROR:", err);
    res.status(500).json({ error: "Failed to publish test" });
  }
});
// ---------- ADD SUBJECT ----------
router.post("/add-subject", async (req, res) => {
  try {
    const { className, subject } = req.body;
    const teacherId = String(req.body.teacherId || "").trim();
    if (!className || !subject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const classNameClean = String(className || "").trim().toUpperCase();
    const subjectClean =
      String(subject || "").trim().charAt(0).toUpperCase() +
      String(subject || "").trim().slice(1).toLowerCase();
    const exists = await ClassSubject.findOne({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    if (exists) {
      return res.json({ message: "Subject already exists" });
    }
    const newSubject = await ClassSubject.create({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    res.json({ status: "created", subject: newSubject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});
// ---------- GET TESTS FOR STUDENT ----------
router.get("/get-tests", async (req, res) => {
  try {
    const className = String(req.query.className || "").trim().toUpperCase();
    const subject = String(req.query.subject || "").trim();
    const teacherId = String(req.query.teacherId || "").trim();
if (!teacherId) {
  return res.status(400).json({ error: "Missing teacherId" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Missing params" });
    }
    const Assignment = require("../models/Assignment");
    const Test = require("../models/Test");
    // 1. Get assignments for class
    const assignments = await Assignment.find({ className, teacherId });
    // 2. Fetch tests
    const tests = await Promise.all(
      assignments.map(a => Test.findById(a.testId))
    );
const now = new Date();
const validTests = tests.filter(t =>
  t &&
  String(t.status || "draft") === "published" &&
  (
    !t.scheduledAt ||
    new Date(t.scheduledAt) <= now
  )
);
// 🔒 GET STUDENT ID
const studentId = String(req.query.studentId || "").trim();
if (!studentId) {
  return res.status(400).json({ error: "Missing studentId" });
}
const Result = require("../models/Result");
// 🔒 GET ATTEMPTED TESTS
const attempted = await Result.find({ studentId }).select("testId");
const attemptedIds = attempted.map(r => String(r.testId));
// 3. Filter by subject + remove attempted
const filtered = validTests.filter(t => {
  const subjectMatch =
    String(t.subject || "").trim().toLowerCase() ===
    String(subject || "").trim().toLowerCase();
  const notAttempted =
    !attemptedIds.includes(String(t._id));
  return subjectMatch && notAttempted;
});
res.json(filtered);
  } catch (err) {
    console.error("GET TESTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});
const runCodeRateLimit = {};
function getRunCodeClientKey(req){
  return (
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}
function checkRunCodeRateLimit(req){
  const key = getRunCodeClientKey(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  if(!runCodeRateLimit[key]){
    runCodeRateLimit[key] = [];
  }
  runCodeRateLimit[key] = runCodeRateLimit[key].filter(timestamp =>
    now - timestamp < windowMs
  );
  if(runCodeRateLimit[key].length >= maxRequests){
    return false;
  }
  runCodeRateLimit[key].push(now);
  return true;
}
let activeCodeRuns = 0;
const maxActiveCodeRuns = 25;
// ---------- RUN CODE ----------
router.post("/run-code", async (req, res) => {
  try {
        if(activeCodeRuns >= maxActiveCodeRuns){
      return res.status(503).json({
        error: "Code runner is busy. Please try again in a few seconds."
      });
    }
    if(!checkRunCodeRateLimit(req)){
      return res.status(429).json({
        error: "Too many code runs. Please wait a minute and try again."
      });
    }

    activeCodeRuns++;
    const {
      code,
      language,
      functionName,
      testCases
    } = req.body;
        if(!code || !String(code).trim()){
      return res.status(400).json({
        error: "Code required"
      });
    }
    if(String(code).length > 10000){
      return res.status(400).json({
        error: "Code is too long. Please keep your answer under 10,000 characters."
      });
    }
    if(language && language !== "javascript"){
      return res.status(400).json({
        error: "Only JavaScript execution is currently supported"
      });
    }
    if(!functionName || !String(functionName).trim()){
      return res.status(400).json({
        error: "Function name required"
      });
    }
        if(!Array.isArray(testCases) || !testCases.length){
      return res.status(400).json({
        error: "No test cases found"
      });
    }
    if(testCases.length > 4){
      return res.status(400).json({
        error: "Too many test cases"
      });
    }
    const cleanTestCases = testCases
      .filter(tc => tc && typeof tc === "object")
      .map(tc => ({
        input: String(tc.input || ""),
        expectedOutput: String(tc.expectedOutput || ""),
        isHidden: !!tc.isHidden
      }))
      .filter(tc =>
        tc.input.trim() !== "" ||
        tc.expectedOutput.trim() !== ""
      );
    if(!cleanTestCases.length){
      return res.status(400).json({
        error: "No valid test cases found"
      });
    }
    const vm = require("vm");
    const cleanFunctionName = String(functionName).trim();
    const sandbox = {
      console: {
        log: function(){},
        error: function(){},
        warn: function(){}
      }
    };
    vm.createContext(sandbox);
    try {
      vm.runInContext(String(code), sandbox, {
        timeout: 1000
      });
    } catch (err) {
      return res.status(400).json({
        error: "Code error: " + err.message
      });
    }
    let executableFunction = sandbox[cleanFunctionName];
    if(typeof executableFunction !== "function"){
      const matchedKey = Object.keys(sandbox).find(key =>
        String(key).toLowerCase() ===
        String(cleanFunctionName).toLowerCase()
      );
      if(matchedKey){
        executableFunction = sandbox[matchedKey];
      }
    }
    if(typeof executableFunction !== "function"){
      return res.status(400).json({
        error: "Function not found: " + cleanFunctionName
      });
    }
    function parseInputValue(value){
      const trimmed = String(value || "").trim();
      if(trimmed === ""){
        return "";
      }
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        if(!isNaN(trimmed)){
          return Number(trimmed);
        }
        return trimmed;
      }
    }
    function parseArgs(rawInput){
      const input = String(rawInput || "").trim();
      if(input === ""){
        return [];
      }
      if(input.startsWith("[") && input.endsWith("]")){
        try {
          const parsed = JSON.parse(input);
          return Array.isArray(parsed) ? [parsed] : [parsed];
        } catch (err) {
          return [input];
        }
      }
      return input.split(",").map(value => parseInputValue(value));
    }
    function normalizeOutput(value){
      if(value === undefined){
        return "undefined";
      }
      if(value === null){
        return "null";
      }
      if(typeof value === "object"){
        return JSON.stringify(value);
      }
      return String(value).trim();
    }
    let output = "";
    let passedCount = 0;
        for(let i = 0; i < cleanTestCases.length; i++){
      const tc = cleanTestCases[i];
      const rawInput = String(tc.input || "");
      const expected = String(tc.expectedOutput || "").trim();
      const isHidden = !!tc.isHidden;
      const args = parseArgs(rawInput);
      let actual = "";
      let passed = false;
      let runtimeError = "";
      sandbox.__studentArgs = args;
      sandbox.__studentResult = undefined;
      try {
        sandbox.__studentFunction = executableFunction;
        vm.runInContext(
          "__studentResult = __studentFunction(...__studentArgs)",
          sandbox,
          { timeout: 1000 }
        );
        actual = normalizeOutput(sandbox.__studentResult);
        passed = actual === expected;
      } catch (err) {
        runtimeError = err.message;
      }
      delete sandbox.__studentFunction;
      delete sandbox.__studentArgs;
      delete sandbox.__studentResult;
      if(passed){
        passedCount++;
      }
      if(isHidden){
        output +=
          "Test Case " + (i + 1) + " (Hidden): " +
          (passed ? "PASS" : "FAIL") +
          "\n\n";
      } else {
        output +=
          "Test Case " + (i + 1) + ": " +
          (passed ? "PASS" : "FAIL") +
          "\nInput: " + rawInput +
          "\nExpected: " + expected +
          "\nReceived: " + (runtimeError ? "Runtime Error: " + runtimeError : actual) +
          "\n\n";
      }
    }
    output +=
    "Result: " + passedCount + " / " + cleanTestCases.length + " test cases passed.";
    res.json({
      output,
      passedCount,
      total: cleanTestCases.length,
      passed: passedCount === cleanTestCases.length
    });
  } catch (err) {
    console.error("RUN CODE ERROR:", err);
    res.status(500).json({
      error: "Execution failed"
    });
  } finally {
    activeCodeRuns = Math.max(activeCodeRuns - 1, 0);
  }
});
module.exports = router;