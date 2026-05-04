const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
  name: String,
  questionIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question"
    }
  ],
  teacherId: String,
  className: String,
  subject: String,
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft"
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 60,
    min: 1,
    max: 1440
  },
  testType: {
    type: String,
    enum: ["practice", "unit", "exam"],
    default: "practice"
  },
  assignedStudents: {
    type: [String],
    default: []
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Test", TestSchema);