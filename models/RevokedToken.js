const mongoose = require("mongoose");
const revokedTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  role: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: {
      expires: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model("RevokedToken", revokedTokenSchema);