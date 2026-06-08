const mongoose = require("mongoose");
const adminActionLogSchema = new mongoose.Schema({
  action: {
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
  targetType: {
    type: String,
    default: null
  },
  targetId: {
    type: String,
    default: null
  },
  requestId: {
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
adminActionLogSchema.index({ action: 1 });
adminActionLogSchema.index({ actorId: 1 });
adminActionLogSchema.index({ schoolId: 1 });
adminActionLogSchema.index({ requestId: 1 });
adminActionLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model("AdminActionLog", adminActionLogSchema);