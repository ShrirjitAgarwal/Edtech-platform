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
exports.createSubjectFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can create subjects."
      );
    }
    const Subject = require("../models/Subject");
    const normalizedName = String(req.body.name || "").trim();
    if (!normalizedName) {
      return sendError(
        res,
        400,
        "SUBJECT_NAME_REQUIRED",
        "Subject name is required."
      );
    }
    const existingSubject = await Subject.findOne({
      name: normalizedName,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (existingSubject) {
      return sendError(
        res,
        400,
        "SUBJECT_ALREADY_EXISTS",
        "This subject already exists for this school.",
        {
          subjectName: normalizedName
        }
      );
    }
    const subject = await Subject.create({
      name: normalizedName,
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null
    });
    await logAdminAction(req, {
      action: "admin_subject_created",
      status: "success",
      targetType: "Subject",
      targetId: subject._id,
      metadata: {
        subjectName: subject.name
      }
    });
    return sendSuccess(
      res,
      "Subject created successfully.",
      {
        subject
      }
    );
  } catch (err) {
    console.error("ADMIN CREATE SUBJECT ERROR:", err);
    return sendError(
      res,
      500,
      "SUBJECT_CREATE_FAILED",
      "Subject could not be created. Please try again or check server logs."
    );
  }
};
exports.deleteSubjectFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return sendError(
        res,
        403,
        "ADMIN_ACCESS_REQUIRED",
        "Only school admins can delete subjects."
      );
    }
    const Subject = require("../models/Subject");
    const ClassSubject = require("../models/ClassSubject");
    const Test = require("../models/Test");
    const subjectId = String(req.body.subjectId || "").trim();
    if (!subjectId) {
      return sendError(
        res,
        400,
        "SUBJECT_ID_REQUIRED",
        "Subject ID is required to delete a subject."
      );
    }
    const subject = await Subject.findOne({
      _id: subjectId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!subject) {
      return sendError(
        res,
        404,
        "SUBJECT_NOT_FOUND",
        "Subject was not found for this school."
      );
    }
    const mappingCount = await ClassSubject.countDocuments({
      subject: subject.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (mappingCount > 0) {
      return sendError(
        res,
        400,
        "SUBJECT_HAS_MAPPINGS",
        "This subject cannot be deleted because it is still mapped to one or more teachers. Delete those class-subject mappings first.",
        {
          subjectName: subject.name,
          mappingCount
        }
      );
    }
    const testCount = await Test.countDocuments({
      subject: subject.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (testCount > 0) {
      return sendError(
        res,
        400,
        "SUBJECT_HAS_TESTS",
        "This subject cannot be deleted because tests already exist for it.",
        {
          subjectName: subject.name,
          testCount
        }
      );
    }
    await Subject.deleteOne({
      _id: subjectId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    await logAdminAction(req, {
      action: "admin_subject_deleted",
      status: "success",
      targetType: "Subject",
      targetId: subjectId,
      metadata: {
        subjectName: subject.name
      }
    });
    return sendSuccess(
      res,
      "Subject deleted successfully.",
      {
        subjectId,
        subjectName: subject.name
      }
    );
  } catch (err) {
    console.error("ADMIN DELETE SUBJECT ERROR:", err);
    return sendError(
      res,
      500,
      "SUBJECT_DELETE_FAILED",
      "Subject could not be deleted. Please try again or check server logs."
    );
  }
};