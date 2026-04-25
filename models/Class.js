const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: String,

  // ✅ OWNER
  teacherId: String,

  // ✅ STUDENTS IN CLASS
  studentIds: {
    type: [String],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Class", classSchema);