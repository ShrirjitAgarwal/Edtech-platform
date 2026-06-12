const {
  logAdminAction
} = require("../services/adminActionLogger");
const {
  recordUsageEvent
} = require("../services/usageTracker");
const {
  validatePasswordPolicy
} = require("../utils/passwordPolicy");
const {
  ok,
  fail
} = require("../utils/apiResponse");
exports.addUserFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
return fail(res, "Access denied", 403, "ACCESS_DENIED");
    }
    const bcrypt = require("bcrypt");
    const User = require("../models/User");
    const {
      name,
      email,
      password,
      role
    } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "").trim();
    const normalizedRole = String(role || "teacher").trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
return fail(res, "All fields are required", 400, "MISSING_REQUIRED_FIELDS");
    }
    const passwordPolicyError = validatePasswordPolicy(normalizedPassword);
    if (passwordPolicyError) {
return fail(res, passwordPolicyError, 400, "WEAK_PASSWORD");
    }
    if (normalizedRole !== "teacher" && normalizedRole !== "admin") {
return fail(res, "Invalid role", 400, "INVALID_ROLE");
    }
    const existing = await User.findOne({
      email: normalizedEmail
    }).lean();
    if (existing) {
return fail(res, "User already exists", 409, "USER_ALREADY_EXISTS");
    }
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      createdBy: String(req.user.id || req.user._id || ""),
      createdByName: String(req.user.name || req.user.email || "Admin")
    });
    await logAdminAction(req, {
      action: "admin_user_created",
      status: "success",
      targetType: "User",
      targetId: user._id,
      metadata: {
        createdUserEmail: user.email,
        createdUserRole: user.role,
        createdUserName: user.name,
        schoolId: user.schoolId || null,
        schoolCode: user.schoolCode || null
      }
    });

    await recordUsageEvent({
      schoolId: user.schoolId || req.user.schoolId || null,
      schoolCode: user.schoolCode || req.user.schoolCode || null,
      userId: req.user.id,
      role: req.user.role || "admin",
      eventType: "user_created",
      eventLabel: "User created",
      resourceType: "user",
      resourceId: String(user._id),
      status: "created",
      metadata: {
        createdUserId: String(user._id),
        createdUserEmail: user.email,
        createdUserRole: user.role,
        createdUserName: user.name
      }
    });

    await recordUsageEvent({
      schoolId: user.schoolId || req.user.schoolId || null,
      schoolCode: user.schoolCode || req.user.schoolCode || null,
      userId: req.user.id,
      role: req.user.role || "admin",
      eventType: user.role === "teacher" ? "teacher_created" : "admin_created",
      eventLabel: user.role === "teacher"
        ? "Teacher created"
        : "Admin created",
      resourceType: "user",
      resourceId: String(user._id),
      status: "created",
      metadata: {
        createdUserId: String(user._id),
        createdUserEmail: user.email,
        createdUserRole: user.role,
        createdUserName: user.name
      }
    });

return ok(res, {
  status: "created",
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    schoolCode: user.schoolCode
  }
});
  } catch (err) {
    console.error("ADMIN ADD USER ERROR:", err);
    if (err && err.code === 11000) {
return fail(res, "User already exists", 409, "USER_ALREADY_EXISTS");
    }
return fail(res, "Failed to create user", 500, "CREATE_USER_FAILED");
  }
};
exports.deleteUserFromAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
return fail(res, "Not allowed", 403, "ACCESS_DENIED");
    }
    const User = require("../models/User");
    const Student = require("../models/Student");
    const ClassSubject = require("../models/ClassSubject");
    const Test = require("../models/Test");
    const Assignment = require("../models/Assignment");
    const Result = require("../models/Result");
    const { userId } = req.body;
    if (!userId) {
return fail(res, "Missing userId", 400, "MISSING_USER_ID");
    }
    if (String(userId) === String(req.user.id || req.user._id)) {
return fail(res, "You cannot delete your own account", 400, "SELF_DELETE_BLOCKED");
    }
    const schoolFilter = req.user.schoolId
      ? {
          schoolId: req.user.schoolId
        }
      : {};
    const targetUser = await User.findOne({
      _id: userId,
      ...schoolFilter
    });
    if (!targetUser) {
return fail(res, "User not found", 404, "USER_NOT_FOUND");
    }
    if (targetUser.role !== "teacher" && targetUser.role !== "admin") {
return fail(res, "Only teachers and admins can be deleted", 400, "INVALID_DELETE_ROLE");
    }
    if (targetUser.role === "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
        ...schoolFilter
      });
      if (adminCount <= 1) {
return fail(res, "Cannot delete the last admin", 400, "LAST_ADMIN_DELETE_BLOCKED");
      }
    }
    if (targetUser.role === "teacher") {
      const teacherFilter = {
        teacherId: String(targetUser._id),
        ...schoolFilter
      };
      const [
        studentCount,
        mappingCount,
        testCount,
        assignmentCount,
        resultCount
      ] = await Promise.all([
        Student.countDocuments(teacherFilter),
        ClassSubject.countDocuments(teacherFilter),
        Test.countDocuments(teacherFilter),
        Assignment.countDocuments(teacherFilter),
        Result.countDocuments(teacherFilter)
      ]);
      const totalLinkedRecords =
        studentCount +
        mappingCount +
        testCount +
        assignmentCount +
        resultCount;
      if (totalLinkedRecords > 0) {
return fail(
  res,
  "Cannot delete this teacher because they still have linked students, mappings, tests, assignments, or results. Reassign or delete the linked data first.",
  400,
  "TEACHER_HAS_LINKED_DATA",
  {
    students: studentCount,
    mappings: mappingCount,
    tests: testCount,
    assignments: assignmentCount,
    results: resultCount
  }
);
      }
    }
    await User.deleteOne({
      _id: userId,
      ...schoolFilter
    });
    await logAdminAction(req, {
      action: "admin_user_deleted",
      status: "success",
      targetType: "User",
      targetId: userId,
      metadata: {
        deletedUserEmail: targetUser.email,
        deletedUserRole: targetUser.role,
        deletedUserName: targetUser.name,
        schoolId: targetUser.schoolId || null,
        schoolCode: targetUser.schoolCode || null
      }
    });
return ok(res, {
  status: "deleted"
});
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    if (err && err.name === "CastError") {
return fail(res, "Invalid userId", 400, "INVALID_USER_ID");
    }
return fail(res, "Failed to delete user", 500, "DELETE_USER_FAILED");
  }
};