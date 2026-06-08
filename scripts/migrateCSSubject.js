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
const Test = require("../models/Test");
const Question = require("../models/Question");
const ClassSubject = require("../models/ClassSubject");
const Assignment = require("../models/Assignment");
const Result = require("../models/Result");
async function migrate() {
  try {
    await connectDB();
    console.log("Starting CS migration...");
    const updates = [];
    updates.push(
      Test.updateMany(
        {
          $or: [
            { subject: "CS" },
            { subject: "cs" },
            { subject: "Computer science" }
          ]
        },
        {
          $set: {
            subject: "Computer Science"
          }
        }
      )
    );
    updates.push(
      Question.updateMany(
        {
          $or: [
            { subject: "CS" },
            { subject: "cs" },
            { subject: "Computer science" }
          ]
        },
        {
          $set: {
            subject: "Computer Science"
          }
        }
      )
    );
    updates.push(
      ClassSubject.updateMany(
        {
          $or: [
            { subject: "CS" },
            { subject: "cs" },
            { subject: "Computer science" }
          ]
        },
        {
          $set: {
            subject: "Computer Science"
          }
        }
      )
    );
    updates.push(
      Assignment.updateMany(
        {
          $or: [
            { subject: "CS" },
            { subject: "cs" },
            { subject: "Computer science" }
          ]
        },
        {
          $set: {
            subject: "Computer Science"
          }
        }
      )
    );
    updates.push(
      Result.updateMany(
        {
          $or: [
            { subject: "CS" },
            { subject: "cs" },
            { subject: "Computer science" }
          ]
        },
        {
          $set: {
            subject: "Computer Science"
          }
        }
      )
    );
    const results = await Promise.all(updates);
    console.log("Migration complete");
    console.log({
      tests: results[0],
      questions: results[1],
      classSubjects: results[2],
      assignments: results[3],
      results: results[4]
    });
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
migrate();