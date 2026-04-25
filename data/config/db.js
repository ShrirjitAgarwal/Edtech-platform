const mongoose = require("mongoose");

const connectDB = async () => {
  console.log("Connecting to MongoDB...");   // 👈 ADD THIS

  try {
    await mongoose.connect("mongodb+srv://admin:Jordan%401996@shrirjitcluster.bhvvps6.mongodb.net/?retryWrites=true&w=majority");

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Error:", err.message);
  }
};

module.exports = connectDB;