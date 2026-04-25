const mongoose = require("mongoose");
const TestSchema = new mongoose.Schema({
  name: String,
  questionIds: [Number],
  teacherId: String,
  // ✅ NEW
  className: String,
  subject: String,
  // ✅ NEW — ASSIGNED STUDENTS
  assignedStudents: {
    type: [String],
    default: []
  },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Test", TestSchema);