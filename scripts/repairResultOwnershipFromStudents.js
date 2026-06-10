require("dotenv").config({
  path: process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.local"
});

const mongoose = require("mongoose");
const Student = require("../models/Student");
const Result = require("../models/Result");

async function main() {
  const mongoUri = process.env.MONGO_URI;
  const confirm = process.env.REPAIR_CONFIRM === "YES";

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing");
  }

  await mongoose.connect(mongoUri);

  const dbName = mongoose.connection.name;

  console.log("Connected to MongoDB");
  console.log("Database:", dbName);
  console.log("Mode:", confirm ? "REPAIR" : "DRY RUN");

  const students = await Student.find({
    status: { $ne: "deleted" }
  })
    .select("studentId name fullName class teacherId schoolId schoolCode")
    .lean();

  let checkedStudents = 0;
  let studentsWithResults = 0;
  let studentsNeedingRepair = 0;
  let totalMatchedResults = 0;
  let totalModifiedResults = 0;

  for (const student of students) {
    checkedStudents++;

    const studentId = String(student.studentId || "").trim();
    const teacherId = String(student.teacherId || "").trim();
    const className = String(student.class || "").trim();

    if (!studentId || !teacherId || !className) {
      continue;
    }

    const baseFilter = {
      studentId
    };

    if (student.schoolId) {
      baseFilter.schoolId = student.schoolId;
    }

    const resultCount = await Result.countDocuments(baseFilter);

    if (resultCount === 0) {
      continue;
    }

    studentsWithResults++;

    const mismatchFilter = {
      ...baseFilter,
      $or: [
        { teacherId: { $ne: teacherId } },
        { class: { $ne: className } },
        { name: { $ne: student.fullName || student.name || "" } }
      ]
    };

    const mismatchCount = await Result.countDocuments(mismatchFilter);

    if (mismatchCount === 0) {
      continue;
    }

    studentsNeedingRepair++;
    totalMatchedResults += mismatchCount;

    console.log("");
    console.log("Student needing repair:");
    console.log("Student ID:", studentId);
    console.log("Name:", student.fullName || student.name || "");
    console.log("Class:", className);
    console.log("Teacher ID:", teacherId);
    console.log("School ID:", student.schoolId || "N/A");
    console.log("Mismatched results:", mismatchCount);

    if (confirm) {
      const updateResult = await Result.updateMany(
        mismatchFilter,
        {
          $set: {
            teacherId,
            class: className,
            name: student.fullName || student.name || "",
            schoolId: student.schoolId || null,
            schoolCode: student.schoolCode || null
          }
        }
      );

      totalModifiedResults += updateResult.modifiedCount || 0;

      console.log("Updated results:", updateResult.modifiedCount || 0);
    }
  }

  console.log("");
  console.log("Repair summary");
  console.log("Database:", dbName);
  console.log("Mode:", confirm ? "REPAIR" : "DRY RUN");
  console.log("Students checked:", checkedStudents);
  console.log("Students with results:", studentsWithResults);
  console.log("Students needing repair:", studentsNeedingRepair);
  console.log("Mismatched result records found:", totalMatchedResults);
  console.log("Result records modified:", totalModifiedResults);

  if (!confirm) {
    console.log("");
    console.log("Dry run only. No data was changed.");
    console.log("To repair, run:");
    console.log("REPAIR_CONFIRM=YES node scripts/repairResultOwnershipFromStudents.js");
  }

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error("REPAIR RESULT OWNERSHIP ERROR:", err);
  try {
    await mongoose.disconnect();
  } catch (disconnectErr) {
    // ignore disconnect errors
  }
  process.exit(1);
});