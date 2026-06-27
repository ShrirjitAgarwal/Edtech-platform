const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  class: String,
  teacherId: String,
  schoolId: String,
  schoolCode: String,
createdBy: String,
createdByName: String,
mustChangePassword: {
  type: Boolean,
  default: false
},
passwordResetToken: String,
passwordResetExpires: Date
}, { timestamps: true });
module.exports = mongoose.model("User", userSchema);