const {
  executeCode
} = require("./executeCode");
const MAX_CODE_LENGTH = 10000;
const EXECUTION_TIMEOUT = 1000;
const MAX_TEST_CASES = 20;
function parseInputValue(value) {
  const trimmed = String(value || "").trim();
  if (trimmed === "") {
    return "";
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    if (!isNaN(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  }
}
function parseArgs(rawInput) {
  const input = String(rawInput || "").trim();
  if (input === "") {
    return [];
  }
  if (
    input.startsWith("[") &&
    input.endsWith("]")
  ) {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed)
        ? [parsed]
        : [parsed];
    } catch (err) {
      return [input];
    }
  }
  return input
    .split(",")
    .map(value => parseInputValue(value));
}
function normalizeOutput(value) {
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value).trim();
}
function buildSandbox() {
  return {
    console: {
      log: function () { },
      error: function () { },
      warn: function () { }
    }
  };
}
async function runJavaScriptSubmission({
  code,
  functionName,
  testCases
}) {
  const safeCode = String(code || "");
  if (!safeCode.trim()) {
    return {
      success: false,
      error: "Empty code submission",
      passedCount: 0,
      totalCount: 0,
      testResults: []
    };
  }
  if (safeCode.length > MAX_CODE_LENGTH) {
    return {
      success: false,
      error: "Code exceeds limit",
      passedCount: 0,
      totalCount: 0,
      testResults: []
    };
  }
  const safeTestCases = Array.isArray(testCases)
    ? testCases.slice(0, MAX_TEST_CASES)
    : [];
  const testResults = [];
  let passedCount = 0;
  for (const tc of safeTestCases) {
    const args = parseArgs(tc.input);
    let passed = false;
    let actualOutput = "";
    let executionError = null;
    try {
const result = await executeCode({
  language: "javascript",
  code: safeCode,
  functionName,
  args
});
actualOutput = normalizeOutput(result);
      const expectedOutput =
        String(
          tc.expectedOutput || ""
        ).trim();
      passed =
        actualOutput === expectedOutput;
      if (passed) {
        passedCount++;
      }
    } catch (err) {
      executionError = err.message;
    }
    testResults.push({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput,
      passed,
      error: executionError
    });
  }
  return {
    success: true,
    passedCount,
    totalCount: safeTestCases.length,
    allPassed:
      passedCount === safeTestCases.length,
    testResults
  };
}
module.exports = {
  runJavaScriptSubmission
};