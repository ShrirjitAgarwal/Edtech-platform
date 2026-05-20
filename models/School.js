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
    unique: true
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// PERFORMANCE INDEXES  
schoolSchema.index({ name: 1 });
schoolSchema.index({ createdAt: -1 });

module.exports = mongoose.model("School", schoolSchema);