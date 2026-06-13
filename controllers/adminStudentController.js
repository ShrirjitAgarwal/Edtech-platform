const {
  logAdminAction
} = require("../services/adminActionLogger");
const {
  recordUsageEvent
} = require("../services/usageTracker");
const {
  canCreateStudent
} = require("../services/planEnforcement");
const {
  ok,
  fail
} = require("../utils/apiResponse");
function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}
exports.createStudentFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return fail(res, "Access denied", 403, "ACCESS_DENIED");
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const User = require("../models/User");
    const name = String(req.body.name || "").trim();
    const studentId = String(req.body.studentId || "").trim();
    const className = String(req.body.className || "").trim().toUpperCase();
    const teacherId = String(req.body.teacherId || "").trim();
    if (!name || !studentId || !className || !teacherId) {
      return fail(
        res,
        "Student name, student ID, class, and teacher are required",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }
    const schoolFilter = req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {};
    const existingStudent = await Student.findOne({
      studentId,
      ...schoolFilter
    }).lean();
    if (existingStudent) {
      return fail(res, "Student ID already exists", 409, "STUDENT_ID_EXISTS");
    }
    const existingClass = await ClassModel.findOne({
      name: className,
      ...schoolFilter
    }).lean();
    if (!existingClass) {
      return fail(res, "Class not found", 404, "CLASS_NOT_FOUND");
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...schoolFilter
    }).lean();
    if (!teacher) {
      return fail(
        res,
        "Teacher not found in this school",
        404,
        "TEACHER_NOT_FOUND"
      );
    }

    if (req.user.schoolId) {
      const studentLimitCheck = await canCreateStudent(req.user.schoolId);

      if (!studentLimitCheck.allowed) {
        return fail(
          res,
          studentLimitCheck.message,
          403,
          studentLimitCheck.code,
          {
            usage: studentLimitCheck.usage,
            limit: studentLimitCheck.limit
          }
        );
      }
    }

    const nameParts = name.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ");
    const student = await Student.create({
      studentId,
      studentKey: normalizeKey(studentId),
      name,
      firstName,
      lastName,
      fullName: name,
      nameKey: normalizeKey(name),
      class: className,
      teacherId,
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      status: "active"
    });
    await ClassModel.updateOne(
      {
        _id: existingClass._id,
        ...schoolFilter
      },
      {
        $addToSet: {
          studentIds: studentId
        }
      }
    );
    await logAdminAction(req, {
      action: "admin_student_created",
      status: "success",
      targetType: "Student",
      targetId: student._id,
      metadata: {
        studentId: student.studentId,
        studentName: student.name,
        className: student.class,
        teacherId: student.teacherId,
        schoolId: student.schoolId || null,
        schoolCode: student.schoolCode || null
      }
    });

    await recordUsageEvent({
      schoolId: student.schoolId || req.user.schoolId || null,
      schoolCode: student.schoolCode || req.user.schoolCode || null,
      userId: req.user.id,
      role: req.user.role || "admin",
      eventType: "student_created",
      eventLabel: "Student created",
      resourceType: "student",
      resourceId: String(student._id),
      status: "created",
      metadata: {
        studentId: student.studentId,
        studentName: student.name,
        className: student.class,
        teacherId: student.teacherId
      }
    });

    return ok(res, {
      status: "created",
      student
    });
  } catch (err) {
    console.error("ADMIN CREATE STUDENT ERROR:", err);
    if (err && err.code === 11000) {
      return fail(res, "Student ID already exists", 409, "STUDENT_ID_EXISTS");
    }
    if (err && err.name === "CastError") {
      return fail(
        res,
        "Invalid student, class, or teacher id",
        400,
        "INVALID_ID"
      );
    }
    return fail(
      res,
      "Failed to create student",
      500,
      "CREATE_STUDENT_FAILED"
    );
  }
};
exports.bulkCreateStudentsFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return fail(res, "Access denied", 403, "ACCESS_DENIED");
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const User = require("../models/User");
    const className = String(req.body.className || "").trim().toUpperCase();
    const teacherId = String(req.body.teacherId || "").trim();
    const students = Array.isArray(req.body.students)
      ? req.body.students
      : [];
    if (!className || !teacherId || students.length === 0) {
      return fail(
        res,
        "Class, teacher, and at least one student are required",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }
    const schoolFilter = req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {};
    const existingClass = await ClassModel.findOne({
      name: className,
      ...schoolFilter
    }).lean();
    if (!existingClass) {
      return fail(res, "Class not found", 404, "CLASS_NOT_FOUND");
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...schoolFilter
    }).lean();
    if (!teacher) {
      return fail(
        res,
        "Teacher not found in this school",
        404,
        "TEACHER_NOT_FOUND"
      );
    }
    const cleanedStudents = students
      .map(student => ({
        name: String(student.name || "").trim(),
        studentId: String(student.studentId || "").trim()
      }))
      .filter(student => student.name && student.studentId);
    if (cleanedStudents.length === 0) {
      return fail(res, "No valid students found", 400, "NO_VALID_STUDENTS");
    }
    const seenIds = new Set();
    const duplicateIds = [];
    cleanedStudents.forEach(student => {
      const key = normalizeKey(student.studentId);
      if (seenIds.has(key)) {
        duplicateIds.push(student.studentId);
      }
      seenIds.add(key);
    });
    if (duplicateIds.length > 0) {
      return fail(
        res,
        "Duplicate student IDs in this batch: " + duplicateIds.join(", "),
        400,
        "DUPLICATE_STUDENT_IDS_IN_BATCH",
        { duplicateIds }
      );
    }
    const submittedIds = cleanedStudents.map(student => student.studentId);
    const existingStudents = await Student.find({
      studentId: { $in: submittedIds },
      ...schoolFilter
    })
      .select("studentId")
      .lean();
    if (existingStudents.length > 0) {
      const existingStudentIds = existingStudents.map(student => student.studentId);
      return fail(
        res,
        "Student IDs already exist: " + existingStudentIds.join(", "),
        409,
        "STUDENT_IDS_EXIST",
        { studentIds: existingStudentIds }
      );
    }

    if (req.user.schoolId) {
      const studentLimitCheck = await canCreateStudent(
        req.user.schoolId,
        cleanedStudents.length
      );

      if (!studentLimitCheck.allowed) {
        return fail(
          res,
          studentLimitCheck.message,
          403,
          studentLimitCheck.code,
          {
            usage: studentLimitCheck.usage,
            limit: studentLimitCheck.limit,
            requestedCount: cleanedStudents.length
          }
        );
      }
    }

    const docs = cleanedStudents.map(student => {
      const nameParts = student.name.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || student.name;
      const lastName = nameParts.slice(1).join(" ");
      return {
        studentId: student.studentId,
        studentKey: normalizeKey(student.studentId),
        name: student.name,
        firstName,
        lastName,
        fullName: student.name,
        nameKey: normalizeKey(student.name),
        class: className,
        teacherId,
        schoolId: req.user.schoolId || null,
        schoolCode: req.user.schoolCode || null,
        status: "active"
      };
    });
    const createdStudents = await Student.insertMany(docs);
    await ClassModel.updateOne(
      {
        _id: existingClass._id,
        ...schoolFilter
      },
      {
        $addToSet: {
          studentIds: {
            $each: createdStudents.map(student => student.studentId)
          }
        }
      }
    );
    await logAdminAction(req, {
      action: "admin_students_bulk_created",
      status: "success",
      targetType: "Student",
      targetId: null,
      metadata: {
        createdCount: createdStudents.length,
        className,
        teacherId,
        schoolId: req.user.schoolId || null,
        schoolCode: req.user.schoolCode || null,
        studentIds: createdStudents.map(student => student.studentId)
      }
    });

    await recordUsageEvent({
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      userId: req.user.id,
      role: req.user.role || "admin",
      eventType: "student_imported",
      eventLabel: "Students bulk created",
      resourceType: "student_batch",
      resourceId: String(Date.now()),
      status: "created",
      metadata: {
        createdCount: createdStudents.length,
        className,
        teacherId,
        studentIds: createdStudents.map(student => student.studentId)
      }
    });

    return ok(res, {
      status: "created",
      createdCount: createdStudents.length,
      students: createdStudents
    });
  } catch (err) {
    console.error("ADMIN BULK CREATE STUDENTS ERROR:", err);
    if (err && err.code === 11000) {
      return fail(
        res,
        "One or more student IDs already exist",
        409,
        "STUDENT_IDS_EXIST"
      );
    }
    if (err && err.name === "CastError") {
      return fail(res, "Invalid class or teacher id", 400, "INVALID_ID");
    }
    return fail(
      res,
      "Failed to create students",
      500,
      "BULK_CREATE_STUDENTS_FAILED"
    );
  }
};
exports.updateStudentClassFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return fail(res, "Access denied", 403, "ACCESS_DENIED");
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const User = require("../models/User");
    const Result = require("../models/Result");
    const studentMongoId = String(req.body.studentMongoId || "").trim();
    const className = String(req.body.className || "").trim().toUpperCase();
    const teacherId = String(req.body.teacherId || "").trim();
    if (!studentMongoId || !className || !teacherId) {
      return fail(
        res,
        "Student, class, and teacher are required",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }
    const schoolFilter = req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {};
    const student = await Student.findOne({
      _id: studentMongoId,
      ...schoolFilter
    });
    if (!student) {
      return fail(res, "Student not found", 404, "STUDENT_NOT_FOUND");
    }
    const existingClass = await ClassModel.findOne({
      name: className,
      ...schoolFilter
    }).lean();
    if (!existingClass) {
      return fail(res, "Class not found", 404, "CLASS_NOT_FOUND");
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...schoolFilter
    }).lean();
    if (!teacher) {
      return fail(
        res,
        "Teacher not found in this school",
        404,
        "TEACHER_NOT_FOUND"
      );
    }
    const previousClassName = student.class;
    const previousTeacherId = student.teacherId;
    const studentId = student.studentId;

    student.class = className;
    student.teacherId = teacherId;
    await student.save();

    await Result.updateMany(
      {
        studentId,
        ...schoolFilter
      },
      {
        $set: {
          class: className,
          teacherId
        }
      }
    );
    if (previousClassName && previousClassName !== className) {
      await ClassModel.updateOne(
        {
          name: previousClassName,
          ...schoolFilter
        },
        {
          $pull: {
            studentIds: studentId
          }
        }
      );
    }
    await ClassModel.updateOne(
      {
        _id: existingClass._id,
        ...schoolFilter
      },
      {
        $addToSet: {
          studentIds: studentId
        }
      }
    );
    await logAdminAction(req, {
      action: "admin_student_updated",
      status: "success",
      targetType: "Student",
      targetId: student._id,
      metadata: {
        studentId: student.studentId,
        studentName: student.name,
        previousClassName,
        newClassName: student.class,
        previousTeacherId,
        newTeacherId: student.teacherId,
        schoolId: student.schoolId || null,
        schoolCode: student.schoolCode || null
      }
    });
    return ok(res, {
      status: "updated",
      student
    });
  } catch (err) {
    console.error("ADMIN UPDATE STUDENT ERROR:", err);
    if (err && err.name === "CastError") {
      return fail(res, "Invalid student or teacher id", 400, "INVALID_ID");
    }
    return fail(
      res,
      "Failed to update student",
      500,
      "UPDATE_STUDENT_FAILED"
    );
  }
};
exports.deleteStudentFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return fail(res, "Access denied", 403, "ACCESS_DENIED");
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const studentMongoId = String(req.body.studentMongoId || "").trim();
    if (!studentMongoId) {
      return fail(res, "Missing student id", 400, "MISSING_STUDENT_ID");
    }
    const schoolFilter = req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {};
    const student = await Student.findOne({
      _id: studentMongoId,
      ...schoolFilter
    }).lean();
    if (!student) {
      return fail(res, "Student not found", 404, "STUDENT_NOT_FOUND");
    }
    await ClassModel.updateOne(
      {
        name: student.class,
        ...schoolFilter
      },
      {
        $pull: {
          studentIds: student.studentId
        }
      }
    );
    await Student.deleteOne({
      _id: studentMongoId,
      ...schoolFilter
    });
    await logAdminAction(req, {
      action: "admin_student_deleted",
      status: "success",
      targetType: "Student",
      targetId: studentMongoId,
      metadata: {
        studentId: student.studentId,
        studentName: student.name,
        className: student.class,
        teacherId: student.teacherId,
        schoolId: student.schoolId || null,
        schoolCode: student.schoolCode || null
      }
    });
    return ok(res, {
      status: "deleted"
    });
  } catch (err) {
    console.error("ADMIN DELETE STUDENT ERROR:", err);
    if (err && err.name === "CastError") {
      return fail(res, "Invalid student id", 400, "INVALID_STUDENT_ID");
    }
    return fail(
      res,
      "Failed to delete student",
      500,
      "DELETE_STUDENT_FAILED"
    );
  }
};