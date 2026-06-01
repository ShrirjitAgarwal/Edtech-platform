const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

function safeString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function getRequestMeta(req) {
  return {
    requestId: safeString(req.requestId),
    ip: safeString(req.ip),
    userAgent: safeString(req.headers && req.headers["user-agent"])
  };
}

function getActorFromUser(user) {
  if (!user) {
    return {
      actorId: null,
      actorEmail: null,
      actorRole: null,
      schoolId: null,
      schoolCode: null
    };
  }

  return {
    actorId: safeString(user._id || user.id),
    actorEmail: safeString(user.email),
    actorRole: safeString(user.role),
    schoolId: safeString(user.schoolId),
    schoolCode: safeString(user.schoolCode)
  };
}

async function logAuditEvent(req, {
  event,
  status = "success",
  actor = null,
  metadata = {},
  error = null
}) {
  try {
    await AuditLog.create({
      event,
      status,
      ...getActorFromUser(actor || req.user),
      ...getRequestMeta(req),
      metadata,
      error: error ? String(error) : null,
      createdAt: new Date()
    });
  } catch (logErr) {
    logger.error("audit log failed", {
      requestId: req.requestId || null,
      event,
      error: logErr.message
    });
  }
}

module.exports = {
  logAuditEvent
};