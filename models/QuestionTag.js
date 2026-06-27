const mongoose = require("mongoose");
const questionTagSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  schoolId: { type: String, required: true },
  createdBy: { type: String, default: null }
}, { timestamps: true });
questionTagSchema.index({ schoolId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model("QuestionTag", questionTagSchema);
