const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  // Commercial plan fields
  plan: {
    type: String,
    enum: ["trial", "starter", "growth", "enterprise"],
    default: "trial"
  },
  billingStatus: {
    type: String,
    enum: ["trial", "active", "past_due", "paused", "cancelled"],
    default: "trial"
  },
  trialStartsAt: {
    type: Date,
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  subscriptionStartsAt: {
    type: Date,
    default: null
  },
  subscriptionEndsAt: {
    type: Date,
    default: null
  },

  // Commercial limits
  maxAdmins: {
    type: Number,
    default: 2,
    min: 0
  },
  maxTeachers: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStudents: {
    type: Number,
    default: 200,
    min: 0
  },
  maxTests: {
    type: Number,
    default: 100,
    min: 0
  },
  maxAssignments: {
    type: Number,
    default: 500,
    min: 0
  },
  maxMonthlyCodeRuns: {
    type: Number,
    default: 1000,
    min: 0
  },

  // Feature flags
  featuresEnabled: {
    codingQuestions: {
      type: Boolean,
      default: true
    },
    bulkStudentImport: {
      type: Boolean,
      default: true
    },
    reportDownloads: {
      type: Boolean,
      default: true
    },
    publicQuestionLibrary: {
      type: Boolean,
      default: true
    }
  },

  // Enforcement flags remain off by default for safety.
  // This means existing and new schools will not be blocked yet.
  limitEnforcement: {
    enforceAdminLimit: {
      type: Boolean,
      default: false
    },
    enforceStudentLimit: {
      type: Boolean,
      default: false
    },
    enforceTeacherLimit: {
      type: Boolean,
      default: false
    },
    enforceCodeRunLimit: {
      type: Boolean,
      default: false
    },
    enforceTestLimit: {
      type: Boolean,
      default: false
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// PERFORMANCE INDEXES
schoolSchema.index({ name: 1 });
schoolSchema.index({ status: 1 });
schoolSchema.index({ plan: 1 });
schoolSchema.index({ billingStatus: 1 });
schoolSchema.index({ trialEndsAt: 1 });
schoolSchema.index({ subscriptionEndsAt: 1 });
schoolSchema.index({ createdAt: -1 });

module.exports = mongoose.model("School", schoolSchema);
