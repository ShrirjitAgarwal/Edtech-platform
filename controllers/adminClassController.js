exports.createClassFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }

    const ClassModel = require("../models/Class");

    const normalizedName = String(req.body.name || "")
      .trim()
      .toUpperCase();

    if (!normalizedName) {
      return res.status(400).json({
        error: "Class name is required"
      });
    }

    const existingClass = await ClassModel.findOne({
      name: normalizedName,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();

    if (existingClass) {
      return res.status(400).json({
        error: "Class already exists"
      });
    }

    const newClass = await ClassModel.create({
      name: normalizedName,
      teacherId: "",
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      studentIds: []
    });

    res.json({
      status: "created",
      class: newClass
    });
  } catch (err) {
    console.error("ADMIN CREATE CLASS ERROR:", err);

    res.status(500).json({
      error: "Failed to create class"
    });
  }
};
exports.deleteClassFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }

    const ClassModel = require("../models/Class");
    const Student = require("../models/Student");
    const ClassSubject = require("../models/ClassSubject");

    const classId = req.body.classId;

    if (!classId) {
      return res.status(400).json({
        error: "Missing classId"
      });
    }

    const existingClass = await ClassModel.findOne({
      _id: classId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();

    if (!existingClass) {
      return res.status(404).json({
        error: "Class not found"
      });
    }

    const studentCount = await Student.countDocuments({
      class: existingClass.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });

    if (studentCount > 0) {
      return res.status(400).json({
        error: "Cannot delete a class that still has students"
      });
    }

    const mappingCount = await ClassSubject.countDocuments({
      className: existingClass.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });

    if (mappingCount > 0) {
      return res.status(400).json({
        error: "Delete class-subject mappings before deleting this class"
      });
    }

    await ClassModel.deleteOne({
      _id: classId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });

    res.json({
      status: "deleted"
    });
  } catch (err) {
    console.error("ADMIN DELETE CLASS ERROR:", err);

    res.status(500).json({
      error: "Failed to delete class"
    });
  }
};