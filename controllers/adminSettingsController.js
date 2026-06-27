const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../utils/html");
const sidebar = require("../views/sidebar");
exports.adminSettingsPage = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.send("Access denied");
    }
    function customDropdownHtml(id, label, value, minWidth = "160px") {
  return `
<div style="position:relative;min-width:${minWidth};width:${minWidth === "100%" ? "100%" : "auto"};">
  <button
    id="${escapeAttribute(id)}Button"
    type="button"
    class="admin-custom-dropdown-toggle"
    data-dropdown-id="${escapeAttribute(id)}"
    style="
      width:100%;
      padding:10px 12px;
      border:1px solid rgba(17,22,29,0.12);
      border-radius:8px;
      background:white;
      cursor:pointer;
      text-align:left;
      display:flex;
      justify-content:space-between;
      align-items:center;
      box-sizing:border-box;
      font-family:'Inter',system-ui,sans-serif;
      font-size:14px;
      color:#11161d;
    "
  >
    <span id="${escapeAttribute(id)}Label">${escapeHtml(label)}</span>
    <i class="ti ti-chevron-down" style="font-size:13px;color:#3a4654;flex-shrink:0;"></i>
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
      border:1px solid rgba(17,22,29,0.12);
      border-radius:10px;
      box-shadow:0 8px 24px rgba(17,22,29,0.12);
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
      class="delete-subject-button"
      data-subject-id="${escapeAttribute(s._id)}"
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
      class="delete-mapping-button"
      data-mapping-id="${escapeAttribute(m._id)}"
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
        ? `<span style="color:#3a4654;font-weight:500;font-size:13px;">Current User</span>`
        : `
          <button
            class="delete-teacher-button"
            data-teacher-id="${escapeAttribute(t._id)}"
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
      class="update-student-class-button"
      data-student-record-id="${escapeAttribute(s._id)}"
      style="
        background:#e0633a;
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
      class="delete-student-button"
      data-student-record-id="${escapeAttribute(s._id)}"
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
      class="delete-class-button"
      data-class-id="${escapeAttribute(c._id)}"
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
        ? `<span style="color:#3a4654;font-weight:500;font-size:13px;">Current User</span>`
        : `
          <button
            class="delete-user-button"
            data-user-id="${escapeAttribute(a._id)}"
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
  .admin-input{padding:10px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;font-family:var(--sans);font-size:14px;color:var(--ink);background:white;width:100%;box-sizing:border-box;}
  .admin-input:focus{outline:none;border-color:rgba(224,99,58,0.5);}
  .panel-card{background:white;border:1px solid var(--line);border-radius:14px;margin-bottom:20px;}
  .panel-card-body{padding:20px;}
  .panel-card-header{padding:14px 20px;border-bottom:1px solid var(--line-soft);}
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
  ${sidebar("admin-settings", "admin")}
  <div style="flex:1;height:100vh;overflow:hidden;display:flex;flex-direction:column;">
    <div style="padding:24px 40px;display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid var(--line);background:var(--paper);flex-shrink:0;">
      <div>
        <h1 style="font-family:var(--display);font-size:26px;font-weight:600;color:var(--ink);letter-spacing:-0.02em;">Admin Settings</h1>
        <p style="margin-top:3px;color:var(--slate);font-size:14px;">${escapeHtml(school?.name || "School")} &middot; Manage teachers, students, classes, and mappings</p>
      </div>
      <button id="adminSettingsPreviousPageButton" style="padding:10px 14px;background:#f59e0b;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:700;cursor:pointer;">← Previous Page</button>
    </div>
    <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:190px minmax(0,1fr);">
      <div style="background:white;border-right:1px solid var(--line);padding:14px 10px;overflow-y:auto;flex-shrink:0;">
        <button class="adminPanelButton" data-panel="overview" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:rgba(224,99,58,0.12);color:#e0633a;cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-layout-dashboard" style="font-size:15px;flex-shrink:0;"></i>Overview</button>
        <button class="adminPanelButton" data-panel="teachers" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-users" style="font-size:15px;flex-shrink:0;"></i>Teachers</button>
        <button class="adminPanelButton" data-panel="admins" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-shield-check" style="font-size:15px;flex-shrink:0;"></i>Admins</button>
        <button class="adminPanelButton" data-panel="classes" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-building" style="font-size:15px;flex-shrink:0;"></i>Classes</button>
        <button class="adminPanelButton" data-panel="subjects" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-books" style="font-size:15px;flex-shrink:0;"></i>Subjects</button>
        <button class="adminPanelButton" data-panel="students" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-id-badge" style="font-size:15px;flex-shrink:0;"></i>Students</button>
        <button class="adminPanelButton" data-panel="add-students" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-user-plus" style="font-size:15px;flex-shrink:0;"></i>Add Students</button>
        <button class="adminPanelButton" data-panel="mappings" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-arrows-exchange" style="font-size:15px;flex-shrink:0;"></i>Mappings</button>
        <button class="adminPanelButton" data-panel="payments" style="width:100%;padding:9px 12px;margin-bottom:3px;border:none;border-radius:8px;background:transparent;color:var(--slate);cursor:pointer;text-align:left;font-family:var(--sans);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;transition:background .12s,color .12s;"><i class="ti ti-credit-card" style="font-size:15px;flex-shrink:0;"></i>Payments</button>
      </div>
      <div style="padding:28px 36px;overflow-y:auto;background:var(--paper);">

        <div id="panel-overview" class="adminPanel" style="display:block;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">School Overview</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;"><b style="color:var(--ink);">Name:</b> ${escapeHtml(school?.name || "N/A")} &nbsp;&middot;&nbsp; <b style="color:var(--ink);">Code:</b> ${escapeHtml(school?.code || req.user.schoolCode || "N/A")}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;">
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${admins.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Admins</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${teachers.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Teachers</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${students.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Students</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${classes.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Classes</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${tests.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Tests</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${results.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Results</div></div>
            <div style="background:var(--accent-bg);border:1px solid var(--accent-border);padding:18px;border-radius:14px;"><div style="font-size:24px;font-weight:700;color:var(--ink);">${mappings.length}</div><div style="color:var(--slate);font-size:13px;margin-top:2px;">Mappings</div></div>
          </div>
        </div>

        <div id="panel-mappings" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:20px;">Teacher Mappings</h2>
          <div class="panel-card"><div class="panel-card-body">
            <h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:14px;">Map Teacher to Class and Subject</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
              ${customDropdownHtml("mapClassName", "Select Class", "", "100%")}
              ${customDropdownHtml("mapSubject", "Select Subject", "", "100%")}
              ${customDropdownHtml("mapTeacherId", "Select Teacher", "", "100%")}
              <button id="saveMappingButton" style="padding:10px 16px;background:var(--accent);color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">Save Mapping</button>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <div class="panel-card-header"><h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);">Current Mappings</h3></div>
            <table class="dash-table"><thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th>Action</th></tr></thead>
            <tbody>${mappingRows || "<tr><td colspan='4' style='color:var(--slate);padding:16px;'>No mappings found</td></tr>"}</tbody></table>
          </div>
        </div>

        <div id="panel-teachers" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Teachers</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">Create teachers and manage teacher accounts for this school.</p>
          <div class="panel-card"><div class="panel-card-body">
            <h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:14px;">Create Teacher</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
              <input id="newTeacherName" placeholder="Teacher name" class="admin-input" />
              <input id="newTeacherEmail" placeholder="Teacher email" class="admin-input" />
              <input id="newTeacherPassword" placeholder="Temporary password" type="password" class="admin-input" />
              <button class="add-user-role-button" data-role="teacher" data-prefix="newTeacher" style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">Add Teacher</button>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <table class="dash-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created By</th><th>Created Date</th><th>Action</th></tr></thead>
            <tbody>${teacherRows || "<tr><td colspan='6' style='color:var(--slate);padding:16px;'>No teachers found</td></tr>"}</tbody></table>
          </div>
        </div>

        <div id="panel-classes" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Classes</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">Create and manage classes for this school.</p>
          <div class="panel-card"><div class="panel-card-body">
            <h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:14px;">Create Class</h3>
            <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;">
              <input id="newClassName" placeholder="Class name, example C1" class="admin-input" />
              <button id="createClassButton" style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">Add Class</button>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <table class="dash-table"><thead><tr><th>Class</th><th>Students</th><th>Mapped Teachers</th><th>Mapped Subjects</th><th>Created Date</th><th>Action</th></tr></thead>
            <tbody>${classRows || "<tr><td colspan='6' style='color:var(--slate);padding:16px;'>No classes found</td></tr>"}</tbody></table>
          </div>
        </div>

        <div id="panel-subjects" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Subjects</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">Create and manage subjects for this school.</p>
          <div class="panel-card"><div class="panel-card-body">
            <h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:14px;">Create Subject</h3>
            <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;">
              <input id="newSubjectName" placeholder="Subject name, example Maths" class="admin-input" />
              <button id="createSubjectButton" style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">Add Subject</button>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <table class="dash-table"><thead><tr><th>Subject</th><th>Mapped Classes</th><th>Mapped Teachers</th><th>Created Date</th><th>Action</th></tr></thead>
            <tbody>${subjectRows || "<tr><td colspan='5' style='color:var(--slate);padding:16px;'>No subjects found</td></tr>"}</tbody></table>
          </div>
        </div>

        <div id="panel-students" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Students</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">View students, assign them to classes, map them to teachers, and delete records.</p>
          <div class="panel-card"><div class="panel-card-body">
            <div style="display:grid;grid-template-columns:minmax(180px,1fr) 160px 200px 120px;gap:12px;align-items:center;margin-bottom:12px;">
              <input id="studentSearchInput" placeholder="Search name or student ID" class="admin-input" />
              ${customDropdownHtml("studentFilterClass", "All Classes", "", "100%")}
              ${customDropdownHtml("studentFilterTeacher", "All Teachers", "", "100%")}
              <select id="studentPageSize" style="padding:10px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;background:white;font-family:var(--sans);font-size:14px;color:var(--ink);width:100%;">
                <option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option><option value="100">100 / page</option>
              </select>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div id="studentFilteredCount" style="color:var(--slate);font-size:13px;font-weight:500;">Showing ${students.length} students</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <button id="studentPrevPageButton" class="student-page-button" data-page-delta="-1" style="padding:7px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;background:white;cursor:pointer;font-family:var(--sans);font-size:13px;font-weight:500;">Previous</button>
                <span id="studentPageInfo" style="color:var(--slate);font-size:13px;font-weight:500;">Page 1</span>
                <button id="studentNextPageButton" class="student-page-button" data-page-delta="1" style="padding:7px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;background:white;cursor:pointer;font-family:var(--sans);font-size:13px;font-weight:500;">Next</button>
              </div>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <table class="dash-table"><thead><tr><th>Name</th><th>Student ID</th><th>Class</th><th>Current Teacher</th><th>Assign Class</th><th>Assign Teacher</th><th>Action</th></tr></thead>
            <tbody id="studentTableBody">
              ${studentRows}
              <tr id="studentNoResultsRow" style="display:none;"><td colspan="7" style="color:var(--slate);padding:16px;">No students found</td></tr>
            </tbody></table>
          </div>
        </div>

        <div id="panel-admins" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Admins</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">Create school admins and manage admin accounts for this school.</p>
          <div class="panel-card"><div class="panel-card-body">
            <h3 style="font-family:var(--display);font-size:15px;font-weight:600;color:var(--ink);margin-bottom:14px;">Create Admin</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
              <input id="newAdminName" placeholder="Admin name" class="admin-input" />
              <input id="newAdminEmail" placeholder="Admin email" class="admin-input" />
              <input id="newAdminPassword" placeholder="Temporary password" type="password" class="admin-input" />
              <button class="add-user-role-button" data-role="admin" data-prefix="newAdmin" style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">Add Admin</button>
            </div>
          </div></div>
          <div class="panel-card" style="overflow:hidden;">
            <table class="dash-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created By</th><th>Created Date</th><th>Action</th></tr></thead>
            <tbody>${adminRows || "<tr><td colspan='6' style='color:var(--slate);padding:16px;'>No admins found</td></tr>"}</tbody></table>
          </div>
        </div>

        <div id="panel-add-students" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:4px;">Add Students</h2>
          <p style="color:var(--slate);font-size:14px;margin-bottom:20px;">Select one class and teacher, then add multiple students in one go.</p>
          <div class="panel-card"><div class="panel-card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
              ${customDropdownHtml("bulkStudentClass", "Select Class", "", "100%")}
              ${customDropdownHtml("bulkStudentTeacherId", "Select Teacher", "", "100%")}
            </div>
            <div id="bulkStudentRows"></div>
            <div style="display:flex;gap:12px;margin-top:18px;">
              <button id="addBulkStudentRowButton" style="padding:10px 16px;background:var(--ink);color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;">Add Row</button>
              <button id="saveBulkStudentsButton" style="padding:10px 16px;background:#16a34a;color:white;border:none;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;">Save All Students</button>
            </div>
          </div></div>
        </div>

        <div id="panel-payments" class="adminPanel" style="display:none;">
          <h2 style="font-family:var(--display);font-size:20px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;margin-bottom:8px;">Payments and Invoices</h2>
          <p style="color:var(--slate);font-size:14px;">Coming later.</p>
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
function getErrorMessage(errorValue){
  if(!errorValue){
    return "Something went wrong";
  }
  if(typeof errorValue === "string"){
    return errorValue;
  }
  if(errorValue.message){
    return errorValue.message;
  }
  if(errorValue.code && errorValue.message){
    return errorValue.code + ": " + errorValue.message;
  }
  return "Something went wrong";
}
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
      option.style.background = "#fbeee7";
    };
    option.onmouseleave = function(){
      option.style.background = "white";
    };
    option.addEventListener("click", function(){
      input.value = optionData.value;
      label.textContent = optionData.label;
      closeCustomDropdowns();
      if(typeof onSelect === "function"){
        onSelect(optionData.value);
      }
    });
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
document.addEventListener("click", function(event){
  const dropdownToggle = event.target.closest(".admin-custom-dropdown-toggle");
  if(dropdownToggle){
    toggleCustomDropdown(dropdownToggle.dataset.dropdownId || "");
    return;
  }
  const navLink = event.target.closest(".admin-settings-nav-link");
  if(navLink){
    go(navLink.dataset.href || "/admin-settings");
    return;
  }
  const logoutButton = event.target.closest("#adminSettingsLogoutButton");
  if(logoutButton){
    logout();
    return;
  }
  const previousPageButton = event.target.closest("#adminSettingsPreviousPageButton");
  if(previousPageButton){
    go("/school-dashboard");
    return;
  }
  const deleteSubjectButton = event.target.closest(".delete-subject-button");
  if(deleteSubjectButton){
    deleteSubject(deleteSubjectButton.dataset.subjectId || "");
    return;
  }

  const deleteMappingButton = event.target.closest(".delete-mapping-button");
  if(deleteMappingButton){
    deleteMapping(deleteMappingButton.dataset.mappingId || "");
    return;
  }

  const deleteUserButton = event.target.closest(".delete-user-button");
  if(deleteUserButton){
    deleteUser(deleteUserButton.dataset.userId || "");
    return;
  }

  const updateStudentClassButton = event.target.closest(".update-student-class-button");
  if(updateStudentClassButton){
    updateStudentClass(updateStudentClassButton.dataset.studentRecordId || "");
    return;
  }

  const deleteStudentButton = event.target.closest(".delete-student-button");
  if(deleteStudentButton){
    deleteStudent(deleteStudentButton.dataset.studentRecordId || "");
    return;
  }

  const deleteClassButton = event.target.closest(".delete-class-button");
  if(deleteClassButton){
    deleteClass(deleteClassButton.dataset.classId || "");
    return;
  }

  const saveMappingButton = event.target.closest("#saveMappingButton");
  if(saveMappingButton){
    saveMapping();
    return;
  }

  const addUserRoleButton = event.target.closest(".add-user-role-button");
  if(addUserRoleButton){
    addUserWithRole(
      addUserRoleButton.dataset.role || "",
      addUserRoleButton.dataset.prefix || ""
    );
    return;
  }

  const createClassButton = event.target.closest("#createClassButton");
  if(createClassButton){
    createClass();
    return;
  }

  const createSubjectButton = event.target.closest("#createSubjectButton");
  if(createSubjectButton){
    createSubject();
    return;
  }

  const studentPageButton = event.target.closest(".student-page-button");
  if(studentPageButton){
    changeStudentPage(Number(studentPageButton.dataset.pageDelta || 0));
    return;
  }

  const addBulkStudentRowButton = event.target.closest("#addBulkStudentRowButton");
  if(addBulkStudentRowButton){
    addBulkStudentRow();
    return;
  }

  const saveBulkStudentsButton = event.target.closest("#saveBulkStudentsButton");
  if(saveBulkStudentsButton){
    saveBulkStudents();
    return;
  }

  const removeBulkStudentRowButton = event.target.closest(".remove-bulk-student-row-button");
  if(removeBulkStudentRowButton){
    removeBulkStudentRowButton.parentElement.remove();
    return;
  }

  const panelButton = event.target.closest(".adminPanelButton");
  if(panelButton){
    showAdminPanel(panelButton.dataset.panel || "overview", panelButton);
  }
});
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
    btn.style.background = "transparent";
    btn.style.color = "#3a4654";
    btn.style.fontWeight = "500";
  });
  if(button){
    button.style.background = "rgba(224,99,58,0.12)";
    button.style.color = "#e0633a";
    button.style.fontWeight = "600";
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
  fetch("/api/admin/subjects/create", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/subjects/delete", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/classes/create", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/classes/delete", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/students/update-class", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/students/delete", {
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
      alert(getErrorMessage(data.error));
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
    '<input class="bulkStudentName" placeholder="Student name" style="padding:10px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;font-family:var(--sans);font-size:14px;color:var(--ink);background:white;" />' +
    '<input class="bulkStudentId" placeholder="Student ID" style="padding:10px 12px;border:1px solid rgba(17,22,29,0.12);border-radius:8px;font-family:var(--sans);font-size:14px;color:var(--ink);background:white;" />' +
      '<button class="remove-bulk-student-row-button" style="padding:11px 14px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Remove</button>';
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
  fetch("/api/admin/students/bulk-create", {
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/mappings/create", {
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
      alert(getErrorMessage(data.error));
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
    "/api/admin/mappings/delete",
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
      alert(getErrorMessage(data.error));
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
    "/api/admin/users/delete",
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
      alert(getErrorMessage(data.error));
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
  fetch("/api/admin/users/create", {
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
      alert(getErrorMessage(data.error));
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
</html>
`);
  } catch (err) {
    console.error("ADMIN SETTINGS ERROR:", err);
    res.send("Error loading admin settings");
  }
};
exports.adminSettingsData = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: "Access denied"
        }
      });
    }
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "SCHOOL_CONTEXT_MISSING",
          message: "School context missing"
        }
      });
    }
    const entity = String(req.query.entity || "students").trim().toLowerCase();
    const search = String(req.query.search || "").trim();
    const className = String(req.query.className || "").trim();
    const teacherId = String(req.query.teacherId || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "10", 10), 1),
      100
    );
    const skip = (page - 1) * limit;
    const User = require("../models/User");
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const Subject = require("../models/Subject");
    const ClassSubject = require("../models/ClassSubject");
    const schoolScopedFilter = { schoolId };
    if (entity === "students") {
      const query = {
        ...schoolScopedFilter
      };
      if (search) {
        const searchRegex = new RegExp(
          search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        query.$or = [
          { name: searchRegex },
          { fullName: searchRegex },
          { studentId: searchRegex }
        ];
      }
      if (className) {
        query.class = className;
      }
      if (teacherId) {
        query.teacherId = teacherId;
      }
      const [students, total, teachers] = await Promise.all([
        Student.find(query)
          .select("studentId name fullName class teacherId schoolId schoolCode")
          .sort({ class: 1, name: 1, studentId: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Student.countDocuments(query),
        User.find({
          role: "teacher",
          ...schoolScopedFilter
        })
          .select("name email role schoolId schoolCode")
          .lean()
      ]);
      const teacherMap = {};
      teachers.forEach(teacher => {
        teacherMap[String(teacher._id)] =
          teacher.name || teacher.email || "Unknown";
      });
      return res.json({
        entity,
        students: students.map(student => ({
          ...student,
          teacherName: teacherMap[String(student.teacherId)] || "-"
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      });
    }
    if (entity === "classes") {
      const query = {
        ...schoolScopedFilter
      };
      if (search) {
        const searchRegex = new RegExp(
          search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        query.name = searchRegex;
      }
      const [classes, total, students, mappings, teachers] = await Promise.all([
        ClassModel.find(query)
          .select("name schoolId schoolCode createdAt")
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ClassModel.countDocuments(query),
        Student.find(schoolScopedFilter)
          .select("studentId class")
          .lean(),
        ClassSubject.find(schoolScopedFilter)
          .select("className subject teacherId")
          .lean(),
        User.find({
          role: "teacher",
          ...schoolScopedFilter
        })
          .select("name email")
          .lean()
      ]);
      const teacherMap = {};
      teachers.forEach(teacher => {
        teacherMap[String(teacher._id)] =
          teacher.name || teacher.email || "Unknown";
      });
      return res.json({
        entity,
        classes: classes.map(classItem => {
          const normalizedClassName = String(classItem.name || "")
            .trim()
            .toUpperCase();
          const classStudents = students.filter(student =>
            String(student.class || "").trim().toUpperCase() ===
            normalizedClassName
          );
          const classMappings = mappings.filter(mapping =>
            String(mapping.className || "").trim().toUpperCase() ===
            normalizedClassName
          );
          return {
            ...classItem,
            studentCount: classStudents.length,
            mappedSubjects: [...new Set(
              classMappings
                .map(mapping => String(mapping.subject || "").trim())
                .filter(Boolean)
            )],
            mappedTeachers: [...new Set(
              classMappings
                .map(mapping => teacherMap[String(mapping.teacherId)] || "Unknown")
                .filter(Boolean)
            )]
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      });
    }
    if (entity === "subjects") {
      const query = {
        ...schoolScopedFilter
      };
      if (search) {
        const searchRegex = new RegExp(
          search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        query.name = searchRegex;
      }
      const [subjects, total, mappings, teachers] = await Promise.all([
        Subject.find(query)
          .select("name schoolId schoolCode createdAt")
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Subject.countDocuments(query),
        ClassSubject.find(schoolScopedFilter)
          .select("className subject teacherId")
          .lean(),
        User.find({
          role: "teacher",
          ...schoolScopedFilter
        })
          .select("name email")
          .lean()
      ]);
      const teacherMap = {};
      teachers.forEach(teacher => {
        teacherMap[String(teacher._id)] =
          teacher.name || teacher.email || "Unknown";
      });
      return res.json({
        entity,
        subjects: subjects.map(subject => {
          const normalizedSubjectName = String(subject.name || "")
            .trim()
            .toLowerCase();
          const subjectMappings = mappings.filter(mapping =>
            String(mapping.subject || "").trim().toLowerCase() ===
            normalizedSubjectName
          );
          return {
            ...subject,
            mappedClasses: [...new Set(
              subjectMappings
                .map(mapping => String(mapping.className || "").trim())
                .filter(Boolean)
            )],
            mappedTeachers: [...new Set(
              subjectMappings
                .map(mapping => teacherMap[String(mapping.teacherId)] || "Unknown")
                .filter(Boolean)
            )]
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ADMIN_SETTINGS_ENTITY",
        message: "Invalid admin settings entity"
      }
    });
  } catch (err) {
    console.error("ADMIN SETTINGS DATA API ERROR:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "ADMIN_SETTINGS_DATA_LOAD_FAILED",
        message: "Failed to load admin settings data"
      }
    });
  }
};
