const { escapeHtml, escapeAttribute } = require("../utils/html");
const sidebar = require("../views/sidebar");
exports.schoolDashboardPage = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.send("Access denied");
    }
    const schoolId = req.user.schoolId || null;
    const schoolScopedFilter = schoolId
      ? { schoolId }
      : {};
    const School = require("../models/School");
    const User = require("../models/User");
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const Subject = require("../models/Subject");
    const ClassSubject = require("../models/ClassSubject");
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const Result = require("../models/Result");
    const Question = require("../models/Question");
    const [
      school,
      admins,
      teachers,
      students,
      classes,
      subjects,
      mappings,
      tests,
      assignments,
      results,
      questions
    ] = await Promise.all([
      schoolId
        ? School.findById(schoolId).lean()
        : null,
      User.find({
        role: "admin",
        ...schoolScopedFilter
      })
        .select("name email role schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({
        role: "teacher",
        ...schoolScopedFilter
      })
        .select("name email role schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Student.find(schoolScopedFilter)
        .select("studentId name class teacherId schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      ClassModel.find(schoolScopedFilter)
        .select("name teacherId studentIds schoolId schoolCode createdAt")
        .sort({ name: 1 })
        .lean(),
      Subject.find(schoolScopedFilter)
        .select("name schoolId schoolCode createdAt")
        .sort({ name: 1 })
        .lean(),
      ClassSubject.find(schoolScopedFilter)
        .select("className subject teacherId schoolId schoolCode createdAt")
        .lean(),
      Test.find(schoolScopedFilter)
        .select("name subject className class teacherId status schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Assignment.find(schoolScopedFilter)
        .select("testId className class studentId studentIds schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Result.find(schoolScopedFilter)
        .select("studentId testId class className score total schoolId schoolCode createdAt")
        .sort({ createdAt: -1 })
        .lean(),
Question.find({
  scope: "teacher",
  ...schoolScopedFilter
})
  .select("scope schoolId teacherId createdAt")
  .lean()
    ]);
    function jsString(value) {
      return JSON.stringify(String(value || ""));
    }
    function jsAttributeString(value) {
      return escapeAttribute(jsString(value));
    }
    function formatDate(value) {
      if (!value) {
        return "-";
      }
      return new Date(value).toLocaleString();
    }
    function percent(score, total) {
      if (!total || Number(total) <= 0) {
        return 0;
      }
      return Math.round((Number(score || 0) / Number(total)) * 100);
    }
    const teacherById = {};
    teachers.forEach(teacher => {
      teacherById[String(teacher._id)] = teacher;
    });
    const assignmentsByClass = {};
    assignments.forEach(assignment => {
      const className = assignment.className || assignment.class || "Unknown";
      if (!assignmentsByClass[className]) {
        assignmentsByClass[className] = new Set();
      }
      students
        .filter(student => String(student.class || "") === String(className || ""))
        .forEach(student => {
          assignmentsByClass[className].add(String(student.studentId));
        });
      if (Array.isArray(assignment.studentIds)) {
        assignment.studentIds.forEach(studentId => {
          assignmentsByClass[className].add(String(studentId));
        });
      }
      if (assignment.studentId) {
        assignmentsByClass[className].add(String(assignment.studentId));
      }
    });
    const classPerformanceMap = {};
    results.forEach(result => {
      const className = result.className || result.class || "Unknown";
      if (!classPerformanceMap[className]) {
        classPerformanceMap[className] = {
          students: new Set(),
          totalScore: 0,
          totalMarks: 0,
          attempts: 0,
          low: 0,
          mid: 0,
          high: 0
        };
      }
      if (result.studentId) {
        classPerformanceMap[className].students.add(String(result.studentId));
      }
      classPerformanceMap[className].totalScore += Number(result.score || 0);
      classPerformanceMap[className].totalMarks += Number(result.total || 0);
      classPerformanceMap[className].attempts += 1;
      const p = percent(result.score, result.total);
      if (p < 50) classPerformanceMap[className].low++;
      else if (p <= 80) classPerformanceMap[className].mid++;
      else classPerformanceMap[className].high++;
    });
    const classOverviewRows = classes.map(classItem => {
      const className = classItem.name || "Unknown";
      const classStudents = students.filter(student =>
        String(student.class || "") === String(className || "")
      );
      const classMappings = mappings.filter(mapping =>
        String(mapping.className || "") === String(className || "")
      );
      const teacherNames = [...new Set(
        classMappings
          .map(mapping => teacherById[String(mapping.teacherId)]?.name || teacherById[String(mapping.teacherId)]?.email)
          .filter(Boolean)
      )];
      const classTests = tests.filter(test =>
        String(test.className || test.class || "") === String(className || "")
      );
      const performance = classPerformanceMap[className];
      const avgScore = performance && performance.totalMarks > 0
        ? Math.round((performance.totalScore / performance.totalMarks) * 100)
        : 0;
      const assignedCount = assignmentsByClass[className]?.size || 0;
      const attemptedCount = performance?.students?.size || 0;
      const completion = assignedCount > 0
        ? Math.round((attemptedCount / assignedCount) * 100)
        : 0;
      return `
        <tr class="admin-class-row" data-class-name="${escapeAttribute(className)}">
          <td style="font-weight:600;color:#e0633a;">${escapeHtml(className)}</td>
          <td style="text-align:center;">${classStudents.length}</td>
          <td style="text-align:center;">${classMappings.length}</td>
          <td>${escapeHtml(teacherNames.join(", ") || "Not mapped")}</td>
          <td style="text-align:center;">${classTests.length}</td>
          <td style="text-align:center;">${avgScore}%</td>
          <td style="text-align:center;">${completion}%</td>
        </tr>
      `;
    }).join("");
    const teacherWorkloadRows = teachers.map(teacher => {
      const teacherMappings = mappings.filter(mapping =>
        String(mapping.teacherId || "") === String(teacher._id || "")
      );
      const mappedClasses = [...new Set(
        teacherMappings.map(mapping => mapping.className).filter(Boolean)
      )];
      const mappedSubjects = [...new Set(
        teacherMappings.map(mapping => mapping.subject).filter(Boolean)
      )];
      const assignedStudents = students.filter(student =>
        String(student.teacherId || "") === String(teacher._id || "")
      );
      const teacherTests = tests.filter(test =>
        String(test.teacherId || "") === String(teacher._id || "")
      );
      return `
        <tr>
          <td><span style="font-weight:600;">${escapeHtml(teacher.name || teacher.email || "Unnamed Teacher")}</span><br><span style="color:#3a4654;font-size:13px;">${escapeHtml(teacher.email || "")}</span></td>
          <td style="text-align:center;">${mappedClasses.length}</td>
          <td style="text-align:center;">${mappedSubjects.length}</td>
          <td style="text-align:center;">${assignedStudents.length}</td>
          <td style="text-align:center;">${teacherTests.length}</td>
        </tr>
      `;
    }).join("");
    const classTestResultMap = {};
    results.forEach(result => {
      const className = result.className || result.class || "Unknown";
      const testId = String(result.testId || "");
      const key = className + "||" + testId;
      if (!classTestResultMap[key]) {
        const testObj = tests.find(t => String(t._id) === testId) || null;
        classTestResultMap[key] = {
          className,
          testName: testObj ? (testObj.name || "Untitled") : "Unknown Test",
          subject: testObj ? (testObj.subject || "—") : "—",
          totalScore: 0,
          totalMarks: 0,
          count: 0,
          latestDate: null
        };
      }
      classTestResultMap[key].totalScore += Number(result.score || 0);
      classTestResultMap[key].totalMarks += Number(result.total || 0);
      classTestResultMap[key].count++;
      const d = new Date(result.date || result.createdAt || 0);
      if (!classTestResultMap[key].latestDate || d > new Date(classTestResultMap[key].latestDate)) {
        classTestResultMap[key].latestDate = result.date || result.createdAt;
      }
    });
    const recentActivityRows = Object.values(classTestResultMap)
      .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0))
      .slice(0, 12)
      .map(item => {
        const avgScore = item.totalMarks > 0 ? Math.round((item.totalScore / item.totalMarks) * 100) : null;
        const scoreColor = avgScore === null ? "var(--slate)" : avgScore >= 80 ? "#16a34a" : avgScore >= 50 ? "#ca8a04" : "#dc2626";
        return `
          <tr>
            <td style="font-weight:600;color:var(--accent);">${escapeHtml(item.className)}</td>
            <td style="font-weight:500;">${escapeHtml(item.testName)}</td>
            <td>${escapeHtml(item.subject)}</td>
            <td style="text-align:center;font-weight:600;color:${scoreColor};">${avgScore !== null ? avgScore + "%" : "—"}</td>
            <td style="text-align:center;">${item.count}</td>
            <td style="color:var(--slate);font-size:13px;white-space:nowrap;">${escapeHtml(formatDate(item.latestDate))}</td>
          </tr>
        `;
      }).join("");
    const assignedStudents = new Set();
    assignments.forEach(assignment => {
      const className = assignment.className || assignment.class || "Unknown";
      students
        .filter(student => String(student.class || "") === String(className || ""))
        .forEach(student => {
          assignedStudents.add(String(student.studentId));
        });
      if (Array.isArray(assignment.studentIds)) {
        assignment.studentIds.forEach(studentId => {
          assignedStudents.add(String(studentId));
        });
      }
      if (assignment.studentId) {
        assignedStudents.add(String(assignment.studentId));
      }
    });
    const attemptedStudents = new Set();
    results.forEach(result => {
      if (result.studentId) {
        attemptedStudents.add(String(result.studentId));
      }
    });
    let low = 0;
    let mid = 0;
    let high = 0;
    let totalScore = 0;
    let totalMarks = 0;
    results.forEach(result => {
      const resultPercent = percent(result.score, result.total);
      totalScore += Number(result.score || 0);
      totalMarks += Number(result.total || 0);
      if (resultPercent < 50) {
        low++;
      } else if (resultPercent <= 80) {
        mid++;
      } else {
        high++;
      }
    });
    const averageScore = totalMarks > 0
      ? Math.round((totalScore / totalMarks) * 100)
      : 0;
    const testPerformanceRows = tests.map(test => {
      const testId = String(test._id);
      const testAssignments = assignments.filter(a => String(a.testId || "") === testId);
      const assignedSet = new Set();
      testAssignments.forEach(assignment => {
        const cls = assignment.className || assignment.class || "";
        students.filter(s => String(s.class || "") === cls).forEach(s => assignedSet.add(String(s.studentId)));
        if (Array.isArray(assignment.studentIds)) assignment.studentIds.forEach(id => assignedSet.add(String(id)));
        if (assignment.studentId) assignedSet.add(String(assignment.studentId));
      });
      const testResults = results.filter(r => String(r.testId || "") === testId);
      let testTotalScore = 0, testTotalMarks = 0;
      testResults.forEach(r => {
        testTotalScore += Number(r.score || 0);
        testTotalMarks += Number(r.total || 0);
      });
      const testAvgScore = testTotalMarks > 0 ? Math.round((testTotalScore / testTotalMarks) * 100) : null;
      const assigned = assignedSet.size;
      const attempted = testResults.length;
      const completion = assigned > 0 ? Math.round((attempted / assigned) * 100) : null;
      const teacher = teacherById[String(test.teacherId || "")] || null;
      const teacherName = teacher ? (teacher.name || teacher.email || "—") : "—";
      const scoreColor = testAvgScore === null ? "var(--slate)" : testAvgScore >= 80 ? "#16a34a" : testAvgScore >= 50 ? "#ca8a04" : "#dc2626";
      return `
        <tr>
          <td style="font-weight:600;">${escapeHtml(test.name || "Untitled")}</td>
          <td>${escapeHtml(test.className || test.class || "—")}</td>
          <td>${escapeHtml(test.subject || "—")}</td>
          <td>${escapeHtml(teacherName)}</td>
          <td style="text-align:center;">${assigned || "—"}</td>
          <td style="text-align:center;">${attempted || "—"}</td>
          <td style="text-align:center;font-weight:600;color:${scoreColor};">${testAvgScore !== null ? testAvgScore + "%" : "—"}</td>
          <td style="text-align:center;">${completion !== null ? completion + "%" : "—"}</td>
        </tr>
      `;
    }).join("");
    const classPerfSummaryRows = classes.map(classItem => {
      const className = classItem.name || "Unknown";
      const classStudents = students.filter(s => String(s.class || "") === String(className));
      const classTests = tests.filter(t => String(t.className || t.class || "") === String(className));
      const perf = classPerformanceMap[className] || null;
      const avgScore = perf && perf.totalMarks > 0 ? Math.round((perf.totalScore / perf.totalMarks) * 100) : null;
      const scoreColor = avgScore === null ? "var(--slate)" : avgScore >= 80 ? "#16a34a" : avgScore >= 50 ? "#ca8a04" : "#dc2626";
      const assignedCount = assignmentsByClass[className]?.size || 0;
      const attemptedCount = perf?.students?.size || 0;
      const completion = assignedCount > 0 ? Math.round((attemptedCount / assignedCount) * 100) : null;
      return `
        <tr>
          <td style="font-weight:600;color:var(--accent);">${escapeHtml(className)}</td>
          <td style="text-align:center;">${classStudents.length}</td>
          <td style="text-align:center;">${classTests.length}</td>
          <td style="text-align:center;">${perf?.attempts || "—"}</td>
          <td style="text-align:center;font-weight:600;color:${scoreColor};">${avgScore !== null ? avgScore + "%" : "—"}</td>
          <td style="text-align:center;color:#dc2626;font-weight:500;">${perf?.low || "—"}</td>
          <td style="text-align:center;color:#ca8a04;font-weight:500;">${perf?.mid || "—"}</td>
          <td style="text-align:center;color:#16a34a;font-weight:500;">${perf?.high || "—"}</td>
          <td style="text-align:center;">${completion !== null ? completion + "%" : "—"}</td>
        </tr>
      `;
    }).join("");
    const allSetupDone = admins.length > 0 && teachers.length > 0 && classes.length > 0 && subjects.length > 0 && mappings.length > 0 && students.length > 0 && tests.length > 0;
    const cardData = [
      {
        label: "Students",
        value: students.length,
        href: "/admin-settings#students"
      },
      {
        label: "Teachers",
        value: teachers.length,
        href: "/admin-settings#teachers"
      },
      {
        label: "Admins",
        value: admins.length,
        href: "/admin-settings#admins"
      },
      {
        label: "Classes",
        value: classes.length,
        href: "/admin-settings#classes"
      },
      {
        label: "Subjects",
        value: subjects.length,
        href: "/admin-settings#subjects"
      },
      {
        label: "Mappings",
        value: mappings.length,
        href: "/admin-settings#mappings"
      },
      {
        label: "Tests",
        value: tests.length,
        href: "/create-test"
      },
      {
        label: "Assignments",
        value: assignments.length,
        href: "/admin-dashboard"
      },
      {
        label: "Results",
        value: results.length,
        href: "/admin-dashboard"
      },
      {
        label: "Questions",
        value: questions.length,
        href: "/library"
      }
    ];
    const cardHtml = cardData.map(card => `
      <div onclick="go('${escapeAttribute(card.href)}')" style="background:#fbeee7;border:1px solid rgba(224,99,58,0.15);border-radius:14px;padding:18px;box-shadow:0 4px 24px rgba(17,22,29,0.06);cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor='rgba(224,99,58,0.35)'" onmouseout="this.style.borderColor='rgba(224,99,58,0.15)'">
        <div style="color:#3a4654;font-weight:500;font-size:13px;">${escapeHtml(card.label)}</div>
        <div style="font-size:28px;font-weight:700;margin-top:8px;color:#11161d;">${card.value}</div>
      </div>
    `).join("");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.7.0/dist/tabler-icons.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --ink:#11161d;
    --slate:#3a4654;
    --paper:#faf9f6;
    --line:rgba(17,22,29,0.10);
    --line-soft:rgba(17,22,29,0.08);
    --accent:#e0633a;
    --accent-bg:#fbeee7;
    --accent-border:rgba(224,99,58,0.15);
    --sans:'Inter',system-ui,sans-serif;
    --display:'Fraunces',Georgia,serif;
  }
  body{font-family:var(--sans);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;}
  a{color:inherit;text-decoration:none}
  .dash-table{width:100%;border-collapse:collapse;font-size:13.5px;}
  .dash-table th{background:var(--paper);padding:10px 14px;text-align:left;font-weight:600;color:var(--slate);border-bottom:1px solid var(--line-soft);white-space:nowrap;}
  .dash-table td{padding:10px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink);vertical-align:middle;}
  .dash-table tbody tr:last-child td{border-bottom:none;}
  .dash-table tbody tr:hover td{background:var(--accent-bg);}
  .admin-class-row{cursor:pointer;}
  #adminOpenSettingsButton:hover{background:#c9542e!important;transform:translateY(-1px);}
