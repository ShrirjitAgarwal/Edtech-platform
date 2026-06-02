const mongoose = require("mongoose");
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  schoolId: String,
  schoolCode: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
subjectSchema.index({ schoolId: 1 });
subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model("Subject", subjectSchema);