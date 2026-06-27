const mongoose = require("mongoose");
const testCaseSchema = new mongoose.Schema({
  input: String,
  expectedOutput: String,
  isHidden: {
    type: Boolean,
    default: false
  }
});
const questionSchema = new mongoose.Schema({
  legacyId: Number,
importKey: {
type: String,
default: null
},
importBatchId: {
type: mongoose.Schema.Types.ObjectId,
ref: "ImportBatch",
default: null
},
importSource: {
type: String,
default: null
},
importedAt: {
type: Date,
default: null
},
type: {
  type: String,
  enum: ["mcq", "coding", "written"],
  default: "mcq"
},
  scope: {
    type: String,
    enum: ["public", "teacher"],
    default: "public"
  },
  teacherId: {
    type: String,
    default: null
  },
  schoolId: {
    type: String,
    default: null
  },
  schoolCode: {
  type: String,
  default: null
},
  question: String,
  options: {
    type: [String],
    default: []
  },
  correct: {
  type: mongoose.Schema.Types.Mixed,
  default: null
},
correctAnswers: {
  type: [String],
  default: []
},
  subject: String,
  board: String,
  difficulty: String,
  category: String,
  testCases: {
    type: [testCaseSchema],
    default: []
  },
  codingMeta: {
  language: {
    type: String,
    default: "javascript"
  },
  starterCode: {
    type: String,
    default: ""
  },
  functionName: {
    type: String,
    default: ""
  }
},
  analytics: {
    attempted: {
      type: Number,
      default: 0
    },
    correct: {
      type: Number,
      default: 0
    },
    incorrect: {
      type: Number,
      default: 0
    }
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
questionSchema.index({ scope: 1 });
questionSchema.index({ teacherId: 1 });
questionSchema.index({ subject: 1 });
questionSchema.index({ board: 1 });
questionSchema.index({ type: 1 });
questionSchema.index({ legacyId: 1 });
questionSchema.index({ importKey: 1 });
questionSchema.index({ importBatchId: 1 });
questionSchema.index({ importSource: 1 });
// PERFORMANCE INDEXES
questionSchema.index({ scope: 1, teacherId: 1 });
questionSchema.index({ subject: 1, board: 1 });
questionSchema.index({ subject: 1, difficulty: 1 });
questionSchema.index({ scope: 1, subject: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ scope: 1, createdAt: -1 });
questionSchema.index({ scope: 1, teacherId: 1, createdAt: -1 });
questionSchema.index({ teacherId: 1, createdAt: -1 });
questionSchema.index({ schoolId: 1 });
questionSchema.index({ schoolId: 1, teacherId: 1 });
questionSchema.index({ schoolId: 1, subject: 1 });
questionSchema.index({ tags: 1 });
module.exports = mongoose.model("Question", questionSchema);