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
exports.listSchoolsPage = async (req, res) => {
  try {
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
      return res.status(400).send("School name and code are required");
    }
    const existingSchool = await School.findOne({ code }).lean();
    if (existingSchool) {
      return res.status(409).send("School code already exists");
    }
    await School.create({
      name,
      code,
      status: "active"
    });
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("CREATE SCHOOL ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).send("School code already exists");
    }
    res.status(500).send("Failed to create school");
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
      return res.status(400).send("Admin name, email, and password are required");
    }
 const passwordPolicyError = validatePasswordPolicy(password);

 if (passwordPolicyError) {
   return res.status(400).send(passwordPolicyError);
 }
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).send("School not found");
    }
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).send("A user with this email already exists");
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
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("CREATE SCHOOL ADMIN ERROR:", err);
    res.status(500).send("Failed to create school admin");
  }
};