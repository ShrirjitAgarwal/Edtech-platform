exports.adminSettingsPage = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.send("Access denied");
    }
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
function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
    function customDropdownHtml(id, label, value, minWidth = "160px") {
  return `
<div style="position:relative;min-width:${minWidth};width:${minWidth === "100%" ? "100%" : "auto"};">
  <button
    id="${escapeAttribute(id)}Button"
    type="button"
    onclick="toggleCustomDropdown('${escapeAttribute(id)}')"
    style="
      width:100%;
      padding:8px;
      border:1px solid #cbd5e1;
      border-radius:8px;
      background:white;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
    "
  >
    <span id="${escapeAttribute(id)}Label">${escapeHtml(label)}</span>
    <span>▾</span>
  </button>
  <div
    id="${escapeAttribute(id)}Menu"
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
      z-index:9999;
    "
  ></div>
  <input id="${escapeAttribute(id)}" type="hidden" value="${escapeAttribute(value)}">
</div>
`;
}
    const School = require("../models/School");
    const User = require("../models/User");
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const Test = require("../models/Test");
    const Result = require("../models/Result");
    const ClassSubject = require("../models/ClassSubject");
    const Subject = require("../models/Subject");
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      return res.send("School context missing");
    }
    const schoolScopedFilter = { schoolId };
