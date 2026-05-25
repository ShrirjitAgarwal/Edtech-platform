exports.adminStudentPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    const studentId = req.query.studentId;
    const Result = require("../models/Result");
const results = await Result.find({
  studentId,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
})
  .sort({ date: -1 })
  .lean();
    if (!results.length) {
      return res.send("<h2>No data found</h2>");
    }
    const student = results[0];
    const rows = results.map((r) => {
      const percent = Math.round(
        (r.score / r.total) * 100
      );
      const date = r.date
        ? new Date(r.date)
            .toLocaleString()
        : "N/A";
      return `
<div style="
background:white;
padding:15px;
margin:10px 0;
border-radius:10px;
">
<b>Test:</b> ${r.testName}<br>
<b>Score:</b>
${r.score}/${r.total}
(${percent}%)<br>
<b>Date:</b> ${date}
</div>
`;
    }).join("");
    res.send(`
<body style="
margin:0;
font-family:Arial;
background:#eef2ff;
">
<div style="
padding:30px;
max-width:800px;
margin:auto;
">
<h1>Student Report</h1>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-bottom:20px;
">
<p><b>Name:</b> ${student.name}</p>
<p><b>Student ID:</b> ${studentId}</p>
<p><b>Class:</b> ${student.class || "N/A"}</p>
</div>
<h3>Performance History</h3>
${rows}
<button
onclick="downloadReport()"
style="
margin-top:20px;
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Download Report
</button>
<br><br>
<button
onclick="goBack()"
style="
padding:10px 16px;
background:#64748b;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Back
</button>
</div>
<script>
function goBack(){
window.history.back();
}
function downloadReport(){
const params =
new URLSearchParams(
window.location.search
);
const studentId =
params.get("studentId");
fetch("/download-report",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":
"Bearer " +
localStorage.getItem("token")
},
body:JSON.stringify({
studentId
})
})
.then(res => res.blob())
.then(blob => {
const url =
window.URL.createObjectURL(blob);
const a =
document.createElement("a");
a.href = url;
a.download = "report.csv";
a.click();
})
.catch(() => {
alert("Download failed");
});
}
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading student");
  }
};
exports.adminClassPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    let className = req.query.class;
    className = String(className || "").trim();
    const Result = require("../models/Result");
    const Assignment = require("../models/Assignment");
    const Student = require("../models/Student");
const results = await Result.find({
  class: className,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
})
  .sort({ date: -1 })
  .lean();
const assignments =
  await Assignment.find({
    className,
    ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
  }).lean();
const students =
  await Student.find({
    class: className,
    ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
  }).lean();
    const attemptedSet =
      new Set(
        results.map((r) =>
          String(r.studentId)
        )
      );
    const assignedSet =
      new Set();
    if (assignments.length > 0) {
      students.forEach((s) => {
        assignedSet.add(String(s.studentId));
      });
    }
    let missingStudents = [];
    if (assignedSet.size > 0) {
      students.forEach((s) => {
        if (
          assignedSet.has(
            String(s.studentId)
          ) &&
          !attemptedSet.has(
            String(s.studentId)
          )
        ) {
          missingStudents.push(s);
        }
      });
    }
    let missingHtml = "";
    missingStudents.forEach((s) => {
      missingHtml += `
<div style="
padding:10px;
border-bottom:1px solid #eee;
display:flex;
justify-content:space-between;
">
<span>
${s.name}
(${s.studentId})
</span>
<span style="
color:#dc2626;
font-weight:600;
">
Not Attempted
</span>
</div>
`;
    });
    let studentMap = {};
    results.forEach((r) => {
      if (!studentMap[r.studentId]) {
        studentMap[r.studentId] = {
          name: r.name,
          totalScore: 0,
          totalMarks: 0,
          attempts: 0
        };
      }
      studentMap[
        r.studentId
      ].totalScore += r.score;
      studentMap[
        r.studentId
      ].totalMarks += r.total;
      studentMap[
        r.studentId
      ].attempts += 1;
    });
    let rows = "";
    let lowPerformers = [];
    Object.keys(studentMap)
      .forEach((id) => {
        const s =
          studentMap[id];
        const avg =
          s.totalMarks > 0
            ? Math.round(
                (
                  s.totalScore /
                  s.totalMarks
                ) * 100
              )
            : 0;
        if (avg < 40) {
          lowPerformers.push({
            id,
            name: s.name,
            avg
          });
        }
        rows += `
<tr
onclick="
goToStudent('${id}')
"
style="cursor:pointer;"
>
<td style="
font-weight:600;
color:#4f46e5;
text-align:center;
">
${s.name}
</td>
<td>${id}</td>
<td>${avg}%</td>
<td>${s.attempts}</td>
</tr>
`;
      });
    let lowHtml = "";
    lowPerformers.forEach((s) => {
      lowHtml += `
<div style="
display:flex;
justify-content:space-between;
padding:10px 0;
border-bottom:1px solid #eee;
">
<span>
${s.name}
(${s.id})
</span>
<span style="
color:#dc2626;
font-weight:700;
">
${s.avg}%
</span>
</div>
`;
    });
    res.send(`
<body style="
margin:0;
font-family:Arial;
background:#eef2ff;
">
<div style="padding:30px;">
<h1>
Class: ${className}
</h1>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-top:20px;
margin-bottom:20px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>
❗ Students Not Attempted
</h3>
${missingHtml ||
"<p style='color:gray;'>All students attempted</p>"}
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-bottom:20px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>
⚠️ Low Performers (&lt; 40%)
</h3>
${lowHtml ||
"<p style='color:gray;'>No low performers</p>"}
</div>
<table
border="1"
cellpadding="10"
style="
width:100%;
border-collapse:collapse;
margin-top:20px;
background:white;
text-align:center;
">
<tr style="
background:#f1f5f9;
">
<th>Name</th>
<th>Student ID</th>
<th>Avg Score</th>
<th>Attempts</th>
</tr>
${rows ||
"<tr><td colspan='4'>No data</td></tr>"}
</table>
<button
onclick="downloadClassReport()"
style="
margin-top:20px;
margin-right:10px;
padding:10px 16px;
background:#16a34a;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Download Class Report
</button>
<button
onclick="goBack()"
style="
margin-top:20px;
padding:10px 16px;
background:#4f46e5;
color:white;
border:none;
border-radius:8px;
cursor:pointer;
">
Back
</button>
</div>
<script>
function downloadClassReport(){
fetch(
"/download-class-report",
{
method:"POST",
headers:{
"Content-Type":
"application/json",
"Authorization":
"Bearer " +
localStorage.getItem("token")
},
body:JSON.stringify({
className:
"${className}"
})
}
)
.then(res => res.blob())
.then(blob => {
const url =
window.URL
.createObjectURL(
blob
);
const a =
document
.createElement(
"a"
);
a.href = url;
a.download =
"class_report.xls";
a.click();
})
.catch(() => {
alert(
"Download failed"
);
});
}
function goBack(){
window.location.replace("/admin-dashboard");
}
function goToStudent(id){
window.location.replace(
"/admin-student?studentId=" +
encodeURIComponent(id)
);
}
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send("Error loading class");
  }
};
exports.schoolDashboardPage = async (req, res) => {
  try {
if (req.user.role !== "admin") {
  return res.send("Access denied");
}
const schoolId = req.user.schoolId || null;
const schoolScopedFilter = schoolId
  ? { schoolId }
  : {};
    const Student =
      require("../models/Student");
    const ClassModel =
      require("../models/Class");
    const Test =
      require("../models/Test");
    const Assignment =
      require("../models/Assignment");
    const Result =
      require("../models/Result");
const students =
  await Student.find(schoolScopedFilter).lean();
const classes =
  await ClassModel.find(schoolScopedFilter).lean();
const tests =
  await Test.find(schoolScopedFilter).lean();
const assignments =
  await Assignment.find(schoolScopedFilter).lean();
const results =
  await Result.find(schoolScopedFilter).lean();
    let assignmentMap = {};
    assignments.forEach((a) => {
      const cls =
        a.className || a.class || "Unknown";
      if (!assignmentMap[cls]) {
        assignmentMap[cls] =
          new Set();
      }
      students
        .filter((s) => String(s.class || "") === String(cls || ""))
        .forEach((s) => {
          assignmentMap[cls].add(String(s.studentId));
        });
      if (Array.isArray(a.studentIds)) {
        a.studentIds.forEach((studentId) => {
          assignmentMap[cls].add(String(studentId));
        });
      }
      if (a.studentId) {
        assignmentMap[cls].add(
          String(a.studentId)
        );
      }
    });
    let classMap = {};
    results.forEach((r) => {
      const cls =
        r.class || "Unknown";
      if (!classMap[cls]) {
        classMap[cls] = {
          students: new Set(),
          totalScore: 0,
          totalMarks: 0,
          attempts: 0
        };
      }
      classMap[cls]
        .students
        .add(r.studentId);
      classMap[cls]
        .totalScore += r.score;
      classMap[cls]
        .totalMarks += r.total;
      classMap[cls]
        .attempts += 1;
    });
    let classRows = "";
    let classInsights = [];
    Object.keys(classMap)
      .forEach((cls) => {
        const data =
          classMap[cls];
        const avg =
          data.totalMarks > 0
            ? Math.round(
                (
                  data.totalScore /
                  data.totalMarks
                ) * 100
              )
            : 0;
        const assignedCount =
          assignmentMap[cls]
            ?.size || 0;
        const attemptedCount =
          data.students.size;
        const completion =
          assignedCount > 0
            ? Math.round(
                (
                  attemptedCount /
                  assignedCount
                ) * 100
              )
            : 0;
        let bgColor = "white";
        if (completion < 50) {
          bgColor =
            "#fee2e2";
        } else if (
          completion < 75
        ) {
          bgColor =
            "#fef3c7";
        } else {
          bgColor =
            "#dcfce7";
        }
        classInsights.push({
          className: cls,
          completion
        });
        classRows += `
<tr
onclick="
goToClass('${cls}')
"
style="
cursor:pointer;
background:${bgColor};
">
<td style="
font-weight:600;
color:#4f46e5;
text-align:center;
">
${cls}
</td>
<td>${data.students.size}</td>
<td>${avg}%</td>
<td>${data.attempts}</td>
<td><b>${completion}%</b></td>
</tr>
`;
      });
    classInsights.sort(
      (a, b) =>
        a.completion -
        b.completion
    );
    const problemClasses =
      classInsights.slice(0, 3);
    let problemHtml = "";
    problemClasses.forEach(
      (c) => {
        let color =
          "#16a34a";
        if (
          c.completion < 50
        ) {
          color =
            "#dc2626";
        } else if (
          c.completion < 75
        ) {
          color =
            "#ca8a04";
        }
        problemHtml += `
<div style="
display:flex;
justify-content:space-between;
padding:10px 0;
border-bottom:1px solid #eee;
">
<span style="
font-weight:600;
">
${c.className}
</span>
<span style="
color:${color};
font-weight:700;
">
${c.completion}%
</span>
</div>
`;
      }
    );
    const assignedStudents =
      new Set();
    assignments.forEach(
      (a) => {
        const cls =
          a.className || a.class || "Unknown";
        students
          .filter((s) => String(s.class || "") === String(cls || ""))
          .forEach((s) => {
            assignedStudents.add(String(s.studentId));
          });
        if (Array.isArray(a.studentIds)) {
          a.studentIds.forEach((studentId) => {
            assignedStudents.add(String(studentId));
          });
        }
        if (a.studentId) {
          assignedStudents.add(
            String(
              a.studentId
            )
          );
        }
      }
    );
    const attemptedStudents =
      new Set();
    results.forEach((r) => {
      if (r.studentId) {
        attemptedStudents.add(
          String(
            r.studentId
          )
        );
      }
    });
    const assignedCount =
      assignedStudents.size;
    const attemptedCount =
      attemptedStudents.size;
    let low = 0;
    let mid = 0;
    let high = 0;
    results.forEach((r) => {
      const percent =
        (r.score / r.total) *
        100;
      if (percent < 50) {
        low++;
      } else if (
        percent <= 80
      ) {
        mid++;
      } else {
        high++;
      }
    });
    res.send(`
<body style="
margin:0;
font-family:Arial;
">
<script>
const user =
JSON.parse(
localStorage.getItem(
"user"
) || "null"
);
if(
!user ||
user.role !== "admin"
){
window.location.replace("/");
}
</script>
<div style="
display:flex;
height:100vh;
">
<div style="
width:240px;
background:#1e293b;
color:white;
padding:20px 16px;
display:flex;
flex-direction:column;
justify-content:space-between;
">
<div>
<h2 style="
margin-bottom:25px;
">
Admin
</h2>
<div
onclick="
go('/admin-dashboard')
"
style="
padding:12px 14px;
border-radius:8px;
cursor:pointer;
background:#334155;
margin-bottom:10px;
">
Admin Dashboard
</div>
<div
onclick="
go('/admin-settings')
"
style="
padding:12px 14px;
border-radius:8px;
cursor:pointer;
margin-bottom:10px;
">
Settings
</div>
</div>
<div>
<div
onclick="logout()"
style="
padding:12px 14px;
border-radius:8px;
cursor:pointer;
color:#f87171;
">
Logout
</div>
</div>
</div>
<div style="
flex:1;
padding:30px;
background:#eef2ff;
overflow:auto;
">
<h1>
Admin Dashboard
</h1>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-top:20px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>
🚨 Top Problem Classes
</h3>
${problemHtml ||
"<p style='color:gray;'>No data</p>"}
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-top:20px;
">
<h3>
Class Performance
</h3>
<table
border="1"
cellpadding="10"
style="
width:100%;
border-collapse:collapse;
margin-top:10px;
text-align:center;
">
<tr style="
background:#f1f5f9;
">
<th>Class</th>
<th>Students</th>
<th>Avg Score</th>
<th>Attempts</th>
<th>Completion</th>
</tr>
${classRows ||
"<tr><td colspan='5'>No data</td></tr>"}
</table>
</div>
<div style="
display:flex;
gap:20px;
margin:20px 0 30px 0;
flex-wrap:wrap;
">
<div style="
background:white;
padding:20px;
border-radius:12px;
min-width:150px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>Students</h3>
<p style="
font-size:32px;
font-weight:700;
margin:0;
">
${students.length}
</p>
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
min-width:150px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>Classes</h3>
<p style="
font-size:32px;
font-weight:700;
margin:0;
">
${classes.length}
</p>
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
min-width:150px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>Tests</h3>
<p style="
font-size:32px;
font-weight:700;
margin:0;
">
${tests.length}
</p>
</div>
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-top:20px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>
Student Coverage
</h3>
<p>
Assigned: ${assignedCount}
</p>
<p>
Attempted: ${attemptedCount}
</p>
</div>
<div style="
background:white;
padding:20px;
border-radius:12px;
margin-top:20px;
box-shadow:0 4px 10px rgba(0,0,0,0.05);
">
<h3>
Performance Distribution
</h3>
<p>Below 50%: ${low}</p>
<p>50–80%: ${mid}</p>
<p>Above 80%: ${high}</p>
</div>
</div>
</div>
<script>
function go(path){
window.location.replace(path);
}
function logout(){
localStorage.clear();
window.location.replace("/");
}
function goToClass(cls){
window.location.replace(
"/admin-class?class=" +
encodeURIComponent(cls)
);
}
</script>
</body>
`);
  } catch (err) {
    console.error(err);
    res.send(
      "Error loading dashboard"
    );
  }
};
exports.adminSettingsPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    const School = require("../models/School");
    const User = require("../models/User");
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const Test = require("../models/Test");
    const Result = require("../models/Result");
    const ClassSubject = require("../models/ClassSubject");
    const schoolId = req.user.schoolId || null;
    const schoolScopedFilter = schoolId
      ? { schoolId }
      : {};
    const [
      school,
      admins,
      teachers,
      students,
      classes,
      tests,
      results,
      mappings
    ] = await Promise.all([
      schoolId
        ? School.findById(schoolId).lean()
        : null,
      User.find({
        role: "admin",
        ...schoolScopedFilter
      })
        .select("name email role schoolId schoolCode createdBy createdByName createdAt")
        .lean(),
      User.find({
        role: "teacher",
        ...schoolScopedFilter
      })
        .select("name email role schoolId schoolCode createdBy createdByName createdAt")
        .lean(),
      Student.find(schoolScopedFilter)
        .select("studentId name class teacherId schoolId schoolCode")
        .lean(),
      ClassModel.find(schoolScopedFilter)
        .select("name teacherId studentIds schoolId schoolCode")
        .lean(),
      Test.find(schoolScopedFilter)
        .select("name subject className teacherId status schoolId schoolCode")
        .lean(),
      Result.find(schoolScopedFilter)
        .select("studentId testId score total schoolId schoolCode")
        .lean(),
      ClassSubject.find(schoolScopedFilter)
        .select("className subject teacherId schoolId schoolCode")
        .lean()
    ]);
    const teacherOptions = teachers.map(t => `
      <option value="${t._id}">
        ${t.name || t.email || "Unnamed Teacher"} - ${t.email || ""}
      </option>
    `).join("");
    const mappingRows = mappings.map(m => {
  const teacher = teachers.find(t =>
    String(t._id) === String(m.teacherId)
  );
  return `
<tr>
  <td>${m.className || "-"}</td>
  <td>${m.subject || "-"}</td>
  <td>${teacher ? teacher.name || teacher.email : "Unknown"}</td>
  <td>
    <button
      onclick="deleteMapping('${m._id}')"
      style="
        background:#dc2626;
        color:white;
        border:none;
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
      "
    >
      Delete
    </button>
  </td>
</tr>
`;
}).join("");
const teacherRows = teachers.map(t => `
<tr>
  <td>${t.name || "-"}</td>
  <td>${t.email || "-"}</td>
  <td>${t.role || "-"}</td>
  <td>${t.createdByName || "-"}</td>
  <td>${
    t.createdAt
      ? new Date(t.createdAt).toLocaleString()
      : "-"
  }</td>
  <td>
    ${
      String(t._id) === String(req.user.id)
        ? `<span style="color:#64748b;font-weight:600;">Current User</span>`
        : `
          <button
            onclick="deleteUser('${t._id}')"
            style="
              background:#dc2626;
              color:white;
              border:none;
              padding:8px 12px;
              border-radius:8px;
              cursor:pointer;
            "
          >
            Delete
          </button>
        `
    }
  </td>
</tr>
`).join("");
const adminRows = admins.map(a => `
<tr>
  <td>${a.name || "-"}</td>
  <td>${a.email || "-"}</td>
  <td>${a.role || "-"}</td>
  <td>${a.createdByName || "-"}</td>
  <td>${
    a.createdAt
      ? new Date(a.createdAt).toLocaleString()
      : "-"
  }</td>
  <td>
    ${
      String(a._id) === String(req.user.id)
        ? `<span style="color:#64748b;font-weight:600;">Current User</span>`
        : `
          <button
            onclick="deleteUser('${a._id}')"
            style="
              background:#dc2626;
              color:white;
              border:none;
              padding:8px 12px;
              border-radius:8px;
              cursor:pointer;
            "
          >
            Delete
          </button>
        `
    }
  </td>
</tr>
`).join("");
    const classOptions = [...new Set(
      students.map(s => s.class).filter(Boolean)
    )].map(className => `
      <option value="${className}">${className}</option>
    `).join("");
    res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<div style="display:flex;min-height:100vh;">
  <div style="
    width:240px;
    background:#1e293b;
    color:white;
    padding:20px 16px;
    box-sizing:border-box;
  ">
    <h2>Admin</h2>
