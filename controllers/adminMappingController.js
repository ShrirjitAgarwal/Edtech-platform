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
exports.mapClassSubject = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can map teachers to classes and subjects."
      );
    }
    const ClassSubject = require("../models/ClassSubject");
    const User = require("../models/User");
    const ClassModel = require("../models/Class");
    const Subject = require("../models/Subject");
    const className = String(req.body.className || "").trim().toUpperCase();
    const subject = String(req.body.subject || "").trim();
    const teacherId = String(req.body.teacherId || "").trim();
    if (!className || !subject || !teacherId) {
      return sendError(
        res,
        400,
        "MAPPING_FIELDS_REQUIRED",
        "Class, subject, and teacher are required to create a mapping.",
        {
          classNamePresent: Boolean(className),
          subjectPresent: Boolean(subject),
          teacherIdPresent: Boolean(teacherId)
        }
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
      return sendError(
        res,
        404,
        "CLASS_NOT_FOUND",
        "This class was not found for this school. Create the class before mapping it.",
        {
          className
        }
      );
    }
    const existingSubject = await Subject.findOne({
      name: subject,
      ...schoolFilter
    }).lean();
    if (!existingSubject) {
      return sendError(
        res,
        404,
        "SUBJECT_NOT_FOUND",
        "This subject was not found for this school. Create the subject before mapping it.",
        {
          subject
        }
      );
    }
    const teacher = await User.findOne({
      _id: teacherId,
      role: "teacher",
      ...schoolFilter
    })
      .select("name email role")
      .lean();
    if (!teacher) {
      return sendError(
        res,
        404,
        "TEACHER_NOT_FOUND",
        "This teacher was not found for this school.",
        {
          teacherId
        }
      );
    }
    const existingMapping = await ClassSubject.findOne({
      className,
      subject,
      ...schoolFilter
    }).lean();
    if (existingMapping) {
      const existingTeacher = await User.findById(
        existingMapping.teacherId
      )
        .select("name email")
        .lean();
      return sendError(
        res,
        400,
        "MAPPING_ALREADY_EXISTS",
        "This class and subject are already mapped to another teacher. Delete the existing mapping before assigning a new teacher.",
        {
          className,
          subject,
          existingTeacher:
            existingTeacher?.name ||
            existingTeacher?.email ||
            "Unknown teacher"
        }
      );
    }
    const newMapping = await ClassSubject.create({
      className,
      subject,
      teacherId: String(teacherId),
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null
    });
    await logAdminAction(req, {
      action: "admin_mapping_created",
      status: "success",
      targetType: "ClassSubject",
      targetId: newMapping._id,
      metadata: {
        className: newMapping.className,
        subject: newMapping.subject,
        teacherId: newMapping.teacherId
      }
    });
    return sendSuccess(
      res,
      "Teacher mapping created successfully.",
      {
        mapping: newMapping
      }
    );
  } catch (err) {
    console.error("ADMIN CREATE MAPPING ERROR:", err);
    return sendError(
      res,
      500,
      "MAPPING_CREATE_FAILED",
      "Teacher mapping could not be created. Please try again or check server logs."
    );
  }
};
exports.deleteClassSubjectMapping = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can delete teacher mappings."
      );
    }
    const ClassSubject = require("../models/ClassSubject");
    const mappingId = String(req.body.mappingId || "").trim();
    if (!mappingId) {
      return sendError(
        res,
        400,
        "MAPPING_ID_REQUIRED",
        "Mapping ID is required to delete a teacher mapping."
      );
    }
    const deleted = await ClassSubject.findOneAndDelete({
      _id: mappingId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (!deleted) {
      return sendError(
        res,
        404,
        "MAPPING_NOT_FOUND",
        "Teacher mapping was not found for this school."
      );
    }
    await logAdminAction(req, {
      action: "admin_mapping_deleted",
      status: "success",
      targetType: "ClassSubject",
      targetId: mappingId,
      metadata: {
        className: deleted.className,
        subject: deleted.subject,
        teacherId: deleted.teacherId
      }
    });
    return sendSuccess(
      res,
      "Teacher mapping deleted successfully.",
      {
        mappingId,
        className: deleted.className,
        subject: deleted.subject,
        teacherId: deleted.teacherId
      }
    );
  } catch (err) {
    console.error("ADMIN DELETE MAPPING ERROR:", err);
    return sendError(
      res,
      500,
      "MAPPING_DELETE_FAILED",
      "Teacher mapping could not be deleted. Please try again or check server logs."
    );
  }
};