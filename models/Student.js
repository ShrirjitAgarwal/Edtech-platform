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

module.exports = mongoose.model("Student", studentSchema);