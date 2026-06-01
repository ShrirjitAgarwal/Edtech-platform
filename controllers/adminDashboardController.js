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
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.href = "/";
  });
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