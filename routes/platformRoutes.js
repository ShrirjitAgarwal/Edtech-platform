const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const platformAdminMiddleware = require("../middleware/platformAdmin");
const platformController = require("../controllers/platformController");
const platformSchoolController = require("../controllers/platformSchoolController");
const upload = multer({
  dest: path.join(__dirname, "..", "uploads", "question-imports"),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function getMongoHealth() {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  return {
    status: states[readyState] || "unknown",
    readyState,
    databaseName: mongoose.connection.name || null,
    host: mongoose.connection.host || null
  };
}
function getEnvStatus(name) {
  const value = String(process.env[name] || "").trim();
  return {
    name,
    present: Boolean(value),
    length: value.length || 0
  };
}
function getStatusBadge(isOk) {
  return isOk
    ? `<span style="background:#dcfce7;color:#166534;padding:5px 10px;border-radius:999px;font-weight:800;font-size:12px;">OK</span>`
    : `<span style="background:#fee2e2;color:#991b1b;padding:5px 10px;border-radius:999px;font-weight:800;font-size:12px;">CHECK</span>`;
}
router.get(
  "/platform/health",
  authMiddleware,
  platformAdminMiddleware,
  (req, res) => {
    const mongo = getMongoHealth();
    const requiredEnv = [
      "JWT_SECRET",
      "MONGO_URI",
      "JUDGE_PROVIDER",
      "LOCAL_CODE_EXECUTION_ENABLED",
      "PLATFORM_ADMIN_EMAIL"
    ];
    const envRows = requiredEnv.map(name => {
      const env = getEnvStatus(name);
      return `
<tr>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:700;">
    ${escapeHtml(env.name)}
  </td>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
    ${getStatusBadge(env.present)}
  </td>
  <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
    ${env.present ? escapeHtml(String(env.length)) : "-"}
  </td>
</tr>
`;
    }).join("");
    const mongoOk = mongo.readyState === 1;
    const localCodeExecutionEnabled =
      String(process.env.LOCAL_CODE_EXECUTION_ENABLED || "")
        .trim()
        .toLowerCase() === "true";
    const content = `
<body style="margin:0;font-family:Arial;background:#eef2ff;">
<div style="
  max-width:980px;
  margin:30px auto;
  background:white;
  padding:28px;
  border-radius:16px;
  box-shadow:0 8px 24px rgba(15,23,42,0.08);
">
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:14px;
    margin-bottom:24px;
  ">
    <div>
      <h1 style="margin:0;">Platform Health</h1>
      <p style="margin:8px 0 0 0;color:#64748b;">
        Live system status for platform admins.
      </p>
    </div>
    <button id="platformHealthBackButton" style="
      padding:11px 15px;
      background:#475569;
      color:white;
      border:none;
      border-radius:8px;
      cursor:pointer;
      font-weight:800;
    ">
      Back
    </button>
  </div>
  <div style="
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:14px;
    margin-bottom:24px;
  ">
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <div style="color:#64748b;font-size:13px;font-weight:700;">App Status</div>
      <div style="margin-top:10px;">
        ${getStatusBadge(mongoOk)}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <div style="color:#64748b;font-size:13px;font-weight:700;">Environment</div>
      <div style="margin-top:10px;font-size:18px;font-weight:800;">
        ${escapeHtml(process.env.NODE_ENV || "local")}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <div style="color:#64748b;font-size:13px;font-weight:700;">Uptime</div>
      <div style="margin-top:10px;font-size:18px;font-weight:800;">
        ${Math.round(process.uptime())} seconds
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <div style="color:#64748b;font-size:13px;font-weight:700;">Server Time</div>
      <div style="margin-top:10px;font-size:14px;font-weight:800;">
        ${escapeHtml(new Date().toISOString())}
      </div>
    </div>
  </div>
  <div style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:12px;
    padding:18px;
    margin-bottom:24px;
  ">
    <h2 style="margin-top:0;">MongoDB</h2>
    <p><b>Status:</b> ${escapeHtml(mongo.status)}</p>
    <p><b>Ready State:</b> ${escapeHtml(String(mongo.readyState))}</p>
    <p><b>Database:</b> ${escapeHtml(mongo.databaseName || "N/A")}</p>
    <p><b>Host:</b> ${escapeHtml(mongo.host || "N/A")}</p>
  </div>
  <div style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:12px;
    padding:18px;
    margin-bottom:24px;
  ">
    <h2 style="margin-top:0;">Execution Settings</h2>
    <p><b>Judge Provider:</b> ${escapeHtml(process.env.JUDGE_PROVIDER || "local")}</p>
    <p><b>Local Code Execution Enabled:</b> ${localCodeExecutionEnabled ? "true" : "false"}</p>
  </div>
  <div style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:12px;
    padding:18px;
  ">
    <h2 style="margin-top:0;">Required Environment Variables</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;">
      <tr style="background:#e2e8f0;text-align:left;">
        <th style="padding:12px;">Name</th>
        <th style="padding:12px;">Status</th>
        <th style="padding:12px;">Length</th>
      </tr>
      ${envRows}
    </table>
    <p style="color:#64748b;font-size:13px;margin-bottom:0;">
      Values are never shown. Only presence and length are displayed.
    </p>
  </div>
</div>
</body>
<script>
const platformHealthBackButton = document.getElementById("platformHealthBackButton");
if(platformHealthBackButton){
  platformHealthBackButton.addEventListener("click", function(){
    window.location.replace("/platform/schools");
  });
}
</script>
`;

    res.send(content);
  }
);
router.get(
  "/platform/schools",
  authMiddleware,
  platformAdminMiddleware,
  platformSchoolController.listSchoolsPage
);
router.get(
  "/platform/schools/:schoolId/usage",
  authMiddleware,
  platformAdminMiddleware,
  platformSchoolController.schoolUsagePage
);
router.post(
  "/platform/schools",
  authMiddleware,
  platformAdminMiddleware,
  express.urlencoded({ extended: true }),
  platformSchoolController.createSchool
);
router.post(
  "/platform/schools/:schoolId/update",
  authMiddleware,
  platformAdminMiddleware,
  express.urlencoded({ extended: true }),
  platformSchoolController.updateSchool
);
router.post(
  "/platform/schools/:schoolId/delete",
  authMiddleware,
  platformAdminMiddleware,
  express.urlencoded({ extended: true }),
  platformSchoolController.deleteSchool
);
router.post(
  "/platform/schools/:schoolId/admins",
  authMiddleware,
  platformAdminMiddleware,
  express.urlencoded({ extended: true }),
  platformSchoolController.createAdminForSchool
);
router.get(
  "/platform-import",
  authMiddleware,
  platformAdminMiddleware,
  platformController.importPage
);
router.post(
  "/api/platform/questions/import",
  authMiddleware,
  platformAdminMiddleware,
  upload.single("questionFile"),
  platformController.importQuestions
);
module.exports = router;