const mongoose = require("mongoose");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.local";
require("dotenv").config({
  path: envFile
});
const connectDB = require("../data/config/db");
const Question = require("../models/Question");
const ImportBatch = require("../models/ImportBatch");
function getImportBatchId() {
  const importBatchId = String(process.argv[2] || "").trim();
  if (!importBatchId) {
    throw new Error(
      "Import batch id is required. Example: node scripts/rollbackImportBatch.js 665abc..."
    );
  }
  if (!mongoose.Types.ObjectId.isValid(importBatchId)) {
    throw new Error("Invalid import batch id");
  }
  return importBatchId;
}
function requireRollbackConfirmation({
  nodeEnv,
  importBatchId
}) {
  if (nodeEnv === "production") {
    if (process.env.CONFIRM_PRODUCTION_IMPORT_ROLLBACK !== importBatchId) {
      throw new Error(
        "Production rollback blocked. Set CONFIRM_PRODUCTION_IMPORT_ROLLBACK=" +
        importBatchId +
        " to continue."
      );
    }
    return;
  }
  if (process.env.CONFIRM_IMPORT_ROLLBACK !== importBatchId) {
    throw new Error(
      "Rollback blocked. Set CONFIRM_IMPORT_ROLLBACK=" +
      importBatchId +
      " to continue."
    );
  }
}
async function main() {
  const nodeEnv = process.env.NODE_ENV || "local";
  const importBatchId = getImportBatchId();
  requireRollbackConfirmation({
    nodeEnv,
    importBatchId
  });
  await connectDB();
  const importBatch = await ImportBatch.findById(importBatchId);
  if (!importBatch) {
    throw new Error("Import batch not found");
  }
  if (importBatch.status === "rolled_back") {
    throw new Error("Import batch already rolled back");
  }
  const matchingQuestionCount = await Question.countDocuments({
    importBatchId
  });
  console.log("Starting import rollback");
  console.log("Environment:", nodeEnv);
  console.log("Import batch:", importBatchId);
  console.log("Batch status:", importBatch.status);
  console.log("Questions to delete:", matchingQuestionCount);
  if (matchingQuestionCount === 0) {
    importBatch.status = "rolled_back";
    importBatch.rolledBackAt = new Date();
    importBatch.rolledBackCount = 0;
    await importBatch.save();
    console.log("No questions found for this import batch.");
    await mongoose.disconnect();
    return;
  }
  const deleteResult = await Question.deleteMany({
    importBatchId
  });
  importBatch.status = "rolled_back";
  importBatch.rolledBackAt = new Date();
  importBatch.rolledBackCount = deleteResult.deletedCount || 0;
  await importBatch.save();
  console.log("Import rollback completed");
  console.log("Deleted questions:", deleteResult.deletedCount || 0);
  await mongoose.disconnect();
}
main().catch(async err => {
  console.error("Rollback failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectErr) {
    // ignore disconnect error
  }
  process.exit(1);
});