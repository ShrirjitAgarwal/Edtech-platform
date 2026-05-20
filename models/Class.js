const mongoose = require("mongoose");
const classSchema = new mongoose.Schema({
  name: String,
  // ✅ OWNER
  teacherId: String,
  schoolId: String,
schoolCode: String,
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
classSchema.index({ schoolId: 1 });
classSchema.index({ schoolId: 1, teacherId: 1 });
classSchema.index({ schoolId: 1, name: 1 });
module.exports = mongoose.model("Class", classSchema);