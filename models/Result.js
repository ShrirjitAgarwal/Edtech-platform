console.log("Result model file loaded");
const mongoose = require("mongoose");
const resultSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  class: String,
  testId: String,
  testName: String,
  teacherId: String,
  score: Number,
  total: Number,
  answers: Array,
  date: { type: Date, default: Date.now }
});
// 🔒 PREVENT MULTIPLE ATTEMPTS
resultSchema.index({ studentId: 1, testId: 1 }, { unique: true });
module.exports = mongoose.model("Result", resultSchema);