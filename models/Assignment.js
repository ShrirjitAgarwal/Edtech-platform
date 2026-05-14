const mongoose = require("mongoose");
const assignmentSchema = new mongoose.Schema({
  testId: String,
  testName: String,
  className: String,
  teacherId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
// PERFORMANCE INDEXES
assignmentSchema.index({ teacherId: 1 });
assignmentSchema.index({ testId: 1 });
assignmentSchema.index({ className: 1, teacherId: 1 });
assignmentSchema.index({ createdAt: -1 });
module.exports = mongoose.model("Assignment", assignmentSchema);