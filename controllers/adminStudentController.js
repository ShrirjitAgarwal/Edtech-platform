function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}
exports.createStudentFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const User = require("../models/User");
    const name = String(req.body.name || "").trim();
    const studentId = String(req.body.studentId || "").trim();
    const className = String(req.body.className || "").trim().toUpperCase();
    const teacherId = String(req.body.teacherId || "").trim();
    if (!name || !studentId || !className || !teacherId) {
      return res.status(400).json({
        error: "Student name, student ID, class, and teacher are required"
      });
    }
    const existingStudent = await Student.findOne({
      studentId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (existingStudent) {
      return res.status(400).json({
        error: "Student ID already exists"
      });
    }
    const existingClass = await ClassModel.findOne({
      name: className,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!existingClass) {
      return res.status(404).json({
        error: "Class not found"
      });
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found in this school"
      });
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
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      },
      {
        $addToSet: {
          studentIds: studentId
        }
      }
    );
    res.json({
      status: "created",
      student
    });
  } catch (err) {
    console.error("ADMIN CREATE STUDENT ERROR:", err);
    res.status(500).json({
      error: "Failed to create student"
    });
  }
};
exports.bulkCreateStudentsFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
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
      return res.status(400).json({
        error: "Class, teacher, and at least one student are required"
      });
    }
    const existingClass = await ClassModel.findOne({
      name: className,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!existingClass) {
      return res.status(404).json({
        error: "Class not found"
      });
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: { $in: ["teacher", "admin"] },
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found in this school"
      });
    }
    const cleanedStudents = students
      .map((s) => ({
        name: String(s.name || "").trim(),
        studentId: String(s.studentId || "").trim()
      }))
      .filter((s) => s.name && s.studentId);
    if (cleanedStudents.length === 0) {
      return res.status(400).json({
        error: "No valid students found"
      });
    }
    const seenIds = new Set();
    const duplicateIds = [];
    cleanedStudents.forEach((s) => {
      const key = normalizeKey(s.studentId);
      if (seenIds.has(key)) {
        duplicateIds.push(s.studentId);
      }
      seenIds.add(key);
    });
    if (duplicateIds.length > 0) {
      return res.status(400).json({
        error: "Duplicate student IDs in this batch: " + duplicateIds.join(", ")
      });
    }
    const submittedIds = cleanedStudents.map((s) => s.studentId);
    const existingStudents = await Student.find({
      studentId: { $in: submittedIds },
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    })
      .select("studentId")
      .lean();
    if (existingStudents.length > 0) {
      return res.status(400).json({
        error:
          "Student IDs already exist: " +
          existingStudents.map((s) => s.studentId).join(", ")
      });
    }
    const docs = cleanedStudents.map((s) => {
      const nameParts = s.name.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || s.name;
      const lastName = nameParts.slice(1).join(" ");
      return {
        studentId: s.studentId,
        studentKey: normalizeKey(s.studentId),
        name: s.name,
        firstName,
        lastName,
        fullName: s.name,
        nameKey: normalizeKey(s.name),
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
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      },
      {
        $addToSet: {
          studentIds: {
            $each: createdStudents.map((s) => s.studentId)
          }
        }
      }
    );
    res.json({
      status: "created",
      createdCount: createdStudents.length,
      students: createdStudents
    });
  } catch (err) {
    console.error("ADMIN BULK CREATE STUDENTS ERROR:", err);
    res.status(500).json({
      error: "Failed to create students"
    });
  }
};
exports.updateStudentClassFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const User = require("../models/User");
    const studentMongoId = String(req.body.studentMongoId || "").trim();
    const className = String(req.body.className || "").trim().toUpperCase();
    const teacherId = String(req.body.teacherId || "").trim();
    if (!studentMongoId || !className || !teacherId) {
      return res.status(400).json({
        error: "Student, class, and teacher are required"
      });
    }
    const student = await Student.findOne({
      _id: studentMongoId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (!student) {
      return res.status(404).json({
        error: "Student not found"
      });
    }
    const existingClass = await ClassModel.findOne({
      name: className,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!existingClass) {
      return res.status(404).json({
        error: "Class not found"
      });
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found in this school"
      });
    }
    const previousClassName = student.class;
    const studentId = student.studentId;
    student.class = className;
    student.teacherId = teacherId;
    await student.save();
    if (previousClassName && previousClassName !== className) {
      await ClassModel.updateOne(
        {
          name: previousClassName,
          ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
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
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      },
      {
        $addToSet: {
          studentIds: studentId
        }
      }
    );
    res.json({
      status: "updated",
      student
    });
  } catch (err) {
    console.error("ADMIN UPDATE STUDENT ERROR:", err);
    res.status(500).json({
      error: "Failed to update student"
    });
  }
};
exports.deleteStudentFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const Student = require("../models/Student");
    const ClassModel = require("../models/Class");
    const studentMongoId = String(req.body.studentMongoId || "").trim();
    if (!studentMongoId) {
      return res.status(400).json({
        error: "Missing student id"
      });
    }
    const student = await Student.findOne({
      _id: studentMongoId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!student) {
      return res.status(404).json({
        error: "Student not found"
      });
    }
    await ClassModel.updateOne(
      {
        name: student.class,
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      },
      {
        $pull: {
          studentIds: student.studentId
        }
      }
    );
    await Student.deleteOne({
      _id: studentMongoId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    res.json({
      status: "deleted"
    });
  } catch (err) {
    console.error("ADMIN DELETE STUDENT ERROR:", err);
    res.status(500).json({
      error: "Failed to delete student"
    });
  }
};