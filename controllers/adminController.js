exports.adminStudentPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    const studentId = req.query.studentId;
    const Result = require("../models/Result");
    const results = await Result.find({
      studentId
    });
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
      class: className
    });
    const assignments =
      await Assignment.find({
        class: className
      });
    const students =
      await Student.find({
        class: className
      });
    const attemptedSet =
      new Set(
        results.map((r) =>
          String(r.studentId)
        )
      );
    const assignedSet =
      new Set(
        assignments.map((a) =>
          String(a.studentId)
        )
      );
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
const token =
new URLSearchParams(
window.location.search
).get("token");
window.location.replace(
"/school-dashboard?token=" +
encodeURIComponent(
token
)
);
}
function goToStudent(id){
const token =
new URLSearchParams(
window.location.search
).get("token");
window.location.replace(
"/admin-student?studentId=" +
encodeURIComponent(id) +
"&token=" +
encodeURIComponent(
token
)
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
    const token = req.query.token;
    if (!token) {
      return res.status(401).send("No token");
    }
    const jwt = require("jsonwebtoken");
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return res
        .status(401)
        .send("Invalid token");
    }
    if (decoded.role !== "admin") {
      return res.send("Access denied");
    }
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
      await Student.find();
    const classes =
      await ClassModel.find();
    const tests =
      await Test.find();
    const assignments =
      await Assignment.find();
    const results =
      await Result.find();
    let assignmentMap = {};
    assignments.forEach((a) => {
      const cls =
        a.class || "Unknown";
      if (!assignmentMap[cls]) {
        assignmentMap[cls] =
          new Set();
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
go('/school-dashboard?token=${token}')
"
style="
padding:12px 14px;
border-radius:8px;
cursor:pointer;
background:#334155;
">
Dashboard
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
School Dashboard
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
encodeURIComponent(cls) +
"&token=" +
encodeURIComponent(
"${token}"
)
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
    await ClassSubject.deleteMany({
      className: normalizedClass,
      subject: normalizedSubject
    });
    const newMapping = await ClassSubject.create({
      className: normalizedClass,
      subject: normalizedSubject,
      teacherId: String(teacherId)
    });
    res.json({ status: "mapped", data: newMapping });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed mapping" });
  }
};