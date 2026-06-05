const {
  logAdminAction
} = require("../services/adminActionLogger");
exports.createSubjectFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const Subject = require("../models/Subject");
    const normalizedName = String(req.body.name || "").trim();
    if (!normalizedName) {
      return res.status(400).json({
        error: "Subject name is required"
      });
    }
    const existingSubject = await Subject.findOne({
      name: normalizedName,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (existingSubject) {
      return res.status(400).json({
        error: "Subject already exists"
      });
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
res.json({
 status: "created",
 subject
 });
  } catch (err) {
    console.error("ADMIN CREATE SUBJECT ERROR:", err);
    res.status(500).json({
      error: "Failed to create subject"
    });
  }
};
exports.deleteSubjectFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const Subject = require("../models/Subject");
    const ClassSubject = require("../models/ClassSubject");
    const Test = require("../models/Test");
    const subjectId = String(req.body.subjectId || "").trim();
    if (!subjectId) {
      return res.status(400).json({
        error: "Missing subjectId"
      });
    }
    const subject = await Subject.findOne({
      _id: subjectId,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (!subject) {
      return res.status(404).json({
        error: "Subject not found"
      });
    }
    const mappingCount = await ClassSubject.countDocuments({
      subject: subject.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (mappingCount > 0) {
      return res.status(400).json({
        error: "Delete class-subject mappings before deleting this subject"
      });
    }
    const testCount = await Test.countDocuments({
      subject: subject.name,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if (testCount > 0) {
      return res.status(400).json({
        error: "Cannot delete a subject that has tests"
      });
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
 res.json({
 status: "deleted"
 });
  } catch (err) {
    console.error("ADMIN DELETE SUBJECT ERROR:", err);
    res.status(500).json({
      error: "Failed to delete subject"
    });
  }
};