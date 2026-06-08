const bcrypt = require("bcrypt");
const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const ClassSubject = require("../models/ClassSubject");
const {
  validatePasswordPolicy
} = require("../utils/passwordPolicy");
const Test = require("../models/Test");
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function normalizeSchoolCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}
function buildPlatformMessage(req) {
  const errorMessage = String(req.query.error || "").trim();
  const successMessage = String(req.query.success || "").trim();
  if (errorMessage) {
    return `
      <div style="
        background:#fee2e2;
        color:#991b1b;
        border:1px solid #fecaca;
        padding:14px 16px;
        border-radius:10px;
        font-weight:700;
        margin-bottom:18px;
      ">
        ${escapeHtml(errorMessage)}
      </div>
    `;
  }
  if (successMessage) {
    return `
      <div style="
        background:#dcfce7;
        color:#166534;
        border:1px solid #bbf7d0;
        padding:14px 16px;
        border-radius:10px;
        font-weight:700;
        margin-bottom:18px;
      ">
        ${escapeHtml(successMessage)}
      </div>
    `;
  }
  return "";
}
exports.listSchoolsPage = async (req, res) => {
  try {
    const platformMessage = buildPlatformMessage(req);
    const schools = await School.find({})
      .sort({ createdAt: -1 })
      .lean();
    const admins = await User.find({
      role: "admin"
    })
      .select("name email schoolId schoolCode createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const adminsBySchoolCode = {};
    admins.forEach(admin => {
      const code = String(admin.schoolCode || "");
      if (!adminsBySchoolCode[code]) {
        adminsBySchoolCode[code] = [];
      }
      adminsBySchoolCode[code].push(admin);
    });
    const schoolRows = schools.map(school => {
    const schoolAdmins = adminsBySchoolCode[String(school.code || "")] || [];
      return `
        <div style="
          background:#f8fafc;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:18px;
          margin-bottom:18px;
        ">
          <h2 style="margin:0 0 8px 0;">
            ${escapeHtml(school.name)}
          </h2>
          <p style="margin:4px 0;color:#475569;">
            <b>Code:</b> ${escapeHtml(school.code)}
          </p>
          <p style="margin:4px 0;color:#475569;">
            <b>Status:</b> ${escapeHtml(school.status)}
          </p>
          <p style="margin:4px 0;color:#475569;">
            <b>School Admins:</b> ${schoolAdmins.length}
          </p>
           <details style="margin-top:14px;">
 <summary style="cursor:pointer;font-weight:700;">
 Edit school
 </summary>
 <form method="POST" action="/platform/schools/${school._id}/update" style="margin-top:14px;">
 <input
 name="name"
 value="${escapeHtml(school.name)}"
 placeholder="School name"
 required
 style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <input
 name="code"
 value="${escapeHtml(school.code)}"
 placeholder="School code"
 required
 style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <button type="submit" style="
 padding:10px 14px;
 background:#4f46e5;
 color:white;
 border:none;
 border-radius:8px;
 font-weight:700;
 cursor:pointer;
 ">
 Save School
 </button>
 </form>
 </details>
 <form
 method="POST"
 action="/platform/schools/${school._id}/delete"
 onsubmit="return confirm('Delete this school? This is only allowed if the school has no users, students, classes, subjects, mappings, or tests.');"
 style="margin-top:12px;"
 >
 <button type="submit" style="
 padding:10px 14px;
 background:#dc2626;
 color:white;
 border:none;
 border-radius:8px;
 font-weight:700;
 cursor:pointer;
 ">
 Delete School
 </button>
 </form>
          <details style="margin-top:14px;">
            <summary style="cursor:pointer;font-weight:700;">
              Add first / additional school admin
            </summary>
            <form method="POST" action="/platform/schools/${school._id}/admins" style="margin-top:14px;">
              <input
                name="name"
                placeholder="Admin name"
                required
                style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
              />
              <input
                name="email"
                type="email"
                placeholder="Admin email"
                required
                style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
              />
              <input
                name="password"
                type="password"
                placeholder="Temporary password"
                required
                minlength="10"
                style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
              />
              <button type="submit" style="
                padding:10px 14px;
                background:#16a34a;
                color:white;
                border:none;
                border-radius:8px;
                font-weight:700;
                cursor:pointer;
              ">
                Create School Admin
              </button>
            </form>
          </details>
          ${
            schoolAdmins.length
              ? `
                <div style="margin-top:16px;">
                  <h3 style="margin-bottom:8px;">School Admins</h3>
                  ${schoolAdmins.map(admin => `
                    <div style="
                      background:white;
                      border:1px solid #e5e7eb;
                      border-radius:8px;
                      padding:10px;
                      margin-bottom:8px;
                    ">
                      <b>${escapeHtml(admin.name)}</b><br>
                      <span style="color:#64748b;">${escapeHtml(admin.email)}</span>
                    </div>
                  `).join("")}
                </div>
              `
              : ""
          }
        </div>
      `;
    }).join("");
    res.send(`
<body style="font-family:Arial;background:#eef2ff;margin:0;padding:40px;">
  <div style="
    max-width:980px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:14px;
    box-shadow:0 4px 14px rgba(0,0,0,0.08);
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      margin-bottom:20px;
    ">
      <h1 style="margin:0;">School Onboarding</h1>
      <div style="display:flex;gap:10px;">
 <button onclick="window.location.replace('/platform-import')" style="
 padding:10px 14px;
 background:#4f46e5;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 Question Import
 </button>
 <button onclick="togglePlatformAdminForm()" style="
 padding:10px 14px;
 background:#111827;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 New Platform Admin
 </button>
        <button onclick="window.location.replace('/school-dashboard')" style="
          padding:10px 14px;
          background:#64748b;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        ">
          Back
        </button>
      </div>
    </div>
    ${platformMessage}
 <div
 id="platformAdminForm"
 style="
 display:none;
 background:#f8fafc;
 border:1px solid #e5e7eb;
 padding:18px;
 border-radius:12px;
 margin-bottom:24px;
 "
 >
 <h2 style="margin-top:0;">Create Platform Admin</h2>
 <input
 id="platformAdminName"
 placeholder="Platform admin name"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <input
 id="platformAdminEmail"
 type="email"
 placeholder="Platform admin email"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <input
 id="platformAdminPassword"
 type="password"
 placeholder="Temporary password"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <button onclick="createPlatformAdmin()" style="
 padding:12px 18px;
 background:#111827;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 Create Platform Admin
 </button>
 <p id="platformAdminMessage" style="font-weight:700;"></p>
 </div>
 <div style="
 background:#f8fafc;
 border:1px solid #e5e7eb;
 padding:18px;
 border-radius:12px;
 margin-bottom:24px;
 ">
 <h2 style="margin-top:0;">Create School</h2>
      <form method="POST" action="/platform/schools">
        <input
          name="name"
          placeholder="School name"
          required
          style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
        />
        <input
          name="code"
          placeholder="School code, example DPS-KOLKATA"
          required
          style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
        />
        <button type="submit" style="
          padding:12px 18px;
          background:#4f46e5;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        ">
          Create School
        </button>
      </form>
    </div>
    <h2>Existing Schools</h2>
    ${
      schoolRows ||
      `<p style="color:#64748b;">No schools created yet.</p>`
    }
</div>
<script>
function togglePlatformAdminForm(){
  const form = document.getElementById("platformAdminForm");
  if(!form){
    return;
  }
  form.style.display =
    form.style.display === "none" ? "block" : "none";
}
function createPlatformAdmin(){
  const name = document.getElementById("platformAdminName").value.trim();
  const email = document.getElementById("platformAdminEmail").value.trim();
  const password = document.getElementById("platformAdminPassword").value.trim();
  const message = document.getElementById("platformAdminMessage");
  message.style.color = "#dc2626";
  message.textContent = "";
  if(!name || !email || !password){
    message.textContent = "Name, email, and temporary password are required";
    return;
  }
fetch("/api/platform/admins/create", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      message.textContent = data.error.message || data.error;
      return;
    }
    message.style.color = "#16a34a";
    message.textContent = "Platform admin created. They must change password after first login.";
    document.getElementById("platformAdminName").value = "";
    document.getElementById("platformAdminEmail").value = "";
    document.getElementById("platformAdminPassword").value = "";
  })
  .catch(() => {
    message.textContent = "Failed to create platform admin";
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error("PLATFORM SCHOOLS PAGE ERROR:", err);
    res.status(500).send("Failed to load schools");
  }
};
exports.createSchool = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const code = normalizeSchoolCode(req.body.code);
    if (!name || !code) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School name and code are required.")
      );
    }
    const existingSchool = await School.findOne({ code }).lean();
    if (existingSchool) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School code already exists.")
      );
    }
    await School.create({
      name,
      code,
      status: "active"
    });
        res.redirect(
      "/platform/schools?success=" +
        encodeURIComponent("School created successfully.")
    );
  } catch (err) {
    console.error("CREATE SCHOOL ERROR:", err);
    if (err.code === 11000) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School code already exists.")
      );
    }
    res.redirect(
      "/platform/schools?error=" +
        encodeURIComponent("School could not be created. Please try again.")
    );
  }
};
exports.updateSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const name = String(req.body.name || "").trim();
    const code = normalizeSchoolCode(req.body.code);
    if (!schoolId || !name || !code) {
      return res.status(400).send("School name and code are required");
    }
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).send("School not found");
    }
    const existingSchool = await School.findOne({
      code,
      _id: {
        $ne: school._id
      }
    }).lean();
    if (existingSchool) {
      return res.status(409).send("School code already exists");
    }
    const oldCode = school.code;
    school.name = name;
    school.code = code;
    await school.save();
    if (oldCode !== code) {
      await Promise.all([
        User.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Student.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        ClassModel.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Subject.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        ClassSubject.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Test.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        )
      ]);
    }
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("UPDATE SCHOOL ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).send("School code already exists");
    }
    res.status(500).send("Failed to update school");
  }
};
exports.deleteSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    if (!schoolId) {
      return res.status(400).send("Missing schoolId");
    }
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).send("School not found");
    }
    const schoolFilter = {
      schoolId: String(school._id)
    };
    const [
      userCount,
      studentCount,
      classCount,
      subjectCount,
      mappingCount,
      testCount
    ] = await Promise.all([
      User.countDocuments(schoolFilter),
      Student.countDocuments(schoolFilter),
      ClassModel.countDocuments(schoolFilter),
      Subject.countDocuments(schoolFilter),
      ClassSubject.countDocuments(schoolFilter),
      Test.countDocuments(schoolFilter)
    ]);
    const totalLinkedRecords =
      userCount +
      studentCount +
      classCount +
      subjectCount +
      mappingCount +
      testCount;
    if (totalLinkedRecords > 0) {
      return res.status(400).send(
        "Cannot delete school because it still has linked data. Delete school admins, teachers, students, classes, subjects, mappings, and tests first."
      );
    }
    await School.deleteOne({
      _id: school._id
    });
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("DELETE SCHOOL ERROR:", err);
    res.status(500).send("Failed to delete school");
  }
};
exports.createAdminForSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!schoolId || !name || !email || !password) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("Admin name, email, and temporary password are required.")
      );
    }
    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent(passwordPolicyError)
      );
    }
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School not found.")
      );
    }
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("A user with this email already exists.")
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      schoolId: String(school._id),
      schoolCode: school.code,
      createdBy: String(req.user.id || req.user._id || ""),
      createdByName: req.user.name || req.user.email || "Platform Admin"
    });
       res.redirect(
      "/platform/schools?success=" +
        encodeURIComponent("School admin created successfully.")
    );
  } catch (err) {
    console.error("CREATE SCHOOL ADMIN ERROR:", err);
        res.redirect(
      "/platform/schools?error=" +
        encodeURIComponent("School admin could not be created. Please try again.")
    );
  }
};