const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({
  path: ".env.local",
  override: true
});
const localMongoUri = process.env.MONGO_URI;
dotenv.config({
  path: ".env.production",
  override: true
});
const productionMongoUri = process.env.MONGO_URI;
if (!localMongoUri) {
  console.error("Missing local MONGO_URI from .env.local");
  process.exit(1);
}
if (!productionMongoUri) {
  console.error("Missing production MONGO_URI from .env.production");
  process.exit(1);
}
if (localMongoUri === productionMongoUri) {
  console.error("Local and production MONGO_URI are the same. Stopping.");
  process.exit(1);
}
const Question = require("../models/Question");
function getPublicQuestionQuery() {
  return {
    $or: [
      { scope: "public" },
      { scope: { $exists: false } },
      { scope: null },
      { scope: "" }
    ]
  };
}
function normalizeQuestionForProduction(question) {
  const copy = {
    ...question
  };
  delete copy._id;
  delete copy.__v;
  copy.scope = "public";
  copy.teacherId = null;
  copy.schoolId = null;
  copy.schoolCode = null;
  if (!copy.analytics) {
    copy.analytics = {
      attempted: 0,
      correct: 0,
      incorrect: 0
    };
  }
  return copy;
}
function buildUpsertFilter(question) {
  return {
    question: question.question || "",
    subject: question.subject || "",
    category: question.category || "",
    board: question.board || "",
    difficulty: question.difficulty || "",
    type: question.type || "mcq",
    scope: "public"
  };
}
async function main() {
  const shouldCopy = process.env.COPY_CONFIRM === "YES";
  const localConnection = await mongoose.createConnection(localMongoUri).asPromise();
  const productionConnection = await mongoose.createConnection(productionMongoUri).asPromise();
  const LocalQuestion = localConnection.model(
    "Question",
    Question.schema
  );
  const ProductionQuestion = productionConnection.model(
    "Question",
    Question.schema
  );
  const localQuestions = await LocalQuestion.find(
    getPublicQuestionQuery()
  ).lean();
  console.log("Local public questions found:", localQuestions.length);
  if (!shouldCopy) {
    console.log("Dry run only. No production data changed.");
    console.log("To copy, run:");
    console.log("COPY_CONFIRM=YES node scripts/copyPublicQuestionsLocalToProduction.js");
    await localConnection.close();
    await productionConnection.close();
    return;
  }
  let createdOrUpdated = 0;
  for (const question of localQuestions) {
    const productionQuestion = normalizeQuestionForProduction(question);
    const filter = buildUpsertFilter(productionQuestion);
    await ProductionQuestion.updateOne(
      filter,
      {
        $set: productionQuestio
      },
      {
        upsert: true
      }
    );
    createdOrUpdated++;
  }
  const productionPublicCount = await ProductionQuestion.countDocuments(
    getPublicQuestionQuery()
  );
  console.log("Copied or updated:", createdOrUpdated);
  console.log("Production public question count now:", productionPublicCount);
  await localConnection.close();
  await productionConnection.close();
}
main().catch(async (err) => {
  console.error("COPY PUBLIC QUESTIONS ERROR:", err);
  process.exit(1);
});