const {
  runJavaScriptCode
} = require("./runners/javascriptRunner");
const {
  runPythonCode
} = require("./runners/pythonRunner");
const {
  EXECUTION_LIMITS
} = require("./config/executionLimits");
const {
  getJudgeProvider,
  assertProviderAllowed
} = require("./config/judgeProvider");
const {
  runJudge0Code
} = require("./runners/judge0Runner");
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
function getPayloadSize(value) {
  try {
    return Buffer.byteLength(
      JSON.stringify(value || []),
      "utf8"
    );
  } catch (err) {
    return Infinity;
  }
}
async function executeCode({
  language,
  code,
  functionName,
  args
}) {
  const normalizedLanguage =
    normalizeLanguage(language);
      const safeCode = String(code || "");
  const safeFunctionName = String(functionName || "").trim();

  if (
    !EXECUTION_LIMITS.SUPPORTED_LANGUAGES.includes(
      normalizedLanguage
    )
  ) {
    throw new Error(
      "Unsupported language: " +
      normalizedLanguage
    );
  }

  if (!safeCode.trim()) {
    throw new Error("Empty code submission");
  }

  if (
    safeCode.length >
    EXECUTION_LIMITS.MAX_CODE_LENGTH
  ) {
    throw new Error("Code exceeds limit");
  }

  if (!safeFunctionName) {
    throw new Error("Function name is required");
  }

  if (
    getPayloadSize(args) >
    EXECUTION_LIMITS.MAX_ARGS_PAYLOAD_BYTES
  ) {
    throw new Error("Input payload exceeds limit");
  }
  const provider = getJudgeProvider();

  assertProviderAllowed(provider);

  if (provider === "judge0") {
    return runJudge0Code({
      language: normalizedLanguage,
      code: safeCode,
      functionName: safeFunctionName,
      args
    });
  }

  if (provider !== "local") {
    throw new Error(
      "Unsupported judge provider: " +
      provider
    );
  }

  if (normalizedLanguage === "javascript") {
    return runJavaScriptCode({
      code: safeCode,
      functionName: safeFunctionName,
      args
    });
  }

  if (normalizedLanguage === "python") {
    return runPythonCode({
      code: safeCode,
      functionName: safeFunctionName,
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