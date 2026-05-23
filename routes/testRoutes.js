const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/file");
const authMiddleware = require("../middleware/auth");
const Test = require("../models/Test");
const layout = require("../views/layout");
const backButton = require("../views/backButton");
const {
  judgeSubmission
} = require("../services/codeJudge");
// ---------- NAVBAR ----------
function navbar(){
return `
<div style="
position:fixed;
top:0;
left:0;
z-index:1000;
width:100%;
background:#333;
padding:10px;
display:flex;
gap:10px;
width:100%;
box-sizing:border-box;
">
<button onclick="go('/teacher')" class="nav-btn">Dashboard</button>
<button onclick="go('/library')" class="nav-btn">Library</button>
<button onclick="go('/teacher-tests')" class="nav-btn">Tests</button>
<button onclick="go('/classes')" class="nav-btn">Classes</button>
<button onclick="logout()" class="nav-btn logout">Logout</button>
</div>
<style>
  .nav-btn {
    padding:8px 14px;
    background:white;
    color:black;
    border:none;
    border-radius:6px;
    cursor:pointer;
  }
  .nav-btn:hover { background:#ddd; }
  .logout { background:#ff4d4d; color:white; }
</style>
<script>
function go(path){
  window.location.replace(path);
}
function logout(){
  localStorage.clear();
  window.location.replace("/");
}
</script>
`;
}
// ---------- BULK UPLOAD STUDENTS ----------
router.post("/upload-students", authMiddleware, async (req, res) => {
try {
 const Student = require("../models/Student");
 const User = require("../models/User");
 const ClassModel = require("../models/Class");
 const data = req.body;
 let created = 0;
 let updated = 0;
 let skipped = 0;
 for(const row of data){
   // ✅ VALIDATION
   if(!row.studentId || !row.name || !row.class || !row.teacherEmail){
     skipped++;
     continue;
   }
const teacher = await User.findOne({
  email: row.teacherEmail,
  role: "teacher"
});
if (!teacher) {
  skipped++;
  continue;
}
if (String(teacher._id) !== String(req.user.id)) {
  skipped++;
  continue;
}
// ✅ CHECK IF STUDENT EXISTS
let student = await Student.findOne({ studentId: row.studentId });
if(!student){
// CREATE NEW STUDENT
student = await Student.create({
  studentId: row.studentId,
  name: row.name,
  class: row.class,
  teacherId: teacher._id,
  schoolId: req.user.schoolId || teacher.schoolId || null,
  schoolCode: req.user.schoolCode || teacher.schoolCode || null
});
created++;
} else {
// UPDATE EXISTING (ONLY IF SAME TEACHER)
if (String(student.teacherId) !== String(req.user.id)) {
 skipped++;
 continue;
}
student.name = row.name;
student.class = row.class;
student.schoolId = student.schoolId || req.user.schoolId || teacher.schoolId || null;
student.schoolCode = student.schoolCode || req.user.schoolCode || teacher.schoolCode || null;
await student.save();
updated++; // ✅ ADD THIS LINE
}
   // ===============================
   // CLASS LOGIC
   // ===============================
   let classDoc = await ClassModel.findOne({
     name: row.class,
     teacherId: req.user.id
   });
   if(!classDoc){
classDoc = await ClassModel.create({
  name: row.class,
  teacherId: req.user.id,
  schoolId: req.user.schoolId || teacher.schoolId || null,
  schoolCode: req.user.schoolCode || teacher.schoolCode || null,
  studentIds: [row.studentId]
});
   } else {
     if(!classDoc.studentIds.includes(row.studentId)){
       classDoc.studentIds.push(row.studentId);
       await classDoc.save();
     }
   }
 }
 res.json({ created, updated, skipped });
} catch (err) {
 console.error(err);
 res.status(500).json({ error: "Upload failed" });
}
});
// ---------- PUBLISH TEST ----------
router.post("/assign-test", authMiddleware, async (req, res) => {
  try {
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const ClassSubject = require("../models/ClassSubject");
    const { testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: "Missing testId" });
    }
    const test = await Test.findOne({
      _id: testId,
      teacherId: String(req.user.id)
    });
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    const className = String(test.className).trim().toUpperCase();
const rawSubject = String(test.subject || "").trim();
let subject = rawSubject;
if (
  rawSubject.toLowerCase() === "cs" ||
  rawSubject.toLowerCase() === "computer science"
) {
  subject = "Computer Science";
} else if (
  rawSubject.toLowerCase() === "maths" ||
  rawSubject.toLowerCase() === "math"
) {
  subject = "Maths";
} else if (rawSubject.toLowerCase() === "physics") {
  subject = "Physics";
}
    const mapping = await ClassSubject.findOne({
      className,
      subject,
      teacherId: String(req.user.id)
    });
    if (!mapping) {
      return res.status(403).json({
        error: "You are not allowed to publish this test"
      });
    }
    const exists = await Assignment.findOne({
      testId: String(testId),
      className,
      teacherId: String(req.user.id)
    });
    if (!exists) {
await Assignment.create({
  testId: String(testId),
  testName: test.name,
  className,
  teacherId: String(req.user.id),
  schoolId: test.schoolId || req.user.schoolId || null,
  schoolCode: test.schoolCode || req.user.schoolCode || null
});
    }
    test.status = "published";
    test.publishedAt = test.publishedAt || new Date();
    await test.save();
    res.json({
      status: "published",
      message: "Test published successfully",
      test
    });
  } catch (err) {
    console.error("PUBLISH ERROR:", err);
    res.status(500).json({ error: "Failed to publish test" });
  }
});
// ---------- ADD SUBJECT ----------
router.post("/add-subject", async (req, res) => {
  try {
    const { className, subject } = req.body;
    const teacherId = String(req.body.teacherId || "").trim();
    if (!className || !subject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const classNameClean = String(className || "").trim().toUpperCase();
    const subjectClean =
      String(subject || "").trim().charAt(0).toUpperCase() +
      String(subject || "").trim().slice(1).toLowerCase();
    const exists = await ClassSubject.findOne({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    if (exists) {
      return res.json({ message: "Subject already exists" });
    }
    const newSubject = await ClassSubject.create({
      className: classNameClean,
      subject: subjectClean,
      teacherId
    });
    res.json({ status: "created", subject: newSubject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create subject" });
  }
});
// ---------- GET TESTS FOR STUDENT ----------
router.get("/get-tests", async (req, res) => {
  try {
    const className = String(req.query.className || "").trim().toUpperCase();
    const subject = String(req.query.subject || "").trim();
    const teacherId = String(req.query.teacherId || "").trim();
if (!teacherId) {
  return res.status(400).json({ error: "Missing teacherId" });
}
    if (!className || !subject) {
      return res.status(400).json({ error: "Missing params" });
    }
    const Assignment = require("../models/Assignment");
    const Test = require("../models/Test");
    // 1. Get assignments for class
    const assignments = await Assignment.find({ className, teacherId });
    // 2. Fetch tests
    const tests = await Promise.all(
      assignments.map(a => Test.findById(a.testId))
    );
const now = new Date();
const validTests = tests.filter(t =>
  t &&
  String(t.status || "draft") === "published" &&
  (
    !t.scheduledAt ||
    new Date(t.scheduledAt) <= now
  )
);
// 🔒 GET STUDENT ID
const studentId = String(req.query.studentId || "").trim();
if (!studentId) {
  return res.status(400).json({ error: "Missing studentId" });
}
const Result = require("../models/Result");
// 🔒 GET ATTEMPTED TESTS
const attempted = await Result.find({ studentId }).select("testId");
const attemptedIds = attempted.map(r => String(r.testId));
// 3. Filter by subject + remove attempted
const filtered = validTests.filter(t => {
  const subjectMatch =
    String(t.subject || "").trim().toLowerCase() ===
    String(subject || "").trim().toLowerCase();
  const notAttempted =
    !attemptedIds.includes(String(t._id));
  return subjectMatch && notAttempted;
});
res.json(filtered);
  } catch (err) {
    console.error("GET TESTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});
module.exports = router;