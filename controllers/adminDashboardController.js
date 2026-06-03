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

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function jsString(value) {
      return JSON.stringify(String(value || ""));
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
          attempts: 0
        };
      }

      if (result.studentId) {
        classPerformanceMap[className].students.add(String(result.studentId));
      }

      classPerformanceMap[className].totalScore += Number(result.score || 0);
      classPerformanceMap[className].totalMarks += Number(result.total || 0);
      classPerformanceMap[className].attempts += 1;
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
        <tr onclick="goToClass(${jsString(className)})" style="cursor:pointer;">
          <td style="font-weight:700;color:#4f46e5;">${escapeHtml(className)}</td>
          <td>${classStudents.length}</td>
          <td>${classMappings.length}</td>
          <td>${escapeHtml(teacherNames.join(", ") || "Not mapped")}</td>
          <td>${classTests.length}</td>
          <td>${avgScore}%</td>
          <td>${completion}%</td>
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
          <td><b>${escapeHtml(teacher.name || teacher.email || "Unnamed Teacher")}</b><br><span style="color:#64748b;font-size:13px;">${escapeHtml(teacher.email || "")}</span></td>
          <td>${mappedClasses.length}</td>
          <td>${mappedSubjects.length}</td>
          <td>${assignedStudents.length}</td>
          <td>${teacherTests.length}</td>
        </tr>
      `;
    }).join("");

    const recentItems = [
      ...teachers.slice(0, 3).map(item => ({
        label: "Teacher",
        title: item.name || item.email,
        date: item.createdAt
      })),
      ...students.slice(0, 3).map(item => ({
        label: "Student",
        title: item.name || item.studentId,
        date: item.createdAt
      })),
      ...classes.slice(0, 3).map(item => ({
        label: "Class",
        title: item.name,
        date: item.createdAt
      })),
      ...subjects.slice(0, 3).map(item => ({
        label: "Subject",
        title: item.name,
        date: item.createdAt
      })),
      ...tests.slice(0, 3).map(item => ({
        label: "Test",
        title: item.name,
        date: item.createdAt
      }))
    ]
      .filter(item => item.title)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);

    const recentActivityHtml = recentItems.map(item => `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <div>
          <b>${escapeHtml(item.title)}</b><br>
          <span style="color:#64748b;font-size:13px;">${escapeHtml(item.label)}</span>
        </div>
        <span style="color:#64748b;font-size:13px;white-space:nowrap;">${formatDate(item.date)}</span>
      </div>
    `).join("");

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

    const setupItems = [
      {
        label: "School admin created",
        done: admins.length > 0,
        href: "/admin-settings#admins"
      },
      {
        label: "Teachers added",
        done: teachers.length > 0,
        href: "/admin-settings#teachers"
      },
      {
        label: "Classes created",
        done: classes.length > 0,
        href: "/admin-settings#classes"
      },
      {
        label: "Subjects created",
        done: subjects.length > 0,
        href: "/admin-settings#subjects"
      },
      {
        label: "Teacher mappings created",
        done: mappings.length > 0,
        href: "/admin-settings#mappings"
      },
      {
        label: "Students added",
        done: students.length > 0,
        href: "/admin-settings#add-students"
      },
      {
        label: "Tests created",
        done: tests.length > 0,
        href: "/create-test"
      }
    ];

    const setupHtml = setupItems.map(item => `
      <div onclick="go(${jsString(item.href)})" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;cursor:pointer;background:${item.done ? "#ecfdf5" : "#fff7ed"};">
        <span style="font-weight:700;">${escapeHtml(item.label)}</span>
        <span style="font-weight:800;color:${item.done ? "#16a34a" : "#ea580c"};">${item.done ? "Done" : "Pending"}</span>
      </div>
    `).join("");

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
      <div style="background:white;border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <div style="color:#64748b;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(card.label)}</div>
        <div style="font-size:34px;font-weight:900;margin-top:10px;color:#0f172a;">${card.value}</div>
      </div>
    `).join("");

    res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<script>
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user || user.role !== "admin"){
  window.location.replace("/");
}
</script>
<div style="display:flex;height:100vh;overflow:hidden;">
  <aside style="
    width:150px;
    min-width:150px;
    height:100vh;
    background:#1e293b;
    color:white;
    padding:20px 16px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    box-sizing:border-box;
    flex-shrink:0;
  ">
    <div>
      <h2 style="margin-bottom:25px;">Admin</h2>
      <div onclick="go('/admin-dashboard')" style="padding:12px 14px;border-radius:8px;cursor:pointer;background:#334155;margin-bottom:10px;">Dashboard</div>
      <div onclick="go('/admin-settings')" style="padding:12px 14px;border-radius:8px;cursor:pointer;margin-bottom:10px;">Settings</div>
    </div>
    <div onclick="logout()" style="padding:12px 14px;border-radius:8px;cursor:pointer;color:#f87171;">Logout</div>
  </aside>

  <main style="
    flex:1;
    height:100vh;
    padding:30px;
    background:#eef2ff;
    overflow-y:auto;
    overflow-x:hidden;
    box-sizing:border-box;
  ">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0 0 8px 0;">Dashboard</h1>
        <p style="margin:0;color:#64748b;">${escapeHtml(school?.name || "School")} ${school?.code ? "(" + escapeHtml(school.code) + ")" : ""}</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
 <button onclick="go('/school-dashboard')" style="
    padding:12px 16px;
    background:#f59e0b;
    color:white;
    border:none;
    border-radius:10px;
    font-weight:800;
    cursor:pointer;
  ">
    ← Previous Page
  </button>

  <button onclick="go('/admin-settings')" style="
    padding:12px 16px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:10px;
    font-weight:800;
    cursor:pointer;
  ">
    Open Settings
  </button>
