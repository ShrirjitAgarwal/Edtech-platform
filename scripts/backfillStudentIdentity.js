require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : process.env.NODE_ENV === "staging"
      ? ".env.staging"
      : ".env.local"
});
const mongoose = require("mongoose");
const connectDB = require("../data/config/db");
const Student = require("../models/Student");
function normalize(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function normalizeStudentId(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}
function splitName(name) {
  const cleanName = String(name || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleanName) {
    return {
      firstName: "",
      lastName: "",
      fullName: ""
    };
  }
  const parts = cleanName.split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");
  return {
    firstName,
    lastName,
    fullName: cleanName
  };
}
async function backfillStudentIdentity() {
  try {
    await connectDB();
    const students = await Student.find().lean();
    console.log("Students found:", students.length);
    let updated = 0;
    let skipped = 0;
    for (const student of students) {
      const {
        firstName,
        lastName,
        fullName
      } = splitName(student.name);
      const studentKey = normalizeStudentId(student.studentId);
      const nameKey = normalize(fullName);
      if (!studentKey || !nameKey) {
        skipped++;
        console.log("Skipped student:", {
          _id: student._id,
          studentId: student.studentId,
          name: student.name
        });
        continue;
      }
      await Student.updateOne(
        { _id: student._id },
        {
          $set: {
            firstName,
            lastName,
            fullName,
            nameKey,
            studentKey,
            status: student.status || "active"
          }
        }
      );
      updated++;
    }
    console.log("Student identity backfill complete");
    console.log({
      updated,
      skipped
    });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Student identity backfill failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}
backfillStudentIdentity();