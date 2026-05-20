const mongoose = require("mongoose");
const TestSchema = new mongoose.Schema({
  name: String,
  questionIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question"
    }
  ],
  teacherId: String,
schoolId: String,
schoolCode: String,
  className: String,
  subject: String,
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft"
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 60,
    min: 1,
    max: 1440
  },
  testType: {
    type: String,
    enum: ["practice", "unit", "exam"],
    default: "practice"
  },
  questionTimersEnabled: {
    type: Boolean,
    default: false
  },
  assignedStudents: {
    type: [String],
    default: []
  },
  createdAt: { type: Date, default: Date.now }
});
// PERFORMANCE INDEXES
TestSchema.index({ teacherId: 1 });
TestSchema.index({ teacherId: 1, status: 1 });
TestSchema.index({ teacherId: 1, className: 1 });
TestSchema.index({ className: 1, subject: 1 });
TestSchema.index({ status: 1, scheduledAt: 1 });
TestSchema.index({ createdAt: -1 });
TestSchema.index({ teacherId: 1, createdAt: -1 });
TestSchema.index({ schoolId: 1 });
TestSchema.index({ schoolId: 1, teacherId: 1 });
TestSchema.index({ schoolId: 1, className: 1 });
module.exports = mongoose.model("Test", TestSchema);