<div onclick="go('/admin-dashboard')" style="padding:12px;border-radius:8px;cursor:pointer;margin-bottom:10px;">
  Admin Dashboard
</div>
<div onclick="go('/admin-settings')" style="padding:12px;border-radius:8px;cursor:pointer;background:#334155;margin-bottom:10px;">
  Settings
</div>
    <div onclick="logout()" style="padding:12px;border-radius:8px;cursor:pointer;color:#f87171;margin-top:30px;">
      Logout
    </div>
  </div>
    <div style="
    flex:1;
    padding:30px;
    overflow:auto;
    box-sizing:border-box;
  ">
    <h1>Admin Settings</h1>

    <div style="
      display:grid;
      grid-template-columns:260px minmax(900px, 1fr);
      gap:24px;
      align-items:start;
      width:100%;
      max-width:none;
      box-sizing:border-box;
    ">
      <div style="
        background:white;
        padding:14px;
        border-radius:14px;
        box-shadow:0 4px 12px rgba(0,0,0,0.06);
        position:sticky;
        top:0;
        min-height:calc(100vh - 150px);
        box-sizing:border-box;
      ">
        <button class="adminPanelButton" onclick="showAdminPanel('overview', this)" style="width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;background:#334155;color:white;cursor:pointer;text-align:left;font-weight:700;">
          Overview
        </button>

        <button class="adminPanelButton" onclick="showAdminPanel('teachers', this)" style="width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Teachers
        </button>

        <button class="adminPanelButton" onclick="showAdminPanel('admins', this)" style="width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Admins
        </button>

        <button class="adminPanelButton" onclick="showAdminPanel('mappings', this)" style="width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Teacher Mappings
        </button>

        <button class="adminPanelButton" onclick="showAdminPanel('payments', this)" style="width:100%;padding:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Payments
        </button>
      </div>

            <div style="
        width:100%;
        min-width:0;
        box-sizing:border-box;
      ">
    <div id="panel-overview" class="adminPanel" style="background:white;padding:28px;border-radius:14px;margin-bottom:20px;width:100%;box-sizing:border-box;">
      <h2>School Overview</h2>
      <p><b>School Name:</b> ${school?.name || "N/A"}</p>
      <p><b>School Code:</b> ${school?.code || req.user.schoolCode || "N/A"}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:18px;width:100%;">
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${admins.length}</b><br>Admins</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${teachers.length}</b><br>Teachers</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${students.length}</b><br>Students</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${classes.length}</b><br>Classes</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${tests.length}</b><br>Tests</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${results.length}</b><br>Results</div>
        <div style="background:#f8fafc;padding:14px;border-radius:10px;"><b>${mappings.length}</b><br>Mappings</div>
      </div>
    </div>
    <div id="panel-mappings" class="adminPanel" style="background:white;padding:20px;border-radius:14px;margin-bottom:20px;display:none;">
      <h2>Map Teacher to Class and Subject</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;">
        <select id="mapClassName" style="padding:10px;">
          <option value="">Select Class</option>
          ${classOptions}
        </select>
        <select id="mapSubject" style="padding:10px;">
  <option value="">Select Subject</option>
  <option value="Maths">Maths</option>
  <option value="Computer Science">Computer Science</option>
  <option value="Physics">Physics</option>
