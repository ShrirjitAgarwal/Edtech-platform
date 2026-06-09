const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const reportController = require("../controllers/reportController");
router.post(
  "/api/reports/student/download",
  authMiddleware,
  reportController.downloadReport
);
router.post(
  "/api/reports/class/download",
  authMiddleware,
  reportController.downloadClassReport
);
router.get(
  "/result",
  reportController.resultPage
);
module.exports = router;