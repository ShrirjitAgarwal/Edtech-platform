const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const platformAdminMiddleware = require("../middleware/platformAdmin");
const platformController = require("../controllers/platformController");

const upload = multer({
  dest: path.join(__dirname, "..", "uploads", "question-imports"),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get(
  "/platform-import",
  authMiddleware,
  platformAdminMiddleware,
  platformController.importPage
);

router.post(
  "/platform/import-questions",
  authMiddleware,
  platformAdminMiddleware,
  upload.single("questionFile"),
  platformController.importQuestions
);

module.exports = router;