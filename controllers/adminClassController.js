const {
  logAdminAction
} = require("../services/adminActionLogger");
function sendSuccess(res, message, data = {}) {
  return res.json({
    success: true,
    message,
    data
  });
}
function sendError(res, statusCode, code, message, details = {}) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}
exports.createClassFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can create classes."
      );
    }
    const ClassModel = require("../models/Class");
    const normalizedName = String(req.body.name || "")
      .trim()
      .toUpperCase();
    if (!normalizedName) {
      return sendError(
        res,
        400,
        "CLASS_NAME_REQUIRED",
        "Class name is required."
      );
    }
    const existingClass = await ClassModel.findOne({
      name: normalizedName,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (existingClass) {
      return sendError(
        res,
        400,
        "CLASS_ALREADY_EXISTS",
        "This class already exists for this school.",
        {
          className: normalizedName
        }
      );
    }
    const newClass = await ClassModel.create({
      name: normalizedName,
      teacherId: "",
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      studentIds: []
    });
    await logAdminAction(req, {
      action: "admin_class_created",
      status: "success",
      targetType: "Class",
      targetId: newClass._id,
      metadata: {
        className: newClass.name
      }
    });
    return sendSuccess(
      res,
      "Class created successfully.",
      {
        class: newClass
      }
    );
  } catch (err) {
    console.error("ADMIN CREATE CLASS ERROR:", err);
    return sendError(
      res,
      500,
      "CLASS_CREATE_FAILED",
      "Class could not be created. Please try again or check server logs."
    );
  }
};
exports.deleteClassFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can delete classes."
      );
    }
    const ClassModel = require("../models/Class");
    const Student = require("../models/Student");
    const ClassSubject = require("../models/ClassSubject");
    const classId = String(req.body.classId || "").trim();
    if (!classId) {
      return sendError(
        res,
        400,
        "CLASS_ID_REQUIRED",
        "Class ID is required to delete a class."
      );
    }
    const existingClass = await ClassModel.findOne({
      _id: classId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!existingClass) {
      return sendError(
        res,
        404,
        "CLASS_NOT_FOUND",
        "Class was not found for this school."
      );
    }
    const studentCount = await Student.countDocuments({
      class: existingClass.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (studentCount > 0) {
      return sendError(
        res,
        400,
        "CLASS_HAS_STUDENTS",
        "This class cannot be deleted because students are still assigned to it. Move or delete those students first.",
        {
          className: existingClass.name,
          studentCount
        }
      );
    }
    const mappingCount = await ClassSubject.countDocuments({
      className: existingClass.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (mappingCount > 0) {
      return sendError(
        res,
        400,
        "CLASS_HAS_MAPPINGS",
        "This class cannot be deleted because it is still mapped to one or more teachers. Delete those class-subject mappings first.",
        {
          className: existingClass.name,
          mappingCount
        }
      );
    }
    await ClassModel.deleteOne({
      _id: classId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    await logAdminAction(req, {
      action: "admin_class_deleted",
      status: "success",
      targetType: "Class",
      targetId: classId,
      metadata: {
        className: existingClass.name
      }
    });
    return sendSuccess(
      res,
      "Class deleted successfully.",
      {
        classId,
        className: existingClass.name
      }
    );
  } catch (err) {
    console.error("ADMIN DELETE CLASS ERROR:", err);
    return sendError(
      res,
      500,
      "CLASS_DELETE_FAILED",
      "Class could not be deleted. Please try again or check server logs."
    );
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
await logAdminAction(req, {
  action: "admin_class_deleted",
  status: "success",
  targetType: "Class",
  targetId: classId,
  metadata: {
    className: existingClass.name
  }
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