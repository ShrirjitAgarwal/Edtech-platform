const mongoose = require("mongoose");
const classSchema = new mongoose.Schema({
  name: String,
  // Legacy field retained for old data compatibility.
  // Class ownership should come from ClassSubject mappings, not this field.
  teacherId: String,
  schoolId: String,
schoolCode: String,
  // Legacy list retained for old data compatibility.
  // Student membership should come from Student.class, not this field.
  studentIds: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
classSchema.index({ schoolId: 1 });
classSchema.index({ schoolId: 1, name: 1 });
module.exports = mongoose.model("Class", classSchema);