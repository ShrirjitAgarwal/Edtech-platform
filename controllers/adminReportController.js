const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../utils/html");
exports.adminStudentPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      return res.status(403).send("Access denied: missing school context");
    }
    const studentId = req.query.studentId;
    const Result = require("../models/Result");
const results = await Result.find({
  studentId,
  schoolId
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
<b>Test:</b> ${escapeHtml(r.testName || "Unnamed Test")}<br>
<b>Score:</b>
${escapeHtml(r.score)}/${escapeHtml(r.total)}
(${escapeHtml(percent)}%)<br>
<b>Date:</b> ${escapeHtml(date)}
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
<p><b>Name:</b> ${escapeHtml(student.name)}</p>
<p><b>Student ID:</b> ${escapeHtml(studentId)}</p>
<p><b>Class:</b> ${escapeHtml(student.class || "N/A")}</p>
</div>
<h3>Performance History</h3>
${rows}
<button
id="downloadStudentReportButton"
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
id="studentReportBackButton"
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
const downloadStudentReportButton = document.getElementById("downloadStudentReportButton");
if(downloadStudentReportButton){
  downloadStudentReportButton.addEventListener("click", downloadReport);
}

const studentReportBackButton = document.getElementById("studentReportBackButton");
if(studentReportBackButton){
  studentReportBackButton.addEventListener("click", goBack);
}
function goBack(){
window.location.replace("/admin-dashboard");
}
function downloadReport(){
const params =
new URLSearchParams(
window.location.search
);
const studentId =
params.get("studentId");
fetch("/api/reports/student/download",{
method:"POST",
headers:{
"Content-Type":"application/json"
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
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      return res.status(403).send("Access denied: missing school context");
    }
    let className = req.query.class;
    className = String(className || "").trim();
    const Result = require("../models/Result");
    const Assignment = require("../models/Assignment");
    const Student = require("../models/Student");
const results = await Result.find({
  class: className,
  schoolId
})
  .sort({ date: -1 })
  .lean();
const assignments =
  await Assignment.find({
    className,
    schoolId
  }).lean();
const students =
  await Student.find({
    class: className,
    schoolId
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
${escapeHtml(s.name)}
(${escapeHtml(s.studentId)})
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
class="class-report-student-row"
data-student-id="${escapeAttribute(id)}"
style="cursor:pointer;"
>
<td style="
font-weight:600;
color:#4f46e5;
text-align:center;
">
${escapeHtml(s.name)}
</td>
<td>${escapeHtml(id)}</td>
<td>${escapeHtml(avg)}%</td>
<td>${escapeHtml(s.attempts)}</td>
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
${escapeHtml(s.name)}
(${escapeHtml(s.id)})
</span>
<span style="
color:#dc2626;
font-weight:700;
">
${escapeHtml(s.avg)}%
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
Class: ${escapeHtml(className)}
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
id="downloadClassReportButton"
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
id="classReportBackButton"
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
"/api/reports/class/download",
{
method:"POST",
headers:{
"Content-Type":
"application/json"
},
body:JSON.stringify({
className:
${safeJsonForScript(className)}
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
document.querySelectorAll(".class-report-student-row").forEach(row => {
  row.addEventListener("click", function(){
    goToStudent(this.dataset.studentId || "");
  });
});

const downloadClassReportButton = document.getElementById("downloadClassReportButton");
if(downloadClassReportButton){
  downloadClassReportButton.addEventListener("click", downloadClassReport);
}

const classReportBackButton = document.getElementById("classReportBackButton");
if(classReportBackButton){
  classReportBackButton.addEventListener("click", goBack);
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