</select>
        <select id="mapTeacherId" style="padding:10px;">
          <option value="">Select Teacher</option>
          ${teacherOptions}
        </select>
        <button onclick="saveMapping()" style="
          padding:10px 16px;
          background:#4f46e5;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        ">
          Save
        </button>
      </div>
      <h3 style="margin-top:24px;">Current Mappings</h3>
      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;">
<tr>
  <th>Class</th>
  <th>Subject</th>
  <th>Teacher</th>
  <th>Action</th>
</tr>
        ${mappingRows || "<tr><td colspan='4'>No mappings found</td></tr>"}
      </table>
    </div>
        <div id="panel-teachers" class="adminPanel" style="background:white;padding:24px;border-radius:14px;margin-bottom:20px;display:none;">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Teachers</h2>
          <p style="margin:0;color:#64748b;">
            Create teachers and manage teacher accounts for this school.
          </p>
        </div>
      </div>

      <div style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        padding:16px;
        border-radius:12px;
        margin-bottom:22px;
      ">
        <h3 style="margin-top:0;">Create Teacher</h3>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr 1fr auto;
          gap:12px;
          align-items:center;
        ">
          <input id="newTeacherName" placeholder="Teacher name" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />
          <input id="newTeacherEmail" placeholder="Teacher email" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />
          <input id="newTeacherPassword" placeholder="Temporary password" type="password" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />

          <button onclick="addUserWithRole('teacher', 'newTeacher')" style="
            padding:11px 16px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          ">
            Add Teacher
          </button>
        </div>
      </div>

      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<tr>
  <th>Name</th>
  <th>Email</th>
  <th>Role</th>
  <th>Created By</th>
  <th>Created Date</th>
  <th>Action</th>
