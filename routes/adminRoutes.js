const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const adminController = require("../controllers/adminController");
router.get(
  "/admin-student",
  authMiddleware,
  adminController.adminStudentPage
);
router.get(
  "/admin-class",
  authMiddleware,
  adminController.adminClassPage
);
router.get(
  "/school-dashboard",
  authMiddleware,
  adminController.schoolDashboardPage
);
router.post(
  "/admin/map-class-subject",
  authMiddleware,
  adminController.mapClassSubject
);
router.get(
  "/admin-settings",
  authMiddleware,
  adminController.adminSettingsPage
);
router.post(
  "/admin/add-user",
  authMiddleware,
  adminController.addUserFromAdmin
);
router.post(
  "/admin/delete-class-subject-mapping",
  authMiddleware,
  adminController.deleteClassSubjectMapping
);
router.post(
  "/admin/delete-user",
  authMiddleware,
  adminController.deleteUserFromAdmin
);
module.exports = router;