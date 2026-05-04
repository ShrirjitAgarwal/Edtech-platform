const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const User = require("../models/User");
const Result = require("../models/Result");
const layout = require("../views/layout");
// ---------- SHARED HELPERS ----------
function teacherGuardScript() {
  return `
<script>
function protectTeacher(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user || user.role !== "teacher"){
    window.location.replace("/");
    return;
  }
}
protectTeacher();
window.addEventListener("pageshow", function(event){
  if(event.persisted){
    window.location.reload();
  }
});
</script>
`;
}
// ---------- TEACHER DASHBOARD ----------
router.get("/teacher", async (req, res) => {
  try {
    const allTests = await Test.find();
    const allStudents = await Student.find();
    const allClasses = await ClassModel.find();
    const allResults = await Result.find();
    const content = `
${teacherGuardScript()}
<div id="dashboard"></div>
<script>
window.onload = function(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user){
    return window.location.replace("/");
  }
  const teacherId = user._id || user.id;
  const tests = ${JSON.stringify(allTests)};
  const students = ${JSON.stringify(allStudents)};
  const classes = ${JSON.stringify(allClasses)};
  const results = ${JSON.stringify(allResults)};
  const myTests = tests.filter(t =>
    String(t.teacherId) === String(teacherId)
  );
  const myStudents = students.filter(s =>
    String(s.teacherId) === String(teacherId)
  );
  const myClasses = classes.filter(c =>
    String(c.teacherId) === String(teacherId)
  );
  const myResults = results.filter(r =>
    String(r.teacherId) === String(teacherId)
  );
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTests = myTests
    .filter(t => {
      if(!t.createdAt) return false;
      return new Date(t.createdAt) >= thirtyDaysAgo;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentTestsHtml = recentTests.length
    ? recentTests.map(t => \`
      <div style="
        padding:14px;
        border-bottom:1px solid #e5e7eb;
        cursor:pointer;
      "
      onclick="selectTest('\${t._id}')"
      >
        <div style="font-weight:700;margin-bottom:5px;">
          \${t.name || "Untitled Test"}
        </div>
        <div style="font-size:13px;color:#64748b;">
          \${t.subject || "No Subject"} • \${t.className || "No Class"}
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
          \${new Date(t.createdAt).toLocaleDateString()}
        </div>
      </div>
    \`).join("")
    : "<p style='color:#64748b;margin:0;'>No tests created in the last 30 days.</p>";
  function getTestStats(testId){
    const test = myTests.find(t => String(t._id) === String(testId));
    if(!test){
      return null;
    }
    const testResults = myResults.filter(r =>
      String(r.testId) === String(testId)
    );
    const attempted = testResults.length;
    let totalPercent = 0;
    let passed = 0;
    let failed = 0;
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
    const avgScore = attempted
      ? Math.round(totalPercent / attempted)
      : 0;
    const classStudents = myStudents.filter(s =>
      String(s.class || "").trim() === String(test.className || "").trim()
    );
    const totalStudents = classStudents.length;
    return {
      test,
      attempted,
      avgScore,
      passed,
      failed,
      totalStudents,
      notAttempted: Math.max(totalStudents - attempted, 0)
    };
  }
  function buildAnalyticsTable(selectedTestId){
    const filteredTests = selectedTestId === "all"
      ? myTests
      : myTests.filter(t => String(t._id) === String(selectedTestId));
    if(!filteredTests.length){
      return "<p style='color:#64748b;'>No test data found.</p>";
    }
    return \`
      <table style="
        width:100%;
        border-collapse:collapse;
        background:white;
      ">
        <tr style="background:#f8fafc;text-align:left;">
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Test</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Class</th>
          <th style="padding:12px;border-bottom:1px solid #e5e7eb;">Subject</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Avg Score</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Attempts</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Total Students</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Passed</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Failed</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Not Attempted</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Completion</th>
<th style="padding:12px;border-bottom:1px solid #e5e7eb;">Created</th>
        </tr>
        \${filteredTests.map(t => {
          const stats = getTestStats(t._id);
          return \`
            <tr style="cursor:pointer;" onclick="go('/teacher-tests')">
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700;">
                \${stats.test.name || "Untitled Test"}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.test.className || "N/A"}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.test.subject || "N/A"}
              </td>
              <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                \${stats.avgScore}%
              </td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;">
  \${stats.attempted}
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;">
  \${stats.totalStudents}
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:700;">
  \${stats.passed}
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700;">
  \${stats.failed}
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;">
  \${stats.notAttempted}
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;">
  \${stats.totalStudents ? Math.round((stats.attempted / stats.totalStudents) * 100) : 0}%
</td>
<td style="padding:12px;border-bottom:1px solid #e5e7eb;">
  \${stats.test.createdAt ? new Date(stats.test.createdAt).toLocaleDateString() : "N/A"}
</td>
            </tr>
          \`;
        }).join("")}
      </table>
    \`;
  }
  const testOptions = myTests.length
    ? myTests.map(t => \`
      <option value="\${t._id}">
        \${t.name || "Untitled Test"} - \${t.className || "No Class"}
      </option>
    \`).join("")
    : "";
  document.getElementById("dashboard").innerHTML = \`
    <div style="margin-bottom:24px;">
      <h1 style="margin:0 0 8px 0;font-size:32px;">
        Welcome, \${user.name || "Teacher"}
      </h1>
      <p style="margin:0;color:#64748b;font-size:16px;">
        Here is your teaching overview.
      </p>
    </div>
    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
      gap:24px;
      margin-bottom:28px;
    ">
      <div onclick="go('/create-test')" style="
        background:white;
        min-height:220px;
        border-radius:18px;
        box-shadow:0 4px 14px rgba(0,0,0,0.06);
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        font-size:42px;
        font-weight:800;
      ">
        + New Test
      </div>
      <div style="
        background:white;
        min-height:220px;
        border-radius:18px;
        box-shadow:0 4px 14px rgba(0,0,0,0.06);
        overflow:hidden;
      ">
        <div style="
          padding:18px 20px;
          border-bottom:1px solid #e5e7eb;
          display:flex;
          justify-content:space-between;
          align-items:center;
        ">
          <h2 style="margin:0;font-size:20px;">Previous Tests</h2>
          <button onclick="go('/teacher-tests')" style="
            border:none;
            background:#4f46e5;
            color:white;
            padding:8px 12px;
            border-radius:8px;
            cursor:pointer;
          ">
            View All
          </button>
        </div>
        <div style="padding:10px 20px 20px 20px;">
          \${recentTestsHtml}
        </div>
      </div>
    </div>
    <div style="
      background:white;
      border-radius:18px;
      padding:20px;
      box-shadow:0 4px 14px rgba(0,0,0,0.06);
      margin-bottom:28px;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:center;
        margin-bottom:18px;
        flex-wrap:wrap;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Test Analytics</h2>
          <p style="margin:0;color:#64748b;">
            Select a test to view performance details.
          </p>
        </div>
        <select id="testFilter" onchange="selectTest(this.value)" style="
          padding:10px 12px;
          border-radius:10px;
          border:1px solid #cbd5e1;
          min-width:260px;
        ">
          <option value="all">All Tests</option>
          \${testOptions}
        </select>
      </div>
      <div id="analyticsTable">
        \${buildAnalyticsTable("all")}
      </div>
    </div>
  \`;
  window.selectTest = function(testId){
    const table = document.getElementById("analyticsTable");
    table.innerHTML = buildAnalyticsTable(testId);
    const filter = document.getElementById("testFilter");
    if(filter){
      filter.value = testId;
    }
  };
};
</script>
`;
    res.send(layout(content, "dashboard"));
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});
// ---------- VIEW STUDENTS ----------
router.get("/students", async (req, res) => {
  try {
    const studentsRaw = await Student.find();
    const teachers = await User.find({ role: "teacher" });
    const students = studentsRaw.map(s => ({
      name: s.name,
      class: s.class,
      studentId: s.studentId,
      teacherId: String(s.teacherId)
    }));
    const content = `
${teacherGuardScript()}
<h1 style="margin-bottom:20px;">Students</h1>
<table border="1" cellpadding="10"
style="
width:100%;
background:white;
border-collapse:collapse;
border-radius:12px;
overflow:hidden;
">
<tr>
<th>Name</th>
<th>Class</th>
<th>Student ID</th>
<th>Teacher</th>
</tr>
<tbody id="studentBody"></tbody>
</table>
<script>
window.onload = function(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user){
    return window.location.replace("/");
  }
  const teacherId = user._id || user.id;
  const students = ${JSON.stringify(students)};
  const teachers = ${JSON.stringify(teachers)};
  const teacherMap = {};
  teachers.forEach(t => {
    teacherMap[t._id] = t.name;
  });
  const filtered = students.filter(s =>
    String(s.teacherId) === String(teacherId)
  );
  const rows = filtered.map(s => \`
<tr
style="cursor:pointer;"
onclick="viewStudent('\${s.studentId}')"
>
<td>\${s.name}</td>
<td>\${s.class}</td>
<td>\${s.studentId}</td>
<td>\${teacherMap[s.teacherId] || "Unknown"}</td>
</tr>
\`).join("");
  document.getElementById("studentBody").innerHTML =
    rows || "<tr><td colspan='4'>No students found</td></tr>";
};
function viewStudent(studentId){
  window.location.replace(
    "/student?studentId=" + encodeURIComponent(studentId)
  );
}
</script>
`;
    res.send(layout(content, "students"));
  } catch (err) {
    console.error(err);
    res.send("Error loading students");
  }
});
// ---------- VIEW CLASSES ----------
router.get("/classes", async (req, res) => {
  try {
    const classes = await ClassModel.find();
    const students = await Student.find();
    const teachers = await User.find({ role: "teacher" });
    const results = await Result.find();
    const content = `
${teacherGuardScript()}
<h1 style="margin-bottom:20px;">Classes</h1>
<div style="
display:flex;
gap:12px;
align-items:center;
margin-bottom:20px;
flex-wrap:wrap;
">
  <select
  id="classFilter"
  style="
  padding:10px;
  border-radius:8px;
  border:1px solid #cbd5e1;
  "
  >
  <option value="all">All Classes</option>
  </select>
  <input
  id="studentSearch"
  placeholder="Search student name or ID"
  style="
  padding:10px;
  border-radius:8px;
  border:1px solid #cbd5e1;
  min-width:280px;
  "
  />
</div>
<div id="classContainer"></div>
<script>
window.onload = function(){
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if(!user){
    return window.location.replace("/");
  }
  const teacherId = user._id || user.id;
  const classesData = ${JSON.stringify(classes)};
  const studentsData = ${JSON.stringify(students)};
  const teachersData = ${JSON.stringify(teachers)};
  const resultsData = ${JSON.stringify(results)};
  const teacherMap = {};
  teachersData.forEach(t => {
    teacherMap[t._id] = t.name;
  });
  const teacherClasses = classesData.filter(c =>
    String(c.teacherId) === String(teacherId)
  );
  const teacherResults = resultsData.filter(r =>
    String(r.teacherId) === String(teacherId)
  );
  const classFilter = document.getElementById("classFilter");
  const uniqueNames = [...new Set(
    teacherClasses.map(c => c.name)
  )];
  uniqueNames.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    classFilter.appendChild(option);
  });
  const selected =
    localStorage.getItem("selectedClass") || "all";
  classFilter.value = selected;
  const visibleClasses = teacherClasses.filter(c => {
    if(selected === "all") return true;
    return c.name === selected;
  });
    function renderClasses(){
    const searchValue =
      (document.getElementById("studentSearch").value || "")
        .trim()
        .toLowerCase();
    let html = "";
    visibleClasses.forEach(c => {
      let classStudents = studentsData.filter(s =>
        s.class === c.name &&
        String(s.teacherId) === String(teacherId)
      );
      if(searchValue){
        classStudents = classStudents.filter(s =>
          String(s.name || "").toLowerCase().includes(searchValue) ||
          String(s.studentId || "").toLowerCase().includes(searchValue)
        );
      }
      if(searchValue && classStudents.length === 0){
        return;
      }
      const studentCards = classStudents.length
        ? classStudents.map(s => \`
<div
onclick="previewStudent('\${s.studentId}')"
style="
background:#f8fafc;
padding:12px;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
<div style="font-weight:700;margin-bottom:4px;">
\${s.name || "No Name"}
</div>
<div style="font-size:12px;color:#64748b;">
ID: \${s.studentId}
</div>
</div>
\`).join("")
        : "<p style='color:gray;'>No students</p>";
      html += \`
<div style="
background:white;
padding:20px;
margin-bottom:20px;
border-radius:16px;
box-shadow:0 4px 12px rgba(0,0,0,0.06);
">
  <div style="
    background:linear-gradient(135deg,#4f46e5,#6366f1);
    color:white;
    padding:18px 20px;
    border-radius:14px;
    margin-bottom:18px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:12px;
  ">
    <div>
      <h2 style="margin:0 0 6px 0;">Class: \${c.name}</h2>
      <div style="font-size:14px;opacity:0.9;">
        Teacher: \${teacherMap[c.teacherId] || "Unknown"}
      </div>
    </div>
    <div style="
      background:rgba(255,255,255,0.18);
      padding:10px 14px;
      border-radius:10px;
      font-weight:700;
    ">
      Students: \${classStudents.length}
    </div>
  </div>
  <div style="
    display:grid;
    grid-template-columns:minmax(260px,360px) 1fr;
    gap:20px;
    align-items:start;
  ">
    <div>
      <h3 style="margin-top:0;">Students</h3>
      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        height:520px;
        overflow-y:auto;
        padding-right:6px;
      ">
        \${studentCards}
      </div>
    </div>
    <div
      id="preview-\${c.name}"
      class="studentPreview"
      style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        height:520px;
        overflow-y:auto;
        box-sizing:border-box;
      "
    >
      <p style="color:#64748b;margin:0;">
        Select a student to preview performance and download report.
      </p>
    </div>
  </div>
</div>
\`;
    });
    document.getElementById("classContainer").innerHTML =
      html || "<p>No matching students found</p>";
  }
  renderClasses();
  classFilter.addEventListener("change", function(e){
    localStorage.setItem("selectedClass", e.target.value);
    location.reload();
  });
    document.getElementById("studentSearch")
    .addEventListener("input", function(){
      renderClasses();
    });
  window.previewStudent = function(studentId){
    const student = studentsData.find(s =>
      String(s.studentId) === String(studentId)
    );
    if(!student){
      return;
    }
    const studentResults = teacherResults
      .filter(r => String(r.studentId) === String(studentId))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const previews = document.querySelectorAll(".studentPreview");
    previews.forEach(p => {
      p.innerHTML = "<p style='color:#64748b;margin:0;'>Select a student to preview performance and download report.</p>";
    });
    const box = document.getElementById("preview-" + student.class);
    if(!box){
      return;
    }
    const resultCards = studentResults.length
      ? studentResults.map(r => {
        const percent = r.total
          ? Math.round((r.score / r.total) * 100)
          : 0;
        const color =
          percent >= 70
            ? "#16a34a"
            : percent >= 40
            ? "#ca8a04"
            : "#dc2626";
        const date = r.date
          ? new Date(r.date).toLocaleString()
          : "N/A";
        return \`
<div
onclick="loadResultPreview('\${r.testId}','\${studentId}','\${student.class}')"
style="
background:white;
padding:14px;
margin:10px 0;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
  <div style="display:flex;justify-content:space-between;gap:10px;">
    <b>\${r.testName || "Unnamed Test"}</b>
    <b style="color:\${color};">\${percent}%</b>
  </div>
  <div style="margin-top:6px;font-size:13px;">
    Score: <b>\${r.score}/\${r.total}</b>
  </div>
  <div style="font-size:12px;color:#64748b;margin-top:4px;">
    \${date}
  </div>
</div>
\`;
      }).join("")
      : "<p style='color:#64748b;'>No results found for this student.</p>";
    box.innerHTML = \`
<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:12px;
margin-bottom:15px;
">
  <div>
    <h2 style="margin:0 0 6px 0;">\${student.name || "No Name"}</h2>
    <p style="margin:0;color:#64748b;">ID: \${student.studentId}</p>
    <p style="margin:4px 0 0 0;color:#64748b;">Class: \${student.class}</p>
  </div>
  <button onclick="downloadStudentReport('\${student.studentId}')" style="
    padding:10px 14px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Download Report
  </button>
</div>
<h3>Performance History</h3>
\${resultCards}
\`;
  };
  window.downloadStudentReport = function(studentId){
    fetch("/download-report", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ studentId })
    })
    .then(res => {
      if(!res.ok){
        throw new Error("Download failed");
      }
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.csv";
      a.click();
    })
    .catch(() => alert("Download failed"));
  };
  window.loadResultPreview = function(testId, studentId, className){
    fetch(
      "/result?testId=" +
      encodeURIComponent(testId) +
      "&studentId=" +
      encodeURIComponent(studentId)
    )
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const body = doc.body ? doc.body.innerHTML : html;
      const box = document.getElementById("preview-" + className);
      if(box){
        box.innerHTML =
          '<div style="margin-bottom:12px;">' +
          '<button onclick="previewStudent(\\'' + studentId + '\\')" style="' +
          'padding:8px 12px;' +
          'background:#4f46e5;' +
          'color:white;' +
          'border:none;' +
          'border-radius:8px;' +
          'cursor:pointer;' +
          'font-weight:700;' +
          '">' +
          '← Back to Student' +
          '</button>' +
          '</div>' +
          '<div>' +
          body +
          '</div>';
      }
    })
    .catch(() => alert("Failed to load result"));
  };
};
</script>
`;
    res.send(layout(content, "classes"));
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});
module.exports = router;