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

module.exports = mongoose.model("Assignment", assignmentSchema);