</style>
</head>
<body>
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user || user.role !== "admin"){
  window.location.replace("/");
}
</script>
<div style="display:flex;height:100vh;overflow:hidden;">
  ${sidebar("admin-dashboard", "admin")}
  <main style="
    flex:1;
    height:100vh;
    padding:32px 40px;
    background:var(--paper);
    overflow-y:auto;
    overflow-x:hidden;
    box-sizing:border-box;
  ">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:28px;">
      <div>
        <h1 style="margin:0 0 4px 0;font-family:var(--display);font-size:30px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;">Hello, ${escapeHtml(req.user.name || "Admin")}</h1>
        <p style="margin:0;color:var(--slate);font-size:14px;">${escapeHtml(school?.name || "School")}${school?.code ? " (" + escapeHtml(school.code) + ")" : ""}</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button id="adminPreviousPageButton" style="padding:10px 14px;background:#f59e0b;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:700;cursor:pointer;">← Previous Page</button>
        <button id="adminOpenSettingsButton" style="padding:10px 18px;background:var(--accent);color:white;border:none;border-radius:10px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,transform .1s;">Open Settings</button>
      </div>
    </div>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:24px;">
      ${cardHtml}
    </section>

    <section style="background:white;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(17,22,29,0.06);margin-bottom:24px;">
      <h2 style="margin:0 0 16px 0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Performance Summary</h2>
      <div style="overflow-x:auto;max-height:320px;overflow-y:auto;">
        <table class="dash-table">
          <thead><tr>
            <th>Class</th>
            <th style="text-align:center;">Students</th>
            <th style="text-align:center;">Tests</th>
            <th style="text-align:center;">Attempts</th>
            <th style="text-align:center;">Avg Score</th>
            <th style="text-align:center;color:#dc2626;">&lt;50%</th>
            <th style="text-align:center;color:#ca8a04;">50–80%</th>
            <th style="text-align:center;color:#16a34a;">&gt;80%</th>
            <th style="text-align:center;">Completion</th>
          </tr></thead>
          <tbody>${classPerfSummaryRows || "<tr><td colspan='9' style='color:var(--slate);padding:16px;'>No class data yet</td></tr>"}</tbody>
        </table>
      </div>
    </section>

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
      <div style="background:white;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(17,22,29,0.06);overflow-y:auto;max-height:400px;">
        <h2 style="margin:0 0 16px 0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Teacher Workload</h2>
        <table class="dash-table">
          <thead><tr>
            <th>Teacher</th>
            <th style="text-align:center;">Classes</th>
            <th style="text-align:center;">Subjects</th>
            <th style="text-align:center;">Students</th>
            <th style="text-align:center;">Tests</th>
          </tr></thead>
          <tbody>${teacherWorkloadRows || "<tr><td colspan='5' style='color:var(--slate);padding:16px;'>No teachers found</td></tr>"}</tbody>
        </table>
      </div>
      <div style="background:white;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(17,22,29,0.06);overflow-y:auto;max-height:400px;">
        <h2 style="margin:0 0 16px 0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Recent Results by Class</h2>
        ${recentActivityRows ? `<table class="dash-table">
          <thead><tr>
            <th>Class</th>
            <th>Test</th>
            <th>Subject</th>
            <th style="text-align:center;">Avg Score</th>
            <th style="text-align:center;">Submissions</th>
            <th>Last Submission</th>
          </tr></thead>
          <tbody>${recentActivityRows}</tbody>
        </table>` : "<p style='color:var(--slate);font-size:14px;'>No results yet.</p>"}
      </div>
    </section>

    <section style="background:white;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(17,22,29,0.06);margin-bottom:24px;">
      <h2 style="margin:0 0 16px 0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Test Performance</h2>
      <div style="overflow-x:auto;max-height:380px;overflow-y:auto;">
        <table class="dash-table">
          <thead><tr>
            <th>Test</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th style="text-align:center;">Assigned</th>
            <th style="text-align:center;">Attempted</th>
            <th style="text-align:center;">Avg Score</th>
            <th style="text-align:center;">Completion</th>
          </tr></thead>
          <tbody>${testPerformanceRows || "<tr><td colspan='8' style='color:var(--slate);padding:16px;'>No tests found</td></tr>"}</tbody>
        </table>
      </div>
    </section>

    ${allSetupDone ? "" : `<section style="background:white;border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(17,22,29,0.06);overflow:auto;margin-bottom:24px;">
      <h2 style="margin:0 0 16px 0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;">Class Overview</h2>
      <table class="dash-table">
        <thead><tr>
          <th>Class</th>
          <th style="text-align:center;">Students</th>
          <th style="text-align:center;">Mapped Subjects</th>
          <th>Teachers</th>
          <th style="text-align:center;">Tests</th>
          <th style="text-align:center;">Avg Score</th>
          <th style="text-align:center;">Completion</th>
        </tr></thead>
        <tbody>${classOverviewRows || "<tr><td colspan='7' style='color:var(--slate);padding:16px;'>No classes found</td></tr>"}</tbody>
      </table>
    </section>`}
  </main>
</div>
<script>
document.addEventListener("click", function(event){
  const classRow = event.target.closest(".admin-class-row");
  if(classRow){
    goToClass(classRow.dataset.className || "");
    return;
  }

  const navLink = event.target.closest(".admin-nav-link");
  if(navLink){
    go(navLink.dataset.href || "/admin-dashboard");
    return;
  }

  const logoutButton = event.target.closest("#adminLogoutButton");
  if(logoutButton){
    logout();
    return;
  }

  const previousPageButton = event.target.closest("#adminPreviousPageButton");
  if(previousPageButton){
    go("/school-dashboard");
    return;
  }

  const openSettingsButton = event.target.closest("#adminOpenSettingsButton");
  if(openSettingsButton){
    go("/admin-settings");
  }
});

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
  window.location.replace("/admin-class?class=" + encodeURIComponent(cls));
}
</script>
</body>
</html>
`);
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);
    res.send("Error loading dashboard");
  }
};