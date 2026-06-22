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
      <button id="createTestFromListButton" style="
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
      <button id="openSelectedSettingsButton" style="
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
      <button id="deleteSelectedTestsButton" style="
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
      function getErrorMessage(error){
        if(!error){
          return "Something went wrong";
        }
        if(typeof error === "string"){
          return error;
        }
        return error.message || "Something went wrong";
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
            class="teacher-test-card"
            data-test-id="\${escapeHtml(t._id || "")}"
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
    <button
      class="edit-test-button"
      data-edit-url="\${escapeHtml(editUrl)}"
      style="padding:10px 16px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
      Edit
    </button>
  \` : ""}
    <button
      class="assign-test-button"
      data-test-id="\${escapeHtml(t._id || "")}"
      style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
    \${t.status === "published" ? "Published" : "Publish"}
  </button>
</div>
      </div>
        \`;
        }).join("");
        document.getElementById("testList").innerHTML =
          html || "<p>No tests found</p>";

          const testList = document.getElementById("testList");
          if(testList){
            testList.addEventListener("click", function(event){
              const checkbox = event.target.closest(".testCheckbox");
              if(checkbox){
                return;
              }

              const editButton = event.target.closest(".edit-test-button");
              if(editButton){
                event.stopPropagation();
                go(editButton.dataset.editUrl || "/teacher-tests");
                return;
              }

              const assignButton = event.target.closest(".assign-test-button");
              if(assignButton){
                event.stopPropagation();
                assignTest(assignButton.dataset.testId || "");
                return;
              }

              const testCard = event.target.closest(".teacher-test-card");
              if(testCard){
                previewTest(testCard.dataset.testId || "");
              }
            });
          }

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
          const passingPercentage = Number(test.passingPercentage ?? 50);
          testResults.forEach(r => {
            const percent = r.total
              ? Math.round((r.score / r.total) * 100)
              : 0;
            totalPercent += percent;
            if(percent >= passingPercentage){
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
              Passing score is \${passingPercentage}% and above.
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
fetch("/api/teacher/tests/assign", {
          method:"POST",
headers:{
  "Content-Type":"application/json"
},
          body: JSON.stringify({ testId })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(getErrorMessage(data.error));
            return;
          }
          alert(data.message || "Test assigned");
          location.reload();
        })
        .catch(() => alert("Assignment failed"));
      }
      function confirmDelete(id){
        if(!confirm("Delete test?")) return;
        fetch("/api/teacher/tests/delete", {
          method:"POST",
headers:{
  "Content-Type":"application/json"
},
          body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(getErrorMessage(data.error));
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

const createTestFromListButton = document.getElementById("createTestFromListButton");
if(createTestFromListButton){
  createTestFromListButton.addEventListener("click", function(){
    go("/create-test");
  });
}

const openSelectedSettingsButton = document.getElementById("openSelectedSettingsButton");
if(openSelectedSettingsButton){
  openSelectedSettingsButton.addEventListener("click", openSelectedSettings);
}

const deleteSelectedTestsButton = document.getElementById("deleteSelectedTestsButton");
if(deleteSelectedTestsButton){
  deleteSelectedTestsButton.addEventListener("click", deleteSelected);
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
        fetch("/api/teacher/tests/delete-multiple", {
          method:"POST",
headers:{
  "Content-Type":"application/json"
},
          body: JSON.stringify({ ids: selected })
        })
        .then(res => res.json())
        .then(data => {
          if(data.error){
            alert(getErrorMessage(data.error));
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
    const Test = require("../../models/Test");
    const Assignment = require("../../models/Assignment");
    const Student = require("../../models/Student");
    const Result = require("../../models/Result");
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
          .select("name subject className status teacherId testType durationMinutes scheduledAt passingPercentage createdAt publishedAt")
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

module.exports = router;
