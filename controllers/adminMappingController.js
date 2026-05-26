exports.mapClassSubject = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }
    const ClassSubject = require("../models/ClassSubject");
    const { className, subject, teacherId } = req.body;
    const normalizedClass = String(className || "").trim();
    const normalizedSubject = String(subject || "").trim();
    if (!normalizedClass || !normalizedSubject || !teacherId) {
      return res.status(400).json({ error: "Missing fields" });
    }
const existingMapping =
  await ClassSubject.findOne({
    className: normalizedClass,
    subject: normalizedSubject,
    ...(req.user.schoolId
      ? { schoolId: req.user.schoolId }
      : {})
  }).lean();
if (existingMapping) {
  const User =
    require("../models/User");
  const existingTeacher =
    await User.findById(
      existingMapping.teacherId
    )
      .select("name email")
      .lean();
  return res.status(400).json({
    error:
      "This class and subject is already mapped to " +
      (
        existingTeacher?.name ||
        existingTeacher?.email ||
        "another teacher"
      ) +
      ". Delete the existing mapping before assigning a new teacher."
  });
}
const newMapping =
  await ClassSubject.create({
    className: normalizedClass,
    subject: normalizedSubject,
    teacherId: String(teacherId),
    schoolId:
      req.user.schoolId || null,
    schoolCode:
      req.user.schoolCode || null
  });
    res.json({ status: "mapped", data: newMapping });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed mapping" });
  }
};
exports.deleteClassSubjectMapping =
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          error: "Not allowed"
        });
      }
      const ClassSubject =
        require("../models/ClassSubject");
      const { mappingId } =
        req.body;
      if (!mappingId) {
        return res.status(400).json({
          error: "Missing mappingId"
        });
      }
      const deleted =
        await ClassSubject.findOneAndDelete({
          _id: mappingId,
          ...(req.user.schoolId
            ? {
                schoolId:
                  req.user.schoolId
              }
            : {})
        });
      if (!deleted) {
        return res.status(404).json({
          error: "Mapping not found"
        });
      }
      res.json({
        status: "deleted"
      });
    } catch (err) {
      console.error(
        "DELETE MAPPING ERROR:",
        err
      );
      res.status(500).json({
        error: "Failed to delete mapping"
      });
    }
  };