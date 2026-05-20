const mongoose = require("mongoose");
const resultSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  class: String,
  testId: String,
  testName: String,
  teacherId: String,
schoolId: String,
schoolCode: String,
  score: Number,
  total: Number,
  answers: Array,
  date: { type: Date, default: Date.now }
});
// 🔒 PREVENT MULTIPLE ATTEMPTS
resultSchema.index({ studentId: 1, testId: 1 }, { unique: true });
resultSchema.index({ teacherId: 1, testId: 1 });
resultSchema.index({ teacherId: 1, studentId: 1 });
resultSchema.index({ teacherId: 1, class: 1 });
resultSchema.index({ date: -1 });
resultSchema.index({ schoolId: 1 });
resultSchema.index({ schoolId: 1, teacherId: 1 });
resultSchema.index({ schoolId: 1, studentId: 1 });
module.exports = mongoose.model("Result", resultSchema);