const express = require("express");
const router = express.Router();
const Test = require("../../models/Test");
const Student = require("../../models/Student");
const ClassModel = require("../../models/Class");
const User = require("../../models/User");
const Result = require("../../models/Result");
const ClassSubject = require("../../models/ClassSubject");
const layout = require("../../views/layout");
const backButton = require("../../views/backButton");
const authMiddleware = require("../../middleware/auth");
const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../../utils/html");

const School = require("../../models/School");

// ---------- TEACHER SETTINGS ----------
router.get("/teacher-settings", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return res.redirect("/");
    }
    const School = require("../../models/School");
    const ClassSubject = require("../../models/ClassSubject");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const [teacher, school, mappings, students, tests, results] =
      await Promise.all([
        User.findOne({
          _id: teacherId,
          role: "teacher",
          ...(schoolId ? { schoolId } : {})
        })
          .select("name email role schoolId schoolCode")
          .lean(),
        schoolId
          ? School.findById(schoolId).lean()
          : null,
        ClassSubject.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("className subject teacherId schoolId schoolCode")
          .sort({ className: 1, subject: 1 })
          .lean(),
        Student.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("studentId name class teacherId")
          .lean(),
        Test.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("name subject className status createdAt")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        Result.find({
          teacherId,
          ...(schoolId ? { schoolId } : {})
        })
          .select("studentId testId score total date")
          .sort({ date: -1 })
          .limit(500)
          .lean()
      ]);
    const mappingRows = mappings.map(m => `
<tr>
  <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(m.className || "-")}</td>
  <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(m.subject || "-")}</td>
</tr>
`).join("");
    const uniqueClasses = [...new Set(
      mappings.map(m => m.className).filter(Boolean)
    )];
    const uniqueSubjects = [...new Set(
      mappings.map(m => m.subject).filter(Boolean)
    )];
    const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Teacher Settings</h1>
  ${backButton("/teacher")}
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">Account Info</h2>
  <p><b>Name:</b> ${escapeHtml(teacher?.name || "N/A")}</p>
  <p><b>Email:</b> ${escapeHtml(teacher?.email || "N/A")}</p>
  <p><b>Role:</b> ${escapeHtml(teacher?.role || "N/A")}</p>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">School Info</h2>
  <p><b>School Name:</b> ${escapeHtml(school?.name || "N/A")}</p>
  <p><b>School Code:</b> ${escapeHtml(school?.code || req.user.schoolCode || "N/A")}</p>
  <div style="
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:14px;
    margin-top:18px;
  ">
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${uniqueClasses.length}</b><br>Assigned Classes
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${uniqueSubjects.length}</b><br>Assigned Subjects
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${students.length}</b><br>Mapped Students
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${tests.length}</b><br>Tests Created
    </div>
    <div style="background:#f8fafc;padding:14px;border-radius:10px;">
      <b>${results.length}</b><br>Recent Results
    </div>
  </div>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  margin-bottom:20px;
">
  <h2 style="margin-top:0;">My Class and Subject Mappings</h2>
  <p style="color:#64748b;">This is read-only. Contact your school admin to change mappings.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;">
    <tr style="background:#f8fafc;">
      <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Class</th>
      <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Subject</th>
    </tr>
    ${mappingRows || "<tr><td colspan='2' style='padding:10px;border:1px solid #e5e7eb;'>No mappings found</td></tr>"}
  </table>
</div>
<div style="
  background:white;
  padding:22px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
">
  <h2 style="margin-top:0;">Future Settings</h2>
  <p style="color:#64748b;">Change password, notifications, default test duration, and default timer settings can be added later.</p>
</div>
`;
    res.send(layout(content, "settings"));
  } catch (err) {
    console.error("TEACHER SETTINGS ERROR:", err);
    res.send("Error loading teacher settings");
  }
});
module.exports = router;
module.exports = router;
