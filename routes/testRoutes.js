const express = require("express");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/file");
const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
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
  const Test = require("../models/Test");
  const Assignment = require("../models/Assignment");
  const Student = require("../models/Student");
  const Result = require("../models/Result");
  const tests = await Test.find();
  const assignments = await Assignment.find();
  const students = await Student.find();
  const results = await Result.find();
  const content = `
    <h1 style="margin-bottom:20px;">Tests</h1>
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
      window.onload = function(){
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if(!user){
          return window.location.replace("/");
        }
        const teacherId = user._id || user.id;
        const allTests = ${JSON.stringify(tests)};
        const allAssignments = ${JSON.stringify(assignments)};
        const allStudents = ${JSON.stringify(students)};
        const allResults = ${JSON.stringify(results)};
        const myTests = allTests.filter(t =>
          String(t.teacherId) === String(teacherId)
        );
        const myAssignments = allAssignments.filter(a =>
          String(a.teacherId) === String(teacherId)
        );
        const myStudents = allStudents.filter(s =>
          String(s.teacherId) === String(teacherId)
        );
        const myResults = allResults.filter(r =>
          String(r.teacherId) === String(teacherId)
        );
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
              <button onclick="event.stopPropagation(); go('/test-settings?id=\${t._id}')"
    style="padding:10px 16px;background:#334155;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
    Settings
  </button>
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
  <button onclick="event.stopPropagation(); confirmDelete('\${t._id}')"
    style="padding:10px 16px;background:#dc3545;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
    Delete
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
<h1 style="margin-bottom:20px;">Create Test</h1>
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
    const testId = req.query.id;
    if (!testId) {
      return res.redirect("/teacher-tests");
    }
    const test = await Test.findById(testId).lean();
    if (!test) {
      return res.send("Test not found");
    }
    const scheduledValue = test.scheduledAt
      ? new Date(test.scheduledAt).toISOString().slice(0, 16)
      : "";
    const content = `
