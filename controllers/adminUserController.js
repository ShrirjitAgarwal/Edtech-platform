const {
  logAdminAction
} = require("../services/adminActionLogger");
exports.addUserFromAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const bcrypt = require("bcrypt");
    const User = require("../models/User");
    const {
      name,
      email,
      password,
      role
    } = req.body;
    const normalizedName =
      String(name || "").trim();
    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();
    const normalizedPassword =
      String(password || "").trim();
    const normalizedRole =
      String(role || "teacher")
        .trim()
        .toLowerCase();
    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedPassword
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }
    if (
      normalizedRole !== "teacher" &&
      normalizedRole !== "admin"
    ) {
      return res.status(400).json({
        error: "Invalid role"
      });
    }
    const existing =
      await User.findOne({
        email: normalizedEmail
      }).lean();
    if (existing) {
      return res.status(400).json({
        error: "User already exists"
      });
    }
    const hashedPassword =
      await bcrypt.hash(
        normalizedPassword,
        10
      );
const user =
  await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword,
    role: normalizedRole,
    schoolId:
      req.user.schoolId || null,
    schoolCode:
      req.user.schoolCode || null,
    createdBy:
      String(req.user.id || ""),
    createdByName:
      String(req.user.name || "Admin")
  });
await logAdminAction(req, {
  action: "admin_user_created",
  status: "success",
  targetType: "User",
  targetId: user._id,
  metadata: {
    createdUserEmail: user.email,
    createdUserRole: user.role,
    createdUserName: user.name
  }
});
res.json({
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
    console.error(
      "ADMIN ADD USER ERROR:",
      err
    );
    res.status(500).json({
      error: "Failed to create user"
    });
  }
};
  exports.deleteUserFromAdmin =
async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Not allowed"
      });
    }

    const User =
      require("../models/User");
    const Student =
      require("../models/Student");
    const ClassSubject =
      require("../models/ClassSubject");
    const Test =
      require("../models/Test");
    const Assignment =
      require("../models/Assignment");
    const Result =
      require("../models/Result");

    const { userId } =
      req.body;

    if (!userId) {
      return res.status(400).json({
        error: "Missing userId"
      });
    }

    if (
      String(userId) ===
      String(req.user.id)
    ) {
      return res.status(400).json({
        error:
          "You cannot delete your own account"
      });
    }

    const schoolFilter =
      req.user.schoolId
        ? {
            schoolId:
              req.user.schoolId
          }
        : {};

    const targetUser =
      await User.findOne({
        _id: userId,
        ...schoolFilter
      });

    if (!targetUser) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    if (
      targetUser.role !== "teacher" &&
      targetUser.role !== "admin"
    ) {
      return res.status(400).json({
        error:
          "Only teachers and admins can be deleted"
      });
    }

    if (
      targetUser.role === "admin"
    ) {
      const adminCount =
        await User.countDocuments({
          role: "admin",
          ...schoolFilter
        });

      if (adminCount <= 1) {
        return res.status(400).json({
          error:
            "Cannot delete the last admin"
        });
      }
    }

    if (
      targetUser.role === "teacher"
    ) {
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
        return res.status(400).json({
          error:
            "Cannot delete this teacher because they still have linked students, mappings, tests, assignments, or results. Reassign or delete the linked data first.",
          linkedData: {
            students: studentCount,
            mappings: mappingCount,
            tests: testCount,
            assignments: assignmentCount,
            results: resultCount
          }
        });
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
        deletedUserName: targetUser.name
      }
    });

    res.json({
      status: "deleted"
    });
  } catch (err) {
    console.error(
      "DELETE USER ERROR:",
      err
    );

    res.status(500).json({
      error: "Failed to delete user"
    });
  }
};