const [
  school,
  admins,
  teachers,
  students,
  classes,
  tests,
  results,
  mappings,
  subjects
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
    .select("name schoolId schoolCode createdAt")
    .lean(),
  Test.find(schoolScopedFilter)
    .select("name subject className teacherId status schoolId schoolCode")
    .lean(),
  Result.find(schoolScopedFilter)
    .select("studentId testId score total schoolId schoolCode")
    .lean(),
  ClassSubject.find(schoolScopedFilter)
    .select("className subject teacherId schoolId schoolCode")
    .lean(),
  Subject.find(schoolScopedFilter)
    .select("name schoolId schoolCode createdAt")
    .sort({ name: 1 })
    .lean()
]);
const adminClassOptionsData = [...new Set(
  classes.map(c => c.name).filter(Boolean)
)].map(className => ({
  value: String(className),
  label: String(className)
}));
const adminSubjectOptionsData = subjects.map(s => ({
  value: String(s.name || ""),
  label: String(s.name || "")
})).filter(option => option.value);
const adminTeacherOptionsData = teachers.map(t => ({
  value: String(t._id),
  label: String(t.name || t.email || "Unnamed Teacher")
}));
const studentDropdownData = students.map(s => {
  const assignedTeacher = teachers.find(t =>
    String(t._id) === String(s.teacherId)
  );
  return {
    studentId: String(s._id),
    classValue: String(s.class || ""),
    classLabel: String(s.class || "Select Class"),
    teacherValue: String(s.teacherId || ""),
    teacherLabel: assignedTeacher
      ? String(assignedTeacher.name || assignedTeacher.email || "Select Teacher")
      : "Select Teacher"
  };
});
    const subjectRows = subjects.map(s => {
  const subjectName = String(s.name || "").trim();
  const mappedClasses = [...new Set(
    mappings
      .filter(m =>
        String(m.subject || "").trim().toLowerCase() ===
        subjectName.toLowerCase()
      )
      .map(m => String(m.className || "").trim())
      .filter(Boolean)
  )];
  const mappedTeachers = [...new Set(
    mappings
      .filter(m =>
        String(m.subject || "").trim().toLowerCase() ===
        subjectName.toLowerCase()
      )
      .map(m => {
        const teacher = teachers.find(t =>
          String(t._id) === String(m.teacherId)
        );
        return teacher
          ? String(teacher.name || teacher.email || "Unknown")
          : "Unknown";
      })
      .filter(Boolean)
  )];
  return `
<tr>
  <td>${escapeHtml(subjectName || "-")}</td>
  <td>${escapeHtml(mappedClasses.join(", ") || "-")}</td>
  <td>${escapeHtml(mappedTeachers.join(", ") || "-")}</td>
  <td>${
    s.createdAt
      ? escapeHtml(new Date(s.createdAt).toLocaleString())
      : "-"
  }</td>
  <td>
    <button
      onclick="deleteSubject('${escapeAttribute(s._id)}')"
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
    const mappingRows = mappings.map(m => {
  const teacher = teachers.find(t =>
    String(t._id) === String(m.teacherId)
  );
  const teacherDisplay = teacher
    ? teacher.name || teacher.email || "Unknown"
    : "Unknown";
  return `
<tr>
  <td>${escapeHtml(m.className || "-")}</td>
  <td>${escapeHtml(m.subject || "-")}</td>
  <td>${escapeHtml(teacherDisplay)}</td>
  <td>
    <button
      onclick="deleteMapping('${escapeAttribute(m._id)}')"
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
  <td>${escapeHtml(t.name || "-")}</td>
  <td>${escapeHtml(t.email || "-")}</td>
  <td>${escapeHtml(t.role || "-")}</td>
  <td>${escapeHtml(t.createdByName || "-")}</td>
  <td>${
    t.createdAt
      ? escapeHtml(new Date(t.createdAt).toLocaleString())
      : "-"
  }</td>
  <td>
    ${
      String(t._id) === String(req.user.id)
        ? `<span style="color:#64748b;font-weight:600;">Current User</span>`
        : `
          <button
            onclick="deleteUser('${escapeAttribute(t._id)}')"
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
const studentRows = students.map(s => {
  const assignedTeacher = teachers.find(t =>
    String(t._id) === String(s.teacherId)
  );
  const assignedTeacherDisplay = assignedTeacher
    ? assignedTeacher.name || assignedTeacher.email || "-"
    : "-";
  const studentName = s.name || s.fullName || "-";
  const studentIdDisplay = s.studentId || "-";
  const studentClass = s.class || "";
  const studentTeacherId = s.teacherId || "";
  return `
<tr
  class="studentSettingsRow"
  data-student-name="${escapeAttribute(studentName)}"
  data-student-id="${escapeAttribute(studentIdDisplay)}"
  data-student-class="${escapeAttribute(studentClass)}"
  data-teacher-id="${escapeAttribute(studentTeacherId)}"
>
  <td>${escapeHtml(studentName)}</td>
  <td>${escapeHtml(studentIdDisplay)}</td>
  <td>${escapeHtml(studentClass || "-")}</td>
  <td>${escapeHtml(assignedTeacherDisplay)}</td>
  <td>
    ${customDropdownHtml(
      "studentClass-" + String(s._id),
      s.class || "Select Class",
      s.class || "",
      "150px"
    )}
  </td>
  <td>
    ${customDropdownHtml(
      "studentTeacher-" + String(s._id),
      assignedTeacherDisplay === "-" ? "Select Teacher" : assignedTeacherDisplay,
      s.teacherId || "",
      "190px"
    )}
  </td>
  <td>
    <button
      onclick="updateStudentClass('${escapeAttribute(s._id)}')"
      style="
        background:#4f46e5;
        color:white;
        border:none;
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
        margin-right:8px;
      "
    >
      Save
    </button>
    <button
      onclick="deleteStudent('${escapeAttribute(s._id)}')"
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
const classRows = classes.map(c => {
  const className = String(c.name || "").trim();
  const studentCount = students.filter(s =>
    String(s.class || "").trim().toUpperCase() ===
    className.toUpperCase()
  ).length;
  const mappedSubjects = [...new Set(
    mappings
      .filter(m =>
        String(m.className || "").trim().toUpperCase() ===
        className.toUpperCase()
      )
      .map(m => String(m.subject || "").trim())
      .filter(Boolean)
  )];
  const mappedTeachers = [...new Set(
    mappings
      .filter(m =>
        String(m.className || "").trim().toUpperCase() ===
        className.toUpperCase()
      )
      .map(m => {
        const teacher = teachers.find(t =>
          String(t._id) === String(m.teacherId)
        );
        return teacher
          ? String(teacher.name || teacher.email || "Unknown")
          : "Unknown";
      })
      .filter(Boolean)
  )];
  return `
<tr>
  <td>${escapeHtml(className || "-")}</td>
  <td>${studentCount}</td>
  <td>${escapeHtml(mappedTeachers.join(", ") || "-")}</td>
  <td>${escapeHtml(mappedSubjects.join(", ") || "-")}</td>
  <td>${
    c.createdAt
      ? escapeHtml(new Date(c.createdAt).toLocaleString())
      : "-"
  }</td>
  <td>
    <button
      onclick="deleteClass('${escapeAttribute(c._id)}')"
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
const adminRows = admins.map(a => `
<tr>
  <td>${escapeHtml(a.name || "-")}</td>
  <td>${escapeHtml(a.email || "-")}</td>
  <td>${escapeHtml(a.role || "-")}</td>
  <td>${escapeHtml(a.createdByName || "-")}</td>
  <td>${
    a.createdAt
      ? escapeHtml(new Date(a.createdAt).toLocaleString())
      : "-"
  }</td>
  <td>
    ${
      String(a._id) === String(req.user.id)
        ? `<span style="color:#64748b;font-weight:600;">Current User</span>`
        : `
          <button
            onclick="deleteUser('${escapeAttribute(a._id)}')"
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
    res.send(`
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<div style="display:flex;height:100vh;overflow:hidden;">
<aside style="
 width:150px;
 min-width:150px;
 height:100vh;
 background:#1e293b;
 color:white;
 padding:20px 16px;
 box-sizing:border-box;
 display:flex;
 flex-direction:column;
 justify-content:space-between;
 flex-shrink:0;
">
    <div>
      <h2>Admin</h2>
      <div onclick="go('/admin-dashboard')" style="padding:12px;border-radius:8px;cursor:pointer;margin-bottom:10px;">
        Dashboard
      </div>
      <div onclick="go('/admin-settings')" style="padding:12px;border-radius:8px;cursor:pointer;background:#334155;margin-bottom:10px;">
        Settings
      </div>
    </div>
    <div onclick="logout()" style="padding:12px;border-radius:8px;cursor:pointer;color:#f87171;">
      Logout
    </div>
</aside>
<div style="
 flex:1;
 height:100vh;
 padding:30px 36px;
 overflow-y:auto;
 overflow-x:hidden;
 box-sizing:border-box;
 background:#eef2ff;
">
    <div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Admin Settings</h1>
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
</div>
    <div style="
      display:grid;
      grid-template-columns:220px minmax(0, 1fr);
      gap:20px;
      align-items:start;
      width:100%;
      box-sizing:border-box;
    ">
      <div style="
        background:white;
        padding:14px;
        border-radius:16px;
        box-shadow:0 4px 12px rgba(0,0,0,0.06);
        position:sticky;
        top:20px;
        box-sizing:border-box;
      ">
        <button class="adminPanelButton" onclick="showAdminPanel('overview', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#334155;color:white;cursor:pointer;text-align:left;font-weight:700;">
          Overview
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('teachers', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Teachers
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('admins', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Admins
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('classes', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Classes
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('subjects', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
  Subjects
</button>
        <button class="adminPanelButton" onclick="showAdminPanel('students', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Students
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('add-students', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Add Students
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('mappings', this)" style="width:100%;padding:14px 14px;margin-bottom:12px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Teacher Mappings
        </button>
        <button class="adminPanelButton" onclick="showAdminPanel('payments', this)" style="width:100%;padding:14px 14px;border:none;border-radius:8px;background:#f8fafc;color:#0f172a;cursor:pointer;text-align:left;font-weight:700;">
          Payments
        </button>
      </div>
      <div style="
        width:100%;
        min-width:0;
        box-sizing:border-box;
        display:block;
      ">
    <div id="panel-overview" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;width:100%;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <h2>School Overview</h2>
      <p><b>School Name:</b> ${escapeHtml(school?.name || "N/A")}</p>
      <p><b>School Code:</b> ${escapeHtml(school?.code || req.user.schoolCode || "N/A")}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:24px;width:100%;">
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${admins.length}</b><br>Admins</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${teachers.length}</b><br>Teachers</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${students.length}</b><br>Students</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${classes.length}</b><br>Classes</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${tests.length}</b><br>Tests</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${results.length}</b><br>Results</div>
        <div style="background:#f8fafc;padding:22px;border-radius:14px;border:1px solid #e5e7eb;"><b>${mappings.length}</b><br>Mappings</div>
      </div>
    </div>
    <div id="panel-mappings" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
      <h2>Map Teacher to Class and Subject</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;">
        ${customDropdownHtml("mapClassName", "Select Class", "", "180px")}
        ${customDropdownHtml("mapSubject", "Select Subject", "", "180px")}
        ${customDropdownHtml("mapTeacherId", "Select Teacher", "", "220px")}
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
        <div id="panel-teachers" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
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
            <div id="panel-classes" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Classes</h2>
          <p style="margin:0;color:#64748b;">
            Create and manage classes for this school.
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
        <h3 style="margin-top:0;">Create Class</h3>
        <div style="
          display:grid;
          grid-template-columns:1fr auto;
          gap:12px;
          align-items:center;
        ">
          <input
            id="newClassName"
            placeholder="Class name, example C1"
            style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;"
          />
          <button onclick="createClass()" style="
            padding:11px 16px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          ">
            Add Class
          </button>
        </div>
      </div>
      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<tr>
  <th>Class</th>
  <th>Students</th>
  <th>Mapped Teachers</th>
  <th>Mapped Subjects</th>
  <th>Created Date</th>
  <th>Action</th>
</tr>
        ${classRows || "<tr><td colspan='6'>No classes found</td></tr>"}
      </table>
    </div>
    <div id="panel-subjects" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:18px;
    margin-bottom:20px;
  ">
    <div>
      <h2 style="margin:0 0 6px 0;">Subjects</h2>
      <p style="margin:0;color:#64748b;">
        Create and manage subjects for this school.
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
    <h3 style="margin-top:0;">Create Subject</h3>
    <div style="
      display:grid;
      grid-template-columns:1fr auto;
      gap:12px;
      align-items:center;
    ">
      <input
        id="newSubjectName"
        placeholder="Subject name, example Maths"
        style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;"
      />
      <button onclick="createSubject()" style="
        padding:11px 16px;
        background:#16a34a;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        font-weight:700;
      ">
        Add Subject
      </button>
    </div>
  </div>
  <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<tr>
  <th>Subject</th>
  <th>Mapped Classes</th>
  <th>Mapped Teachers</th>
  <th>Created Date</th>
  <th>Action</th>
</tr>
    ${subjectRows || "<tr><td colspan='5'>No subjects found</td></tr>"}
  </table>
</div>
        <div id="panel-students" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Students</h2>
          <p style="margin:0;color:#64748b;">
            View students, assign them to classes, map them to teachers, and delete records.
          </p>
        </div>
      </div>
      <div style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        padding:16px;
        border-radius:12px;
        margin-bottom:18px;
      ">
        <div style="
          display:grid;
          grid-template-columns:minmax(220px, 1fr) 180px 220px 130px;
          gap:12px;
          align-items:center;
          margin-bottom:12px;
        ">
          <input
            id="studentSearchInput"
            placeholder="Search name or student ID"
            style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;"
          />
          ${customDropdownHtml("studentFilterClass", "All Classes", "", "180px")}
          ${customDropdownHtml("studentFilterTeacher", "All Teachers", "", "220px")}
          <select
            id="studentPageSize"
            style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;background:white;"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        ">
          <div id="studentFilteredCount" style="color:#475569;font-weight:700;">
            Showing ${students.length} students
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button
              id="studentPrevPageButton"
              onclick="changeStudentPage(-1)"
              style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer;font-weight:700;"
            >
              Previous
            </button>
            <span id="studentPageInfo" style="color:#475569;font-weight:700;">Page 1</span>
            <button
              id="studentNextPageButton"
              onclick="changeStudentPage(1)"
              style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer;font-weight:700;"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<thead>
<tr>
  <th>Name</th>
  <th>Student ID</th>
  <th>Class</th>
  <th>Current Teacher</th>
  <th>Assign Class</th>
  <th>Assign Teacher</th>
  <th>Action</th>
</tr>
</thead>
<tbody id="studentTableBody">
        ${studentRows}
<tr id="studentNoResultsRow" style="display:none;">
  <td colspan="7">No students found</td>
</tr>
</tbody>
      </table>
    </div>
        <div id="panel-admins" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);overflow:auto;">
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
        <div id="panel-add-students" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:20px;
      ">
        <div>
          <h2 style="margin:0 0 6px 0;">Add Students</h2>
          <p style="margin:0;color:#64748b;">
            Select one class and teacher, then add multiple students in one go.
          </p>
        </div>
      </div>
      <div style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        padding:18px;
        border-radius:12px;
        margin-bottom:22px;
      ">
        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
          margin-bottom:18px;
        ">
          ${customDropdownHtml("bulkStudentClass", "Select Class", "", "100%")}
          ${customDropdownHtml("bulkStudentTeacherId", "Select Teacher", "", "100%")}
        </div>
        <div id="bulkStudentRows"></div>
        <div style="
          display:flex;
          gap:12px;
          margin-top:18px;
        ">
          <button onclick="addBulkStudentRow()" style="
            padding:11px 16px;
            background:#334155;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          ">
            Add Row
          </button>
          <button onclick="saveBulkStudents()" style="
            padding:11px 16px;
            background:#16a34a;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            font-weight:700;
          ">
            Save All Students
          </button>
        </div>
      </div>
    </div>
    <div id="panel-payments" class="adminPanel" style="background:white;padding:32px;border-radius:16px;margin-bottom:20px;display:none;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <h2>Payments and Invoices</h2>
      <p style="color:#64748b;">Coming later.</p>
    </div>
      </div>
    </div>
  </div>
</div>
<script>
const adminClassOptions = ${safeJsonForScript(adminClassOptionsData)};
const adminSubjectOptions = ${safeJsonForScript(adminSubjectOptionsData)};
const adminTeacherOptions = ${safeJsonForScript(adminTeacherOptionsData)};
const studentDropdowns = ${safeJsonForScript(studentDropdownData)};
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
  });
}
window.toggleCustomDropdown = function(inputId){
  const menu = document.getElementById(inputId + "Menu");
  if(!menu){
    return;
  }
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  if(isOpen){
    menu.style.display = "none";
    return;
  }
  menu.style.display = "block";
};
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
  } else if(currentValue){
    input.value = currentValue;
    label.textContent = label.textContent || "Select";
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
function initializeAdminDropdowns(){
  const classOptions = [
    { value: "", label: "Select Class" },
    ...adminClassOptions
  ];
  const subjectOptions = [
    { value: "", label: "Select Subject" },
    ...adminSubjectOptions
  ];
  const teacherOptions = [
    { value: "", label: "Select Teacher" },
    ...adminTeacherOptions
  ];
  const filterClassOptions = [
    { value: "", label: "All Classes" },
    ...adminClassOptions
  ];
  const filterTeacherOptions = [
    { value: "", label: "All Teachers" },
    ...adminTeacherOptions
  ];
  setCustomDropdownOptions("mapClassName", classOptions);
  setCustomDropdownOptions("mapSubject", subjectOptions);
  setCustomDropdownOptions("mapTeacherId", teacherOptions);
  setCustomDropdownOptions("bulkStudentClass", classOptions);
  setCustomDropdownOptions("bulkStudentTeacherId", teacherOptions);
  setCustomDropdownOptions("studentFilterClass", filterClassOptions, resetStudentPagination);
  setCustomDropdownOptions("studentFilterTeacher", filterTeacherOptions, resetStudentPagination);
  const studentSearchInput = document.getElementById("studentSearchInput");
  if(studentSearchInput){
    studentSearchInput.addEventListener("input", resetStudentPagination);
  }
  const studentPageSize = document.getElementById("studentPageSize");
  if(studentPageSize){
    studentPageSize.addEventListener("change", resetStudentPagination);
  }
  studentDropdowns.forEach(student => {
    setCustomDropdownOptions(
      "studentClass-" + student.studentId,
      classOptions
    );
    const studentClassInput = document.getElementById("studentClass-" + student.studentId);
    const studentClassLabel = document.getElementById("studentClass-" + student.studentId + "Label");
    if(student.classValue && studentClassInput && studentClassLabel){
      studentClassInput.value = student.classValue;
      studentClassLabel.textContent = student.classLabel;
    }
    setCustomDropdownOptions(
      "studentTeacher-" + student.studentId,
      teacherOptions
    );
    const studentTeacherInput = document.getElementById("studentTeacher-" + student.studentId);
    const studentTeacherLabel = document.getElementById("studentTeacher-" + student.studentId + "Label");
    if(student.teacherValue && studentTeacherInput && studentTeacherLabel){
      studentTeacherInput.value = student.teacherValue;
      studentTeacherLabel.textContent = student.teacherLabel;
    }
  });
  applyStudentFilters();
}
setTimeout(function(){
  initializeAdminDropdowns();
}, 0);
let studentCurrentPage = 1;
function getStudentPageSize(){
  const pageSizeSelect = document.getElementById("studentPageSize");
  const pageSize = parseInt(pageSizeSelect?.value || "10", 10);
  return Number.isNaN(pageSize) ? 10 : pageSize;
}
function resetStudentPagination(){
  studentCurrentPage = 1;
  applyStudentFilters();
}
function changeStudentPage(direction){
  studentCurrentPage += direction;
  applyStudentFilters();
}
function applyStudentFilters(){
  const rows = Array.from(document.querySelectorAll(".studentSettingsRow"));
  const noResultsRow = document.getElementById("studentNoResultsRow");
  const countLabel = document.getElementById("studentFilteredCount");
  const pageInfo = document.getElementById("studentPageInfo");
  const previousButton = document.getElementById("studentPrevPageButton");
  const nextButton = document.getElementById("studentNextPageButton");
  const searchValue = (
    document.getElementById("studentSearchInput")?.value || ""
  ).trim().toLowerCase();
  const classValue = document.getElementById("studentFilterClass")?.value || "";
  const teacherValue = document.getElementById("studentFilterTeacher")?.value || "";
  const pageSize = getStudentPageSize();
  const filteredRows = rows.filter(row => {
    const rowName = (row.dataset.studentName || "").toLowerCase();
    const rowStudentId = (row.dataset.studentId || "").toLowerCase();
    const rowClass = row.dataset.studentClass || "";
    const rowTeacherId = row.dataset.teacherId || "";
    const matchesSearch =
      !searchValue ||
      rowName.includes(searchValue) ||
      rowStudentId.includes(searchValue);
    const matchesClass =
      !classValue ||
      rowClass === classValue;
    const matchesTeacher =
      !teacherValue ||
      rowTeacherId === teacherValue;
    return matchesSearch && matchesClass && matchesTeacher;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  if(studentCurrentPage < 1){
    studentCurrentPage = 1;
  }
  if(studentCurrentPage > totalPages){
    studentCurrentPage = totalPages;
  }
  const startIndex = (studentCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  rows.forEach(row => {
    row.style.display = "none";
  });
  filteredRows.slice(startIndex, endIndex).forEach(row => {
    row.style.display = "";
  });
  if(noResultsRow){
    noResultsRow.style.display = filteredRows.length === 0 ? "" : "none";
  }
  if(countLabel){
    const visibleStart = filteredRows.length === 0 ? 0 : startIndex + 1;
    const visibleEnd = Math.min(endIndex, filteredRows.length);
    countLabel.textContent =
      "Showing " +
      visibleStart +
      "-" +
      visibleEnd +
      " of " +
      filteredRows.length +
      " filtered students";
  }
  if(pageInfo){
    pageInfo.textContent = "Page " + studentCurrentPage + " of " + totalPages;
  }
  if(previousButton){
    previousButton.disabled = studentCurrentPage <= 1;
    previousButton.style.opacity = previousButton.disabled ? "0.55" : "1";
    previousButton.style.cursor = previousButton.disabled ? "not-allowed" : "pointer";
  }
  if(nextButton){
    nextButton.disabled = studentCurrentPage >= totalPages;
    nextButton.style.opacity = nextButton.disabled ? "0.55" : "1";
    nextButton.style.cursor = nextButton.disabled ? "not-allowed" : "pointer";
  }
}
function showAdminPanel(panelName, button){
  document.querySelectorAll(".adminPanel").forEach(panel => {
    panel.style.display = "none";
  });
  const selectedPanel = document.getElementById("panel-" + panelName);
  if(!selectedPanel){
    alert("Panel not found: " + panelName);
    return;
  }
  selectedPanel.style.display = "block";
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
  fetch("/logout", {
    method: "POST"
  }).finally(() => {
    localStorage.clear();
    window.location.href = "/";
  });
}
  function createSubject(){
  const name =
    document
      .getElementById("newSubjectName")
      .value
      .trim();
  if(!name){
    alert("Subject name is required");
    return;
  }
  fetch("/admin/create-subject", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      name
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Subject created");
    location.reload();
  })
  .catch(() => {
    alert("Failed to create subject");
  });
}
function deleteSubject(subjectId){
  if(!confirm("Delete this subject?")){
    return;
  }
  fetch("/admin/delete-subject", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      subjectId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Subject deleted");
    location.reload();
  })
  .catch(() => {
    alert("Failed to delete subject");
  });
}
  function createClass(){
  const name =
    document
      .getElementById("newClassName")
      .value
      .trim();
  if(!name){
    alert("Class name is required");
    return;
  }
  fetch("/admin/create-class", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      name
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Class created");
    location.reload();
  })
  .catch(() => {
    alert("Failed to create class");
  });
}
function deleteClass(classId){
  if(!confirm("Delete this class?")){
    return;
  }
  fetch("/admin/delete-class", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      classId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Class deleted");
    location.reload();
  })
  .catch(() => {
    alert("Failed to delete class");
  });
}
function updateStudentClass(studentMongoId){
  const className =
    document
      .getElementById("studentClass-" + studentMongoId)
      .value
      .trim();
  const teacherId =
    document
      .getElementById("studentTeacher-" + studentMongoId)
      .value
      .trim();
  if(!className || !teacherId){
    alert("Class and teacher are required");
    return;
  }
  fetch("/admin/update-student-class", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      studentMongoId,
      className,
      teacherId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Student updated");
    location.reload();
  })
  .catch(() => {
    alert("Failed to update student");
  });
}
function deleteStudent(studentMongoId){
  if(!confirm("Delete this student?")){
    return;
  }
  fetch("/admin/delete-student", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      studentMongoId
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Student deleted");
    location.reload();
  })
  .catch(() => {
    alert("Failed to delete student");
  });
}
  function addBulkStudentRow(){
  const container = document.getElementById("bulkStudentRows");
  if(!container){
    return;
  }
  const row = document.createElement("div");
  row.className = "bulkStudentRow";
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr 1fr auto";
  row.style.gap = "12px";
  row.style.marginBottom = "12px";
  row.innerHTML =
    '<input class="bulkStudentName" placeholder="Student name" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />' +
    '<input class="bulkStudentId" placeholder="Student ID" style="padding:11px;border:1px solid #cbd5e1;border-radius:8px;" />' +
    '<button onclick="this.parentElement.remove()" style="padding:11px 14px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Remove</button>';
  container.appendChild(row);
}
function saveBulkStudents(){
  const className =
    document
      .getElementById("bulkStudentClass")
      .value
      .trim();
  const teacherId =
    document
      .getElementById("bulkStudentTeacherId")
      .value
      .trim();
  const rows = Array.from(
    document.querySelectorAll(".bulkStudentRow")
  );
  const students = rows.map(row => ({
    name: row.querySelector(".bulkStudentName").value.trim(),
    studentId: row.querySelector(".bulkStudentId").value.trim()
  })).filter(s => s.name && s.studentId);
  if(!className || !teacherId){
    alert("Class and teacher are required");
    return;
  }
  if(students.length === 0){
    alert("Add at least one valid student");
    return;
  }
  fetch("/admin/bulk-create-students", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      className,
      teacherId,
      students
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert((data.createdCount || students.length) + " students created");
    location.reload();
  })
  .catch(() => {
    alert("Failed to create students");
  });
}
setTimeout(function(){
  if(document.getElementById("bulkStudentRows")){
    addBulkStudentRow();
    addBulkStudentRow();
    addBulkStudentRow();
  }
}, 0);
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
  "Content-Type":"application/json"
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
        "Content-Type":"application/json",
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
        "Content-Type":"application/json",
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