<h1 style="margin-bottom:20px;">Test Settings</h1>
<div style="
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  max-width:720px;
">
  <h2 style="margin-top:0;">${test.name || "Untitled Test"}</h2>
  <div style="
    background:#f8fafc;
    padding:14px;
    border-radius:10px;
    margin-bottom:20px;
    border:1px solid #e5e7eb;
  ">
    <p><b>Class:</b> ${test.className || "N/A"}</p>
    <p><b>Subject:</b> ${test.subject || "N/A"}</p>
    <p><b>Status:</b> ${test.status === "published" ? "Published" : "Draft"}</p>
  </div>
  <div style="margin-bottom:16px;">
    <label style="font-weight:700;">Schedule Date / Time</label><br>
    <input
      id="scheduledAt"
      type="datetime-local"
      value="${scheduledValue}"
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
      value="${test.durationMinutes || 60}"
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
  <div style="margin-bottom:22px;">
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
      <option value="practice" ${test.testType === "practice" ? "selected" : ""}>Practice</option>
      <option value="unit" ${test.testType === "unit" ? "selected" : ""}>Unit</option>
      <option value="exam" ${test.testType === "exam" ? "selected" : ""}>Exam</option>
    </select>
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
</div>
<script>
const testId = "${test._id}";
function saveSettings(){
  const scheduledAt = document.getElementById("scheduledAt").value;
  const durationMinutes = Number(document.getElementById("durationMinutes").value);
  const testType = document.getElementById("testType").value;
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
      testId,
      scheduledAt,
      durationMinutes,
      testType
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Settings saved");
    window.location.replace("/teacher-tests");
  })
  .catch(() => alert("Failed to save settings"));
}
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
      testType
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
router.get("/test", async (req, res) => {
  try {
    const id = req.query.id;
    const studentId = req.query.studentId;
    if (!id || !studentId) {
      return res.redirect("/student-entry");
    }
    const Result = require("../models/Result");
    const alreadyAttempted = await Result.findOne({
      studentId,
      testId: id
    });
    if (alreadyAttempted) {
      return res.redirect("/my-tests");
    }
    const test = await Test.findById(id);
    if (!test) return res.send("<h1>Test not found</h1>");
const Question = require("../models/Question");
const questionIds = test.questionIds.map(id => String(id));
const mongoQuestions = await Question.find({
 _id: { $in: questionIds }
}).lean();
const questionMap = {};
mongoQuestions.forEach(q => {
 questionMap[String(q._id)] = q;
});
const testQuestions = questionIds
 .map(id => questionMap[String(id)])
 .filter(Boolean);
const html = testQuestions.map((q, i) => {
 const qid = String(q._id);
 if (q.options && q.options.length) {
 return `
 <div style="background:white;padding:20px;margin:15px 0;border-radius:12px;">
 <p><b>Q${i + 1}: ${q.question}</b></p>
 ${q.options.map(o => `
 <label>
 <input type="radio" name="q${qid}" value="${o}"> ${o}
 </label><br>
 `).join("")}
 </div>
 `;
 }
 return `
 <div style="background:white;padding:20px;margin:15px 0;border-radius:12px;">
 <p><b>Q${i + 1}: ${q.question}</b></p>
 <textarea id="code-${qid}" style="width:100%;height:150px;"></textarea>
 </div>
 `;
}).join("");
    res.send(`
<body style="margin:0;font-family:Arial;">
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
<div style="display:flex;height:100vh;">
  <div style="width:220px;background:#1e293b;color:white;padding:20px;">
    <h2>Student</h2>
  </div>
  <div style="flex:1;padding:30px;background:#eef2ff;overflow:auto;">
    <h1>${test.name}</h1>
<p style="color:#64748b;">
  Type: ${test.testType || "practice"}
</p>
    ${html}
    <button id="submitBtn" onclick="submitTest()">Submit</button>
  </div>
</div>
<script>
const qs = ${JSON.stringify(testQuestions)};
const testId = "${test._id}";
const testName = "${test.name}";
const studentId = "${studentId}";
document.getElementById("startExamBtn").onclick = function(){
  const startTime = Date.now();
  localStorage.setItem("testStartTime_" + testId, startTime);

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }

  startExamMode();
  document.getElementById("examGate").remove();
};
function startExamMode(){
  window.__examTriggered = false;
  // ONE history entry only
  history.pushState(null, null, location.href);
  // BACK BUTTON → submit once
  window.onpopstate = function () {
    if (!window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Back button");
    }
  };
  // TAB SWITCH
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Tab switch");
    }
  });
  // EXIT FULLSCREEN
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !window.__examTriggered) {
      window.__examTriggered = true;
      autoSubmit("Exited fullscreen");
    }
  });
  // WINDOW BLUR (delay to avoid false trigger)
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
 console.log("Auto submitted:", reason);
  submitTest();
}
function submitTest(){
  const btn = document.getElementById("submitBtn");
  if (btn.disabled) return;
  btn.disabled = true;
  let score = 0;
  let answers = [];
qs.forEach(q => {
 const qid = String(q._id);
 const s = document.querySelector('input[name="q'+qid+'"]:checked');
 const selected = s ? s.value : null;
 const isCorrect = selected === q.correct;
 if(isCorrect) score++;
 answers.push({
 questionId: qid,
 selected,
 correctAnswer: q.correct,
 isCorrect
 });
});
  fetch("/submit", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
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
    alert("Submitted");
    window.location.replace("/my-tests");
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading test");
  }
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
 const result = await Result.create({
   studentId,
   name: "",
   class: test.className || "",
   testId,
   testName: testName || test.name,
   teacherId: test.teacherId,
   score,
   total,
   answers,
   date: new Date()
 });
 for (const answer of answers) {
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
    const Question = require("../models/Question");
    const questions = await Question.find();
    const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Questions Library</h1>
  <button onclick="go('/bulk-upload')" style="
    padding:10px 14px;
    background:#16a34a;
    color:white;
    border:none;
    border-radius:8px;
    font-weight:600;
    cursor:pointer;
  ">
    Bulk Question Upload
  </button>
</div>
<div style="
  background:white;
  padding:18px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:14px;
  width:70%;
  box-sizing:border-box;
">
<div style="
    display:grid;
    grid-template-columns:240px 180px 180px 180px;
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
const questions = ${JSON.stringify(questions)};
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
     \${q.difficulty || "No Difficulty"} |
     \${sourceLabel}
   </p>
   <p style="margin:6px 0 0 0;color:#64748b;font-size:13px;">
     Attempted: \${q.analytics?.attempted || 0} |
     Correct: \${q.analytics?.correct || 0} |
     Incorrect: \${q.analytics?.incorrect || 0}
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
    "<p><b>Difficulty:</b> " + (q.difficulty || "N/A") + "</p>" +
    "<p><b>Library Type:</b> " + sourceLabel + "</p>" +
    "<div style='background:#eef2ff;padding:12px;border-radius:10px;margin-top:12px;'>" +
      "<b>Analytics</b><br>" +
      "Attempted: " + (q.analytics?.attempted || 0) + "<br>" +
      "Correct: " + (q.analytics?.correct || 0) + "<br>" +
      "Incorrect: " + (q.analytics?.incorrect || 0) +
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
    return subjectMatch && boardMatch && scopeMatch && searchMatch;
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
populateFilters();
renderLibrary();
</script>
`;
    res.send(layout(content, "library"));
  } catch (err) {
    console.error(err);
    res.send("Error loading library");
  }
});
// ---------- BULK QUESTION UPLOAD ----------
router.get("/bulk-upload", (req, res) => {
  const content = `
<h1 style="margin-bottom:20px;">Bulk Question Upload</h1>
<div style="
  max-width:900px;
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 14px rgba(0,0,0,0.06);
">
  <h2 style="margin-top:0;">Upload Questions</h2>
  <p style="color:#64748b;margin-bottom:18px;">
    Upload a CSV file and map the columns to question fields.
  </p>
  <input type="file" id="questionFile" accept=".csv" />
  <br><br>
  <button onclick="loadQuestionCSV()" style="
    padding:10px 16px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    font-weight:600;
    cursor:pointer;
  ">
    Load CSV
  </button>
  <div id="questionMapping" style="margin-top:24px;"></div>
  <button onclick="processQuestionUpload()" style="
    margin-top:20px;
    padding:10px 16px;
    background:#16a34a;
    color:white;
    border:none;
    border-radius:8px;
    font-weight:600;
    cursor:pointer;
  ">
    Upload Questions
  </button>
</div>
<script>
let questionCSV = [];
let questionHeaders = [];
function loadQuestionCSV(){
  const file = document.getElementById("questionFile").files[0];
  if(!file) return alert("Select a CSV file");
  const reader = new FileReader();
  reader.onload = function(e){
    const rows = e.target.result.split("\\n")
      .map(r => r.replace("\\r", "").trim())
      .filter(r => r);
    questionHeaders = rows[0].split(",").map(h => h.trim());
    questionCSV = rows.slice(1).map(row =>
      row.split(",").map(v => v.trim())
    );
    showQuestionMapping();
  };
  reader.readAsText(file);
}
function showQuestionMapping(){
  const fields = [
    "question",
    "option1",
    "option2",
    "option3",
    "option4",
    "correct",
    "subject",
    "board",
    "difficulty",
    "category"
  ];
  let html = "<h3>Map CSV Fields</h3>";
  questionHeaders.forEach((h, i) => {
    html += "<div style='margin:10px 0;'><b>" + h + "</b> → <select id='question-map-" + i + "'>" +
      "<option value=''>Ignore</option>" +
      fields.map(f => "<option value='" + f + "'>" + f + "</option>").join("") +
      "</select></div>";
  });
  document.getElementById("questionMapping").innerHTML = html;
}
function processQuestionUpload(){
  if(!questionCSV.length) return alert("Load CSV first");
  let mapping = {};
  questionHeaders.forEach((h, i) => {
    const el = document.getElementById("question-map-" + i);
    if(!el) return;
    const val = el.value;
    if(val) mapping[i] = val;
  });
  if(Object.keys(mapping).length === 0){
    return alert("Map at least one field");
  }
  const data = questionCSV.map(row => {
    let obj = {};
    row.forEach((val, i) => {
      if(mapping[i]) obj[mapping[i]] = val;
    });
    return {
      type: "mcq",
      question: obj.question,
      options: [obj.option1, obj.option2, obj.option3, obj.option4],
      correct: obj.correct,
      subject: obj.subject,
      board: obj.board,
      difficulty: obj.difficulty,
      category: obj.category
    };
  });
  fetch("/upload-questions", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Questions uploaded: " + (data.added || 0));
    window.location.replace("/library");
  })
  .catch(() => alert("Question upload failed"));
}
</script>
`;
  res.send(layout(content, "bulk-upload"));
});
// ---------- UPLOAD QUESTIONS ----------
router.post("/upload-questions", async (req, res) => {
  try {
    const Question = require("../models/Question");
    const newQuestions = req.body;
    if (!Array.isArray(newQuestions) || !newQuestions.length) {
      return res.status(400).json({
        error: "Invalid data"
      });
    }
    const processed = newQuestions
      .filter(q => q.question)
      .map(q => ({
        type: q.type || "mcq",
        scope: "public",
        teacherId: null,
        schoolId: null,
        question: q.question,
        options: Array.isArray(q.options)
          ? q.options.filter(Boolean)
          : [],
        correct: q.correct || "",
        subject: q.subject || "",
        board: q.board || "General",
        difficulty: q.difficulty || "",
        category: q.category || "",
        testCases: Array.isArray(q.testCases) ? q.testCases : [],
        analytics: {
          attempted: 0,
          correct: 0,
          incorrect: 0
        }
      }));
    if (!processed.length) {
      return res.status(400).json({
        error: "No valid questions found"
      });
    }
    const created = await Question.insertMany(processed);
    res.json({
      status: "ok",
      added: created.length
    });
  } catch (err) {
    console.error("UPLOAD QUESTIONS ERROR:", err);
    res.status(500).json({
      error: "Failed to upload questions"
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
module.exports = router;