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
window.location.replace("/admin-dashboard");
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
"application/json"
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