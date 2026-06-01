const AdminActionLog = require("../models/AdminActionLog");
const logger = require("../utils/logger");

function getActor(req) {
  const user = req.user || {};

  return {
    actorId: user.id ? String(user.id) : null,
    actorEmail: user.email ? String(user.email) : null,
    actorRole: user.role ? String(user.role) : null,
    schoolId: user.schoolId ? String(user.schoolId) : null,
    schoolCode: user.schoolCode ? String(user.schoolCode) : null
  };
}

async function logAdminAction(req, {
  action,
  status = "success",
  targetType = null,
  targetId = null,
  metadata = {},
  error = null
}) {
  try {
    await AdminActionLog.create({
      action,
      status,
      ...getActor(req),
      targetType,
      targetId: targetId ? String(targetId) : null,
      requestId: req.requestId || null,
      metadata,
      error: error ? String(error) : null,
      createdAt: new Date()
    });
  } catch (logErr) {
    logger.error("admin action log failed", {
      requestId: req.requestId || null,
      action,
      error: logErr.message
    });
  }
}

module.exports = {
  logAdminAction
};