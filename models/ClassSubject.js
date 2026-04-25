const mongoose = require("mongoose");

const classSubjectSchema = new mongoose.Schema({
  className: { type: String, required: true },
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });

module.exports = mongoose.model("ClassSubject", classSubjectSchema);