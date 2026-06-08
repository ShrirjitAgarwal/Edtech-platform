const {
  execFile
} = require("child_process");
const fs = require("fs");
const path = require("path");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.local";
require("dotenv").config({
  path: envFile
});
function getDatabaseName(uri) {
  try {
    const parsedUrl = new URL(uri);
    return parsedUrl.pathname.replace("/", "").trim();
  } catch (err) {
    return "";
  }
}
function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}
function runMongoDump({
  mongoUri,
  outputDir
}) {
  return new Promise((resolve, reject) => {
    execFile(
      "mongodump",
      [
        "--uri",
        mongoUri,
        "--out",
        outputDir
      ],
      {
        maxBuffer: 1024 * 1024 * 20
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new Error(
              stderr ||
              err.message ||
              "mongodump failed"
            )
          );
          return;
        }
        resolve({
          stdout,
          stderr
        });
      }
    );
  });
}
async function main() {
  const mongoUri = String(process.env.MONGO_URI || "").trim();
  if (!mongoUri) {
    throw new Error("MONGO_URI missing");
  }
  const databaseName = getDatabaseName(mongoUri);
  if (!databaseName) {
    throw new Error("Could not detect MongoDB database name");
  }
  const timestamp = getTimestamp();
  const backupRoot = path.join(
    process.cwd(),
    "backups"
  );
  const outputDir = path.join(
    backupRoot,
    databaseName + "-" + timestamp
  );
  fs.mkdirSync(outputDir, {
    recursive: true
  });
  console.log("Starting MongoDB backup");
  console.log("Environment:", process.env.NODE_ENV || "local");
  console.log("Database:", databaseName);
  console.log("Output:", outputDir);
  await runMongoDump({
    mongoUri,
    outputDir
  });
  console.log("MongoDB backup completed");
  console.log("Backup folder:", outputDir);
}
main().catch(err => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});