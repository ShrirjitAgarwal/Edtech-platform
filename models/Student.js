const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: String,
  studentKey: String,

  name: String,
  firstName: String,
  lastName: String,
  fullName: String,
  nameKey: String,

  class: String,
  userId: String,

  teacherId: String,
  schoolId: String,
  schoolCode: String,

  status: {
    type: String,
    default: "active"
  },

  lastVerifiedAt: Date,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// PERFORMANCE INDEXES
studentSchema.index({ studentId: 1 });
studentSchema.index({ studentKey: 1 });
studentSchema.index({ nameKey: 1 });
studentSchema.index({ studentKey: 1, nameKey: 1 });

studentSchema.index({ teacherId: 1 });
studentSchema.index({ teacherId: 1, studentId: 1 });

studentSchema.index({ class: 1, teacherId: 1 });
studentSchema.index({ userId: 1 });
studentSchema.index({ createdAt: -1 });

studentSchema.index({ schoolId: 1 });
studentSchema.index({ schoolId: 1, class: 1 });
studentSchema.index({ schoolId: 1, teacherId: 1 });
studentSchema.index({ schoolId: 1, studentKey: 1 });
studentSchema.index({ schoolId: 1, studentKey: 1, nameKey: 1 });

module.exports = mongoose.model("Student", studentSchema);