const mongoose = require("mongoose");
const importBatchSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["question_import"],
    required: true
  },
  source: {
    type: String,
    default: "unknown"
  },
  fileName: {
    type: String,
    default: ""
  },
  filePath: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: [
      "started",
      "failed_validation",
      "completed",
      "failed",
      "rolled_back"
    ],
    default: "started"
  },
  parsedCount: {
    type: Number,
    default: 0
  },
  insertedCount: {
    type: Number,
    default: 0
  },
  skippedDuplicateCount: {
    type: Number,
    default: 0
  },
  failedRowCount: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: ""
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  finishedAt: {
    type: Date,
    default: null
  },
  rolledBackAt: {
    type: Date,
    default: null
  },
  rolledBackCount: {
    type: Number,
    default: 0
  }
});
importBatchSchema.index({ type: 1 });
importBatchSchema.index({ status: 1 });
importBatchSchema.index({ startedAt: -1 });
module.exports = mongoose.model("ImportBatch", importBatchSchema);