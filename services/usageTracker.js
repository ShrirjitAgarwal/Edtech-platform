const UsageEvent = require("../models/UsageEvent");

function normalizeId(value) {
  if (!value) {
    return undefined;
  }

  return value;
}

function normalizeString(value) {
  const text = String(value || "").trim();

  if (!text) {
    return undefined;
  }

  return text;
}

async function recordUsageEvent(payload = {}) {
  try {
    const eventType = normalizeString(payload.eventType);

    if (!eventType) {
      return null;
    }

    const event = await UsageEvent.create({
      schoolId: normalizeId(payload.schoolId),
      schoolCode: normalizeString(payload.schoolCode),
      userId: normalizeId(payload.userId),
      teacherId: normalizeId(payload.teacherId),
      studentId: normalizeString(payload.studentId),
      role: normalizeString(payload.role),
      eventType,
      eventLabel: normalizeString(payload.eventLabel),
      resourceType: normalizeString(payload.resourceType),
      resourceId: normalizeString(payload.resourceId),
      status: normalizeString(payload.status),
      metadata: payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : {}
    });

    return event;
  } catch (err) {
    console.error("USAGE EVENT TRACKING ERROR:", err);
    return null;
  }
}

module.exports = {
  recordUsageEvent
};