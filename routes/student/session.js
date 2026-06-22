const jwt = require("jsonwebtoken");
const Student = require("../../models/Student");

async function getStudentSession(req) {
  const studentToken = req.cookies && req.cookies.studentSessionToken;
  if (!studentToken) {
    return null;
  }
  let decodedStudent;
  try {
    decodedStudent = jwt.verify(
      studentToken,
      process.env.JWT_SECRET
    );
  } catch (tokenErr) {
    return null;
  }
  if (!decodedStudent || decodedStudent.role !== "student") {
    return null;
  }
  const student = await Student.findOne({
    _id: decodedStudent.studentRecordId,
    studentId: decodedStudent.studentId,
    status: "active"
  })
    .select("studentId studentKey name fullName class teacherId schoolId schoolCode status")
    .lean();
  if (!student) {
    return null;
  }
  if (
    decodedStudent.schoolId &&
    student.schoolId &&
    String(decodedStudent.schoolId) !== String(student.schoolId)
  ) {
    return null;
  }
  return {
    decodedStudent,
    student
  };
}
async function requireStudentApiSession(req, res, next) {
  try {
    const session = await getStudentSession(req);
    if (!session) {
      return res.status(401).json({
        error: "Student session expired"
      });
    }
    req.studentSession = session;
    next();
  } catch (err) {
    console.error("STUDENT SESSION ERROR:", err);
    return res.status(500).json({
      error: "Failed to verify student session"
    });
  }
}
async function requireStudentPageSession(req, res, next) {
  try {
    const session = await getStudentSession(req);
    if (!session) {
      return res.redirect("/student-entry");
    }
    req.studentSession = session;
    next();
  } catch (err) {
    console.error("STUDENT PAGE SESSION ERROR:", err);
    return res.redirect("/student-entry");
  }
}

module.exports = { getStudentSession, requireStudentApiSession, requireStudentPageSession };
