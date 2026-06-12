const mongoose = require("mongoose");

const usageEventSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    index: true
  },
  schoolCode: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  studentId: {
    type: String,
    trim: true,
    index: true
  },
  role: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  eventLabel: {
    type: String,
    trim: true
  },
  resourceType: {
    type: String,
    trim: true
  },
  resourceId: {
    type: String,
    trim: true,
    index: true
  },
  status: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

usageEventSchema.index({ schoolId: 1, eventType: 1, createdAt: -1 });
usageEventSchema.index({ schoolCode: 1, eventType: 1, createdAt: -1 });
usageEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UsageEvent", usageEventSchema);