const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
const {
  logAuditEvent
} = require("../services/auditLogger");
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
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
      function escapeHtml(value){
        const div = document.createElement("div");
        div.textContent = String(value || "");
        return div.innerHTML;
      }
      function jsString(value){
        return JSON.stringify(String(value || ""));
      }
      window.onload = function(){
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if(!user){
          return window.location.replace("/");
        }
        document.getElementById("testList").innerHTML =
          "<p style='color:#64748b;'>Loading tests...</p>";
        fetch("/api/teacher-tests-data")
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
          const html = myTests.map(t => {
          const testId = jsString(t._id);
          const testName = escapeHtml(t.name || "Untitled Test");
          const testSubject = escapeHtml(t.subject || "No Subject");
          const testClassName = escapeHtml(t.className || "No Class");
          const testStatus = t.status === "published" ? "Published" : "Draft";
          const editUrl = "/create-test?id=" + encodeURIComponent(String(t._id || ""));
          return \`
          <div
          onclick='previewTest(\${testId})'
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
                value="\${escapeHtml(t._id)}"
                onclick="event.stopPropagation()"
              >
              <div>
                <div style="font-size:18px;font-weight:700;">
                  \${testName}
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
    \${testSubject}
  </span>
  <span style="
    font-size:12px;
    background:#6366f1;
    color:white;
    padding:5px 10px;
    border-radius:999px;
    font-weight:700;
  ">
    \${testClassName}
  </span>
  <span style="
    font-size:12px;
    padding:5px 10px;
    border-radius:999px;
    font-weight:700;
    background:\${t.status === "published" ? "#16a34a" : "#7c3aed"};
    color:white;
  ">
    \${testStatus}
  </span>
</div>
              </div>
            </div>
<div style="display:flex;gap:10px;align-items:center;">
  \${t.status !== "published" ? \`
    <button onclick="event.stopPropagation(); go('\${editUrl}')"
      style="padding:10px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
      Edit
    </button>
  \` : ""}
    <button onclick='event.stopPropagation(); assignTest(\${testId})'
    style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
    \${t.status === "published" ? "Published" : "Publish"}
  </button>
</div>
      </div>
        \`;
        }).join("");
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
            <h2 style="margin-top:0;">\${escapeHtml(test.name || "Untitled Test")}</h2>
            <div style="
              background:#f8fafc;
              padding:14px;
              border-radius:10px;
              margin-bottom:14px;
              border:1px solid #e5e7eb;
            ">
              <p><b>Assigned Class:</b> \${escapeHtml(className)}</p>
              <p><b>Subject:</b> \${escapeHtml(test.subject || "N/A")}</p>
              <p><b>Status:</b> \${test.status === "published" ? "Published" : "Draft"}</p>
<p><b>Test Type:</b> \${escapeHtml(test.testType || "practice")}</p>
<p><b>Duration:</b> \${test.durationMinutes || 60} minutes</p>
<p><b>Scheduled At:</b> \${escapeHtml(test.scheduledAt ? new Date(test.scheduledAt).toLocaleString() : "Not scheduled")}</p>
<p><b>Date Created:</b> \${escapeHtml(createdDate)}</p>
<p><b>Date Assigned:</b> \${escapeHtml(assignedDate)}</p>
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
  "Content-Type":"application/json"
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
  "Content-Type":"application/json"
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
  "Content-Type":"application/json"
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
          onclick="toggleCustomDropdown('className')"
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
          onclick="toggleCustomDropdown('subject')"
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
      <button onclick="clearSelection()" style="
        padding:9px 12px;
        background:#fee2e2;
        color:#991b1b;
        border:1px solid #fecaca;
        border-radius:10px;
        cursor:pointer;
        font-weight:800;
        font-size:12px;
      ">
        Clear
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
        <button id="questionSubjectFilterButton" type="button" onclick="toggleCustomDropdown('questionSubjectFilter')" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionSubjectFilterLabel">All Subjects</span>
          <span>▾</span>
        </button>
        <div id="questionSubjectFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionSubjectFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
        <button id="questionBoardFilterButton" type="button" onclick="toggleCustomDropdown('questionBoardFilter')" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionBoardFilterLabel">All Boards</span>
          <span>▾</span>
        </button>
        <div id="questionBoardFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionBoardFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
        <button id="questionDifficultyFilterButton" type="button" onclick="toggleCustomDropdown('questionDifficultyFilter')" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
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
        <button id="questionTypeFilterButton" type="button" onclick="toggleCustomDropdown('questionTypeFilter')" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
          <span id="questionTypeFilterLabel">All Types</span>
          <span>▾</span>
        </button>
        <div id="questionTypeFilterMenu" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:white;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.16);max-height:220px;overflow-y:auto;z-index:120;"></div>
        <input id="questionTypeFilter" type="hidden" value="all">
      </div>
      <div style="position:relative;width:100%;">
        <button id="questionScopeFilterButton" type="button" onclick="toggleCustomDropdown('questionScopeFilter')" style="width:100%;padding:10px;border-radius:10px;border:1px solid #cbd5e1;background:white;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
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
    <button id="saveTestButton" onclick="saveTest()" style="
      margin-top:18px;
      width:100%;
      padding:14px;
      background:linear-gradient(135deg,#4f46e5,#6366f1);
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
 String(q.scope || "").trim() === "" ||
 (
   q.scope === "teacher" &&
   String(q.teacherId) === String(teacherId)
 )
);
function escapeHtml(value){
 const div = document.createElement("div");
 div.textContent = String(value || "");
 return div.innerHTML;
}
function jsString(value){
 return JSON.stringify(String(value || ""));
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
  return String(q.difficulty || "Unspecified").trim();
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
  const idForJs = jsString(id);
  const idForAttribute = escapeHtml(id);
  const questionText = escapeHtml(q.question || "Untitled question");
  const type = getQuestionType(q);
  const subject = getQuestionSubject(q);
  const board = getQuestionBoard(q);
  const difficulty = getQuestionDifficulty(q);
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
    onclick='previewQuestion(\${idForJs})'
      style="
        display:block;
        padding:14px;
        border:\${selected ? "2px solid #4f46e5" : "1px solid #e5e7eb"};
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
          onclick="event.stopPropagation()"
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
function populateQuestionFilters(){
  const subjects = [...new Set(
    questions.map(q => getQuestionSubject(q)).filter(Boolean)
  )].sort();
  const boards = [...new Set(
    questions.map(q => getQuestionBoard(q)).filter(Boolean)
  )].sort();
  const difficulties = [...new Set(
    questions.map(q => getQuestionDifficulty(q)).filter(Boolean)
  )].sort();
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
      ...difficulties.map(difficulty => ({ value: difficulty, label: difficulty }))
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
  const difficulty = getQuestionDifficulty(q);
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
 fetch("/save-test", {
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
router.post("/save-test", authMiddleware, async (req, res) => {
  try {
    const { testId, name, questionIds, className, subject } = req.body;
    if (!name || !Array.isArray(questionIds) || !questionIds.length) {
  return res.status(400).json({ error: "Invalid test data" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Class and subject required" });
    }
    const ClassSubject = require("../models/ClassSubject");
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
    <div style="position:relative;width:100%;margin-top:6px;">
      <button
        id="testSelectorButton"
        type="button"
        onclick="toggleCustomDropdown('testSelector')"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          background:white;
          cursor:pointer;
          text-align:left;
          display:flex;
          justify-content:space-between;
          align-items:center;
        "
      >
        <span id="testSelectorLabel">Choose a test</span>
        <span>▾</span>
      </button>
      <div
        id="testSelectorMenu"
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
          max-height:260px;
          overflow-y:auto;
          z-index:120;
        "
      ></div>
      <input id="testSelector" type="hidden" value="${escapeAttribute(selectedTestId)}">
    </div>
  </div>
  <div id="settingsPanel"></div>
</div>
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(
  !pageUser ||
  (
    pageUser.role !== "teacher" &&
    pageUser.role !== "admin"
  )
){
  window.location.replace("/");
}
const teacherId = pageUser._id || pageUser.id;
const allTests = ${JSON.stringify(tests)};
const tests = allTests.filter(t =>
  String(t.teacherId) === String(teacherId)
);
let selectedTestId = "${selectedTestId}";
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
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
    <h2 style="margin-top:0;">\${escapeHtml(test.name || "Untitled Test")}</h2>
    <div style="
      background:#f8fafc;
      padding:14px;
      border-radius:10px;
      margin-bottom:20px;
      border:1px solid #e5e7eb;
    ">
      <p><b>Class:</b> \${escapeHtml(test.className || "N/A")}</p>
      <p><b>Subject:</b> \${escapeHtml(test.subject || "N/A")}</p>
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
      <div style="position:relative;width:100%;margin-top:6px;">
        <button
          id="testTypeButton"
          type="button"
          onclick="toggleCustomDropdown('testType')"
          style="
            width:100%;
            padding:12px;
            border-radius:8px;
            border:1px solid #cbd5e1;
            box-sizing:border-box;
            background:white;
            cursor:pointer;
            text-align:left;
            display:flex;
            justify-content:space-between;
            align-items:center;
          "
        >
          <span id="testTypeLabel">Practice</span>
          <span>▾</span>
        </button>
        <div
          id="testTypeMenu"
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
            z-index:120;
          "
        ></div>
        <input id="testType" type="hidden" value="\${test.testType || "practice"}">
      </div>
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
  setCustomDropdownOptions(
    "testType",
    [
      { value: "practice", label: "Practice" },
      { value: "unit", label: "Unit" },
      { value: "exam", label: "Exam" }
    ]
  );
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
  "Content-Type":"application/json"
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
setCustomDropdownOptions(
  "testSelector",
  [
    { value: "", label: "Choose a test" },
    ...tests.map(test => ({
      value: String(test._id),
      label:
        (test.name || "Untitled Test") +
        " - " +
        (test.className || "No Class") +
        " - " +
        (test.status === "published" ? "Published" : "Draft")
    }))
  ],
  function(){
    loadSelectedTest();
  }
);
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
await logAuditEvent(req, {
  event: "teacher_test_settings_updated",
  status: "success",
  metadata: {
    testId: test._id,
    testName: test.name,
    scheduledAt: test.scheduledAt,
    durationMinutes: test.durationMinutes,
    testType: test.testType,
    questionTimersEnabled: test.questionTimersEnabled,
    schoolId: test.schoolId || null,
    schoolCode: test.schoolCode || null
  }
});
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
await logAuditEvent(req, {
  event: "teacher_test_deleted",
  status: "success",
  metadata: {
    testId: test._id,
    testName: test.name,
    className: test.className,
    subject: test.subject,
    schoolId: test.schoolId || null,
    schoolCode: test.schoolCode || null
  }
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
 const testsToDelete = await Test.find({
 _id: { $in: ids },
 teacherId: req.user.id,
 ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
 })
 .select("_id name className subject schoolId schoolCode")
 .lean();
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
await logAuditEvent(req, {
  event: "teacher_tests_bulk_deleted",
  status: "success",
  metadata: {
    requestedIds: ids,
    deletedCount: testsToDelete.length,
    tests: testsToDelete.map(test => ({
      testId: test._id,
      testName: test.name,
      className: test.className,
      subject: test.subject,
      schoolId: test.schoolId || null,
      schoolCode: test.schoolCode || null
    }))
  }
});
 res.json({ status: "deleted" });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
});
module.exports = router;