</tr>
        ${teacherRows || "<tr><td colspan='6'>No teachers found</td></tr>"}
      </table>
    </div>
        <div id="panel-admins" class="adminPanel" style="background:white;padding:24px;border-radius:14px;margin-bottom:20px;display:none;">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Admins</h2>
          <p style="margin:0;color:#64748b;">
            Create school admins and manage admin accounts for this school.
          </p>
        </div>
      </div>

      <div style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        padding:16px;
        border-radius:12px;
        margin-bottom:22px;
      ">
        <h3 style="margin-top:0;">Create Admin</h3>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr 1fr auto;
          gap:12px;
          align-items:center;
        ">
          <input id="newAdminName" placeholder="Admin name" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />
          <input id="newAdminEmail" placeholder="Admin email" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />
          <input id="newAdminPassword" placeholder="Temporary password" type="password" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />

          <button onclick="addUserWithRole('admin', 'newAdmin')" style="
            padding:11px 16px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          ">
            Add Admin
          </button>
        </div>
      </div>

      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<tr>
  <th>Name</th>
  <th>Email</th>
  <th>Role</th>
  <th>Created By</th>
  <th>Created Date</th>
  <th>Action</th>
</tr>
        ${adminRows || "<tr><td colspan='6'>No admins found</td></tr>"}
      </table>
    </div>
    <div id="panel-payments" class="adminPanel" style="background:white;padding:20px;border-radius:14px;margin-bottom:20px;display:none;">
      <h2>Payments and Invoices</h2>
      <p style="color:#64748b;">Coming later.</p>
    </div>
      </div>
    </div>
  </div>
