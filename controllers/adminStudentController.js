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