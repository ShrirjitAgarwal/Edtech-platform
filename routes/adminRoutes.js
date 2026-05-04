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
  adminController.schoolDashboardPage
);
router.post(
  "/admin/map-class-subject",
  authMiddleware,
  adminController.mapClassSubject
);
module.exports = router;