</div>
<script>
function showAdminPanel(panelName, button){
  document.querySelectorAll(".adminPanel").forEach(panel => {
    panel.style.display = "none";
  });

  const selectedPanel = document.getElementById("panel-" + panelName);

  if(selectedPanel){
    selectedPanel.style.display = "block";
  }

  document.querySelectorAll(".adminPanelButton").forEach(btn => {
    btn.style.background = "#f8fafc";
    btn.style.color = "#0f172a";
  });

  if(button){
    button.style.background = "#334155";
    button.style.color = "white";
  }
}

function go(path){
  window.location.replace(path);
}
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
function saveMapping(){
  const className = document.getElementById("mapClassName").value;
  const subject = document.getElementById("mapSubject").value;
  const teacherId = document.getElementById("mapTeacherId").value;
  if(!className || !subject || !teacherId){
    alert("Class, subject, and teacher are required");
    return;
  }
  fetch("/admin/map-class-subject", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      className,
      subject,
      teacherId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Mapping saved");
    location.reload();
  })
  .catch(() => alert("Mapping failed"));
}
function deleteMapping(mappingId){
  if(
    !confirm(
      "Delete this mapping?"
    )
  ){
    return;
  }
  fetch(
    "/admin/delete-class-subject-mapping",
    {
      method:"POST",
      headers:{
        "Content-Type":
          "application/json",
        "Authorization":
          "Bearer " +
          localStorage.getItem("token")
      },
      body: JSON.stringify({
        mappingId
      })
    }
  )
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Mapping deleted");
    location.reload();
  })
  .catch(() => {
    alert(
      "Failed to delete mapping"
    );
  });
}
  function deleteUser(userId){
  if(
    !confirm(
      "Delete this user?"
    )
  ){
    return;
  }
  fetch(
    "/admin/delete-user",
    {
      method:"POST",
      headers:{
        "Content-Type":
          "application/json",
        "Authorization":
          "Bearer " +
          localStorage.getItem("token")
      },
      body: JSON.stringify({
        userId
      })
    }
  )
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("User deleted");
    location.reload();
  })
  .catch(() => {
    alert(
      "Failed to delete user"
    );
  });
}
function addUserWithRole(role, prefix){
  const name =
    document
      .getElementById(prefix + "Name")
      .value
      .trim();

  const email =
    document
      .getElementById(prefix + "Email")
      .value
      .trim();

  const password =
    document
      .getElementById(prefix + "Password")
      .value
      .trim();

  if(
    !name ||
    !email ||
    !password
  ){
    alert("All fields are required");
    return;
  }

  fetch("/admin/add-user", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":
        "Bearer " +
        localStorage.getItem("token")
    },
    body: JSON.stringify({
      name,
      email,
      password,
      role
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }

    alert(
      role.charAt(0).toUpperCase() +
      role.slice(1) +
      " created successfully"
    );

    location.reload();
  })
  .catch(() => {
    alert("Failed to create user");
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error("ADMIN SETTINGS ERROR:", err);
    res.send("Error loading admin settings");
  }
};
exports.addUserFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const bcrypt = require("bcrypt");
    const User = require("../models/User");
    const {
      name,
      email,
      password,
      role
    } = req.body;
    const normalizedName =
      String(name || "").trim();
    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();
    const normalizedPassword =
      String(password || "").trim();
    const normalizedRole =
      String(role || "teacher")
        .trim()
        .toLowerCase();
    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedPassword
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }
    if (
      normalizedRole !== "teacher" &&
      normalizedRole !== "admin"
    ) {
      return res.status(400).json({
        error: "Invalid role"
      });
    }
    const existing =
      await User.findOne({
        email: normalizedEmail
      }).lean();
    if (existing) {
      return res.status(400).json({
        error: "User already exists"
      });
    }
    const hashedPassword =
      await bcrypt.hash(
        normalizedPassword,
        10
      );
