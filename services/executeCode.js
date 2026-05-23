const {
  runJavaScriptCode
} = require("./runners/javascriptRunner");

const {
  runPythonCode
} = require("./runners/pythonRunner");

function normalizeLanguage(language) {
  const value = String(language || "javascript")
    .trim()
    .toLowerCase();

  if (
    value === "js" ||
    value === "javascript"
  ) {
    return "javascript";
  }

  if (
    value === "py" ||
    value === "python"
  ) {
    return "python";
  }

  return value;
}

async function executeCode({
  language,
  code,
  functionName,
  args
}) {
  const normalizedLanguage =
    normalizeLanguage(language);

if (normalizedLanguage === "javascript") {
  return runJavaScriptCode({
    code,
    functionName,
    args
  });
}

if (normalizedLanguage === "python") {
  return runPythonCode({
    code,
    functionName,
    args
  });
}

throw new Error(
  "Unsupported language: " +
  normalizedLanguage
);
}

module.exports = {
  executeCode,
  normalizeLanguage
};