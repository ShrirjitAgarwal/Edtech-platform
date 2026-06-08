const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  logAuditEvent
} = require("../services/auditLogger");
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
   // ✅ VALIDATIO
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
// ---------- PUBLISH TEST ----------
async function assignTestHandler(req, res) {
  try {
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const ClassSubject = require("../models/ClassSubject");
    const { testId } = req.body;
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    if (!testId) {
      return res.status(400).json({
        error: "Missing testId"
      });
    }
    const test = await Test.findOne({
      _id: testId,
      teacherId,
      ...(schoolId ? { schoolId } : {})
    });
    if (!test) {
      return res.status(404).json({
        error: "Test not found or unauthorized"
      });
    }
    const className = String(test.className || "").trim().toUpperCase();
    const subject = String(test.subject || "").trim();
    if (!className || !subject) {
      return res.status(400).json({
        error: "Test is missing class or subject"
      });
    }
    const mapping = await ClassSubject.findOne({
      className,
      subject,
      teacherId,
      ...(schoolId ? { schoolId } : {})
    });
    if (!mapping) {
      return res.status(403).json({
        error: "You are not allowed to publish this test"
      });
    }
    const assignmentFilter = {
      testId: String(testId),
      className,
      teacherId,
      ...(schoolId ? { schoolId } : {})
    };
    const existingAssignment = await Assignment.findOne(assignmentFilter);
    let assignmentCreated = false;
    if (!existingAssignment) {
      await Assignment.create({
        testId: String(testId),
        testName: test.name,
        className,
        teacherId,
        schoolId: test.schoolId || schoolId || null,
        schoolCode: test.schoolCode || req.user.schoolCode || null
      });
      assignmentCreated = true;
    }
    test.className = className;
    test.subject = subject;
    test.schoolId = test.schoolId || schoolId || null;
    test.schoolCode = test.schoolCode || req.user.schoolCode || null;
    test.status = "published";
    test.publishedAt = test.publishedAt || new Date();
    await test.save();
    await logAuditEvent(req, {
      event: "teacher_test_published",
      status: "success",
      metadata: {
        testId: test._id,
        testName: test.name,
        className,
        subject,
        assignmentCreated,
        schoolId: test.schoolId || null,
        schoolCode: test.schoolCode || null,
        publishedAt: test.publishedAt
      }
    });
    res.json({
      status: "published",
      message: assignmentCreated
        ? "Test published successfully"
        : "Test was already published",
      test
    });
  } catch (err) {
    console.error("PUBLISH ERROR:", err);
    res.status(500).json({
      error: "Failed to publish test"
    });
  }
}
router.post("/api/teacher/tests/assign", authMiddleware, assignTestHandler);
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
async function getStudentTestsHandler(req, res) {
  try {
    const jwt = require("jsonwebtoken");
    const Assignment = require("../models/Assignment");
    const Test = require("../models/Test");
    const Result = require("../models/Result");
    const Student = require("../models/Student");
    const studentToken = req.cookies && req.cookies.studentSessionToken;
    if (!studentToken) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(
        studentToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      return res.status(401).json({
        error: "Invalid student session"
      });
    }
    const subject = String(req.query.subject || "").trim();
    if (!subject) {
      return res.status(400).json({
        error: "Missing subject"
      });
    }
    const student = await Student.findOne({
      _id: decodedStudent.studentRecordId,
      studentId: decodedStudent.studentId,
      status: "active"
    })
      .select("studentId class teacherId schoolId schoolCode status")
      .lean();
    if (!student) {
      return res.status(401).json({
        error: "Invalid student session"
      });
    }
    const className = String(student.class || "").trim().toUpperCase();
    const teacherId = String(student.teacherId || "").trim();
    const studentId = String(student.studentId || "").trim();
    if (!className || !teacherId || !studentId) {
      return res.status(400).json({
        error: "Student is missing class, teacher, or student ID data"
      });
    }
    const assignments = await Assignment.find({
      className,
      teacherId,
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    })
      .select("testId className teacherId schoolId schoolCode")
      .lean();
    const testIds = assignments
      .map(assignment => assignment.testId)
      .filter(Boolean);
    if (!testIds.length) {
      return res.json([]);
    }
    const now = new Date();
    const tests = await Test.find({
      _id: { $in: testIds },
      status: "published",
      teacherId,
      ...(student.schoolId ? { schoolId: student.schoolId } : {}),
      $or: [
        { scheduledAt: { $exists: false } },
        { scheduledAt: null },
        { scheduledAt: { $lte: now } }
      ]
    })
      .select("name subject className status teacherId schoolId schoolCode scheduledAt durationMinutes testType questionTimersEnabled createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const attempted = await Result.find({
      studentId,
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    })
      .select("testId")
      .lean();
    const attemptedIds = attempted.map(result => String(result.testId));
    const filtered = tests.filter(test => {
      const subjectMatch =
        String(test.subject || "").trim().toLowerCase() ===
        String(subject || "").trim().toLowerCase();
      const classMatch =
        String(test.className || "").trim().toUpperCase() === className;
      const notAttempted = !attemptedIds.includes(String(test._id));
      return subjectMatch && classMatch && notAttempted;
    });
    res.json(filtered);
  } catch (err) {
    console.error("GET TESTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
}
router.get("/api/student/tests", getStudentTestsHandler);
module.exports = router;