const user =
  await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword,
    role: normalizedRole,
    schoolId:
      req.user.schoolId || null,
    schoolCode:
      req.user.schoolCode || null,
    createdBy:
      String(req.user.id || ""),
    createdByName:
      String(req.user.name || "Admin")
  });
    res.json({
      status: "created",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolCode: user.schoolCode
      }
    });
  } catch (err) {
    console.error(
      "ADMIN ADD USER ERROR:",
      err
    );
    res.status(500).json({
      error: "Failed to create user"
    });
  }
};
exports.deleteClassSubjectMapping =
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          error: "Not allowed"
        });
      }
      const ClassSubject =
        require("../models/ClassSubject");
      const { mappingId } =
        req.body;
      if (!mappingId) {
        return res.status(400).json({
          error: "Missing mappingId"
        });
      }
      const deleted =
        await ClassSubject.findOneAndDelete({
          _id: mappingId,
          ...(req.user.schoolId
            ? {
                schoolId:
                  req.user.schoolId
              }
            : {})
        });
      if (!deleted) {
        return res.status(404).json({
          error: "Mapping not found"
        });
      }
      res.json({
        status: "deleted"
      });
    } catch (err) {
      console.error(
        "DELETE MAPPING ERROR:",
        err
      );
      res.status(500).json({
        error: "Failed to delete mapping"
      });
    }
  };
  exports.deleteUserFromAdmin =
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          error: "Not allowed"
        });
      }
      const User =
        require("../models/User");
      const { userId } =
        req.body;
      if (!userId) {
        return res.status(400).json({
          error: "Missing userId"
        });
      }
      if (
        String(userId) ===
        String(req.user.id)
      ) {
        return res.status(400).json({
          error:
            "You cannot delete your own account"
        });
      }
      const targetUser =
        await User.findOne({
          _id: userId,
          ...(req.user.schoolId
            ? {
                schoolId:
                  req.user.schoolId
              }
            : {})
        });
      if (!targetUser) {
        return res.status(404).json({
          error: "User not found"
        });
      }
      if (
        targetUser.role !== "teacher" &&
        targetUser.role !== "admin"
      ) {
        return res.status(400).json({
          error:
            "Only teachers and admins can be deleted"
        });
      }
      if (
        targetUser.role === "admin"
      ) {
        const adminCount =
          await User.countDocuments({
            role: "admin",
            ...(req.user.schoolId
              ? {
                  schoolId:
                    req.user.schoolId
                }
              : {})
          });
        if (adminCount <= 1) {
          return res.status(400).json({
            error:
              "Cannot delete the last admin"
          });
        }
      }
      await User.deleteOne({
        _id: userId
      });
      res.json({
        status: "deleted"
      });
    } catch (err) {
      console.error(
        "DELETE USER ERROR:",
        err
      );
      res.status(500).json({
        error: "Failed to delete user"
      });
    }
  };
exports.mapClassSubject = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const { className, subject, teacherId } = req.body;
    const normalizedClass = String(className || "").trim();
    const normalizedSubject = String(subject || "").trim();
    if (!normalizedClass || !normalizedSubject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
const existingMapping =
  await ClassSubject.findOne({
    className: normalizedClass,
    subject: normalizedSubject,
    ...(req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {})
  }).lean();
if (existingMapping) {
  const User =
    require("../models/User");
  const existingTeacher =
    await User.findById(
      existingMapping.teacherId
    )
      .select("name email")
      .lean();
  return res.status(400).json({
    error:
      "This class and subject is already mapped to " +
      (
        existingTeacher?.name ||
        existingTeacher?.email ||
        "another teacher"
      ) +
      ". Delete the existing mapping before assigning a new teacher."
  });
}
const newMapping =
  await ClassSubject.create({
    className: normalizedClass,
    subject: normalizedSubject,
    teacherId: String(teacherId),
    schoolId:
      req.user.schoolId || null,
    schoolCode:
      req.user.schoolCode || null
  });
    res.json({ status: "mapped", data: newMapping });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed mapping" });
  }
};