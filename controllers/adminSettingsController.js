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
const studentRows = students.map(s => {
  const assignedTeacher = teachers.find(t =>
    String(t._id) === String(s.teacherId)
  );
  return `
<tr>
  <td>${s.name || s.fullName || "-"}</td>
  <td>${s.studentId || "-"}</td>
  <td>${s.class || "-"}</td>
  <td>${assignedTeacher ? assignedTeacher.name || assignedTeacher.email : "-"}</td>
  <td>
    <select id="studentClass-${s._id}" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px;">
      <option value="">Select Class</option>
      ${classes.map(c => `
        <option value="${c.name}" ${String(c.name) === String(s.class) ? "selected" : ""}>
          ${c.name}
        </option>
      `).join("")}
    </select>
  </td>
  <td>
    <select id="studentTeacher-${s._id}" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px;">
      <option value="">Select Teacher</option>
      ${teachers.map(t => `
        <option value="${t._id}" ${String(t._id) === String(s.teacherId) ? "selected" : ""}>
          ${t.name || t.email}
        </option>
      `).join("")}
    </select>
  </td>
  <td>
    <button
      onclick="updateStudentClass('${s._id}')"
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
      onclick="deleteStudent('${s._id}')"
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
const classRows = classes.map(c => `
<tr>
  <td>${c.name || "-"}</td>
  <td>${Array.isArray(c.studentIds) ? c.studentIds.length : 0}</td>
  <td>${
    c.createdAt
      ? new Date(c.createdAt).toLocaleString()
      : "-"
  }</td>
  <td>
    <button
      onclick="deleteClass('${c._id}')"
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
  classes.map(c => c.name).filter(Boolean)
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
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    min-height:100vh;
  ">
    <div>
      <h2>Admin</h2>
      <div onclick="go('/admin-dashboard')" style="padding:12px;border-radius:8px;cursor:pointer;margin-bottom:10px;">
        Admin Dashboard
      </div>
      <div onclick="go('/admin-settings')" style="padding:12px;border-radius:8px;cursor:pointer;background:#334155;margin-bottom:10px;">
        Settings
      </div>
    </div>
    <div onclick="logout()" style="padding:12px;border-radius:8px;cursor:pointer;color:#f87171;">
      Logout
    </div>
  </div>
  <div style="
    flex:1;
    padding:30px 36px;
    overflow:auto;
    box-sizing:border-box;
    min-height:100vh;
    background:#eef2ff;
  ">
    <h1>Admin Settings</h1>
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
      <p><b>School Name:</b> ${school?.name || "N/A"}</p>
      <p><b>School Code:</b> ${school?.code || req.user.schoolCode || "N/A"}</p>
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
  <th>Created Date</th>
  <th>Action</th>
</tr>
        ${classRows || "<tr><td colspan='4'>No classes found</td></tr>"}
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
      <table border="1" cellpadding="10" style="width:100%;border-collapse:collapse;background:white;">
<tr>
  <th>Name</th>
  <th>Student ID</th>
  <th>Class</th>
  <th>Current Teacher</th>
  <th>Assign Class</th>
  <th>Assign Teacher</th>
  <th>Action</th>
</tr>
        ${studentRows || "<tr><td colspan='7'>No students found</td></tr>"}
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
          <select id="bulkStudentClass" style="padding:12px;border:1px solid #cbd5e1;border-radius:8px;">
            <option value="">Select Class</option>
            ${classOptions}
          </select>
          <select id="bulkStudentTeacherId" style="padding:12px;border:1px solid #cbd5e1;border-radius:8px;">
            <option value="">Select Teacher</option>
            ${teacherOptions}
          </select>
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
  localStorage.clear();
  window.location.replace("/");
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
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
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
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
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
  function createStudent(){
  const name =
    document
      .getElementById("newStudentName")
      .value
      .trim();
  const studentId =
    document
      .getElementById("newStudentId")
      .value
      .trim();
  const className =
    document
      .getElementById("newStudentClass")
      .value
      .trim();
  const teacherId =
    document
      .getElementById("newStudentTeacherId")
      .value
      .trim();
  if(!name || !studentId || !className || !teacherId){
    alert("Student name, student ID, class, and teacher are required");
    return;
  }
  fetch("/admin/create-student", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      name,
      studentId,
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
    alert("Student created");
    location.reload();
  })
  .catch(() => {
    alert("Failed to create student");
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
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
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
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
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
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
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