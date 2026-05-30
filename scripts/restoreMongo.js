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

function runMongoRestore({
  mongoUri,
  backupPath
}) {
  return new Promise((resolve, reject) => {
    execFile(
      "mongorestore",
      [
        "--uri",
        mongoUri,
        "--drop",
        backupPath
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
              "mongorestore failed"
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

function requireRestoreConfirmation({
  nodeEnv,
  databaseName
}) {
  if (nodeEnv === "production") {
    if (process.env.CONFIRM_PRODUCTION_RESTORE !== databaseName) {
      throw new Error(
        "Production restore blocked. Set CONFIRM_PRODUCTION_RESTORE=" +
        databaseName +
        " to continue."
      );
    }
  }

  if (
    nodeEnv !== "production" &&
    process.env.CONFIRM_RESTORE !== databaseName
  ) {
    throw new Error(
      "Restore blocked. Set CONFIRM_RESTORE=" +
      databaseName +
      " to continue."
    );
  }
}

function getBackupPath() {
  const inputPath = String(process.argv[2] || "").trim();

  if (!inputPath) {
    throw new Error(
      "Backup path is required. Example: node scripts/restoreMongo.js backups/edtech_local-2026..."
    );
  }

  const backupPath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(backupPath)) {
    throw new Error("Backup path does not exist: " + backupPath);
  }

  return backupPath;
}

async function main() {
  const nodeEnv = process.env.NODE_ENV || "local";
  const mongoUri = String(process.env.MONGO_URI || "").trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI missing");
  }

  const databaseName = getDatabaseName(mongoUri);

  if (!databaseName) {
    throw new Error("Could not detect MongoDB database name");
  }

  const backupPath = getBackupPath();

  requireRestoreConfirmation({
    nodeEnv,
    databaseName
  });

  console.log("Starting MongoDB restore");
  console.log("Environment:", nodeEnv);
  console.log("Target database:", databaseName);
  console.log("Backup path:", backupPath);
  console.log("WARNING: --drop is enabled. Existing matching collections will be replaced.");

  await runMongoRestore({
    mongoUri,
    backupPath
  });

  console.log("MongoDB restore completed");
}

main().catch(err => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});