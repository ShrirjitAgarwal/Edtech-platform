const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    default: "success"
  },
  actorId: {
    type: String,
    default: null
  },
  actorEmail: {
    type: String,
    default: null
  },
  actorRole: {
    type: String,
    default: null
  },
  schoolId: {
    type: String,
    default: null
  },
  schoolCode: {
    type: String,
    default: null
  },
  requestId: {
    type: String,
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ event: 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ actorEmail: 1 });
auditLogSchema.index({ schoolId: 1 });
auditLogSchema.index({ requestId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);