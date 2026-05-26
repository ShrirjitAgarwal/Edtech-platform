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
      const targetUser =
        await User.findOne({
          _id: userId,
          ...(req.user.schoolId
            ? {
                schoolId:
                  req.user.schoolId
              }
            : {})
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
            ...(req.user.schoolId
              ? {
                  schoolId:
                    req.user.schoolId
                }
              : {})
          });
        if (adminCount <= 1) {
          return res.status(400).json({
            error:
              "Cannot delete the last admin"
          });
        }
      }
      await User.deleteOne({
        _id: userId
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