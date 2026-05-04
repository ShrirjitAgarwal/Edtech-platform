const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const reportController = require("../controllers/reportController");
router.post(
  "/download-report",
  authMiddleware,
  reportController.downloadReport
);
router.post(
  "/download-class-report",
  reportController.downloadClassReport
);
router.get(
  "/result",
  reportController.resultPage
);
module.exports = router;