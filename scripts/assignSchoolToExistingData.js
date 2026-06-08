require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : process.env.NODE_ENV === "staging"
      ? ".env.staging"
      : ".env.local"
});
const mongoose = require("mongoose");
const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const Test = require("../models/Test");
const Result = require("../models/Result");
const Assignment = require("../models/Assignment");
const ClassModel = require("../models/Class");
const ClassSubject = require("../models/ClassSubject");
const Question = require("../models/Question");
async function assignSchoolToExistingData() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    let school = await School.findOne({ name: "ABC High School" });
    if (!school) {
      school = await School.create({
        name: "ABC High School",
        code: "4563",
        status: "active"
      });
    }
    const schoolId = String(school._id);
    const schoolCode = school.code;
    const updates = await Promise.all([
      User.updateMany({}, { $set: { schoolId, schoolCode } }),
      Student.updateMany({}, { $set: { schoolId, schoolCode } }),
      Test.updateMany({}, { $set: { schoolId, schoolCode } }),
      Result.updateMany({}, { $set: { schoolId, schoolCode } }),
      Assignment.updateMany({}, { $set: { schoolId, schoolCode } }),
      ClassModel.updateMany({}, { $set: { schoolId, schoolCode } }),
      ClassSubject.updateMany({}, { $set: { schoolId, schoolCode } }),
      Question.updateMany(
        { scope: "teacher" },
        { $set: { schoolId, schoolCode } }
      )
    ]);
    console.log("School assigned successfully");
    console.log({
      schoolId,
      schoolCode,
      updates
    });
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}
assignSchoolToExistingData();