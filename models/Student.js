const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
studentId: String,
name: String,
class: String,
userId: String,

  teacherId: String,      // mapping to teacher

  createdAt: {
    type: Date,
    default: Date.now
  }
});
// PERFORMANCE INDEXES
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ teacherId: 1 });
studentSchema.index({ class: 1, teacherId: 1 });
studentSchema.index({ userId: 1 });
studentSchema.index({ createdAt: -1 });
module.exports = mongoose.model("Student", studentSchema);