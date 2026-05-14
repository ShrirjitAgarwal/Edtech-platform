const mongoose = require("mongoose");
const connectDB = async () => {
  console.log("Connecting to MongoDB...");
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing from environment");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
};
module.exports = connectDB;