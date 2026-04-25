const fs = require("fs");
const path = require("path");

// ensures all paths are relative to project root
function getPath(file) {
  return path.join(__dirname, "..", file);
}

function readJSON(file, fallback = []) {
  try {
    const fullPath = getPath(file);
    return JSON.parse(fs.readFileSync(fullPath, "utf-8") || "[]");
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  const fullPath = getPath(file);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

module.exports = { readJSON, writeJSON };