</div>
    </div>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:22px;">
      ${cardHtml}
    </section>

    <section style="display:grid;grid-template-columns:minmax(280px,420px) minmax(0,1fr);gap:20px;margin-bottom:22px;align-items:start;">
      <div style="background:white;border-radius:16px;padding:22px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <h2 style="margin-top:0;">Setup Checklist</h2>
        ${setupHtml}
      </div>

      <div style="background:white;border-radius:16px;padding:22px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <h2 style="margin-top:0;">Performance Summary</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;">
          <div style="background:#f8fafc;padding:16px;border-radius:12px;"><b>${results.length}</b><br><span style="color:#64748b;">Attempts</span></div>
          <div style="background:#f8fafc;padding:16px;border-radius:12px;"><b>${averageScore}%</b><br><span style="color:#64748b;">Avg Score</span></div>
          <div style="background:#f8fafc;padding:16px;border-radius:12px;"><b>${assignedStudents.size}</b><br><span style="color:#64748b;">Assigned</span></div>
          <div style="background:#f8fafc;padding:16px;border-radius:12px;"><b>${attemptedStudents.size}</b><br><span style="color:#64748b;">Attempted</span></div>
          <div style="background:#fee2e2;padding:16px;border-radius:12px;"><b>${low}</b><br><span style="color:#64748b;">Below 50%</span></div>
          <div style="background:#fef3c7;padding:16px;border-radius:12px;"><b>${mid}</b><br><span style="color:#64748b;">50–80%</span></div>
          <div style="background:#dcfce7;padding:16px;border-radius:12px;"><b>${high}</b><br><span style="color:#64748b;">Above 80%</span></div>
        </div>
      </div>
    </section>

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;align-items:start;">
      <div style="background:white;border-radius:16px;padding:22px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;overflow:auto;">
        <h2 style="margin-top:0;">Teacher Workload</h2>
        <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
          <tr style="background:#f1f5f9;">
            <th>Teacher</th>
            <th>Classes</th>
            <th>Subjects</th>
            <th>Students</th>
            <th>Tests</th>
          </tr>
          ${teacherWorkloadRows || "<tr><td colspan='5'>No teachers found</td></tr>"}
        </table>
      </div>

      <div style="background:white;border-radius:16px;padding:22px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
        <h2 style="margin-top:0;">Recent Activity</h2>
        ${recentActivityHtml || "<p style='color:#64748b;'>No recent activity yet.</p>"}
      </div>
    </section>

    <section style="background:white;border-radius:16px;padding:22px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;overflow:auto;">
      <h2 style="margin-top:0;">Class Overview</h2>
      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;text-align:center;background:white;">
        <tr style="background:#f1f5f9;">
          <th>Class</th>
          <th>Students</th>
          <th>Mapped Subjects</th>
          <th>Teachers</th>
          <th>Tests</th>
          <th>Avg Score</th>
          <th>Completion</th>
        </tr>
        ${classOverviewRows || "<tr><td colspan='7'>No classes found</td></tr>"}
      </table>
    </section>
  </main>
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
  window.location.replace("/admin-class?class=" + encodeURIComponent(cls));
}
</script>
</body>
`);
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);
    res.send("Error loading dashboard");
  }
};