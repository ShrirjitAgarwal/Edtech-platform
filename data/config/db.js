const mongoose = require("mongoose");

function getSafeMongoInfo(uri) {
  try {
    const parsedUrl = new URL(uri);
    const databaseName = parsedUrl.pathname.replace("/", "") || "unknown";

    return {
      host: parsedUrl.hostname,
      databaseName
    };
  } catch (err) {
    return {
      host: "unknown",
      databaseName: "unknown"
    };
  }
}

const connectDB = async () => {
  console.log("Connecting to MongoDB...");

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing from environment");
    }

    const mongoInfo = getSafeMongoInfo(process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    console.log(
      "MongoDB Connected:",
      mongoInfo.host + "/" + mongoInfo.databaseName
    );
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;