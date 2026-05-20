const mongoose = require("mongoose");

const classSubjectSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true
  },

  subject: {
    type: String,
    required: true
  },

  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  schoolId: String,
  schoolCode: String
}, {
  timestamps: true
});

// PERFORMANCE INDEXES
classSubjectSchema.index({ schoolId: 1 });
classSubjectSchema.index({ schoolId: 1, teacherId: 1 });
classSubjectSchema.index({ schoolId: 1, className: 1 });
classSubjectSchema.index({ teacherId: 1, className: 1 });

module.exports = mongoose.model("ClassSubject", classSubjectSchema);