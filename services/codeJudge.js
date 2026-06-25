const {
  executeCode
} = require("./executeCode");
const {
  EXECUTION_LIMITS
} = require("./config/executionLimits");
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
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object") {
    return stableStringify(value);
  }
  return String(value).trim();
}
function tryParseComparableValue(value) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }
  if (trimmed === "undefined") {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    if (!Number.isNaN(Number(trimmed))) {
      return Number(trimmed);
    }
    if (trimmed.toLowerCase() === "true") {
      return true;
    }
    if (trimmed.toLowerCase() === "false") {
      return false;
    }
    return trimmed;
  }
}
function stableStringify(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(item => stableStringify(item)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map(key =>
      JSON.stringify(key) + ":" + stableStringify(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}
function valuesEqual(actual, expected) {
  const actualValue = tryParseComparableValue(actual);
  const expectedValue = tryParseComparableValue(expected);
  if (
    typeof actualValue === "number" &&
    typeof expectedValue === "number"
  ) {
    return Object.is(actualValue, expectedValue);
  }
  if (
    typeof actualValue === "boolean" ||
    typeof expectedValue === "boolean"
  ) {
    return actualValue === expectedValue;
  }
  if (
    actualValue === null ||
    expectedValue === null ||
    actualValue === undefined ||
    expectedValue === undefined
  ) {
    return actualValue === expectedValue;
  }
  if (
    typeof actualValue === "object" &&
    typeof expectedValue === "object"
  ) {
    return stableStringify(actualValue) === stableStringify(expectedValue);
  }
  return String(actualValue).trim() === String(expectedValue).trim();
}
function buildJudgeFailure(error) {
  return {
    success: false,
    error,
    passedCount: 0,
    totalCount: 0,
    allPassed: false,
    testResults: []
  };
}
function isValidTestCase(testCase) {
  return (
    testCase &&
    typeof testCase === "object" &&
    Object.prototype.hasOwnProperty.call(testCase, "expectedOutput")
  );
}
function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases)) {
    return {
      ok: false,
      error: "Test cases must be an array",
      testCases: []
    };
  }
  if (testCases.length === 0) {
    return {
      ok: false,
      error: "At least one test case is required",
      testCases: []
    };
  }
  const limitedTestCases = testCases.slice(
    0,
    EXECUTION_LIMITS.MAX_TEST_CASES
  );
  const invalidIndex = limitedTestCases.findIndex(
    testCase => !isValidTestCase(testCase)
  );
  if (invalidIndex !== -1) {
    return {
      ok: false,
      error: "Invalid test case at index " + invalidIndex,
      testCases: []
    };
  }
  return {
    ok: true,
    error: null,
    testCases: limitedTestCases
  };
}
async function judgeSubmission({
  code,
  functionName,
  testCases,
  language = "javascript"
}) {
  const safeCode = String(code || "");
  const safeFunctionName = String(functionName || "").trim();
  const safeLanguage = String(language || "javascript").trim().toLowerCase();
  if (!safeCode.trim()) {
    return buildJudgeFailure("Empty code submission");
  }
  if (safeCode.length > EXECUTION_LIMITS.MAX_CODE_LENGTH) {
    return buildJudgeFailure("Code exceeds limit");
  }
  if (!safeFunctionName) {
    return buildJudgeFailure("Function name is required");
  }
  if (!EXECUTION_LIMITS.SUPPORTED_LANGUAGES.includes(safeLanguage)) {
    return buildJudgeFailure("Unsupported language: " + safeLanguage);
  }
  const normalizedTestCases = normalizeTestCases(testCases);
  if (!normalizedTestCases.ok) {
    return buildJudgeFailure(normalizedTestCases.error);
  }
  const safeTestCases = normalizedTestCases.testCases;
  const testResults = [];
  let passedCount = 0;
  for (let index = 0; index < safeTestCases.length; index++) {
    const tc = safeTestCases[index];
    const args = parseArgs(tc.input);
    let passed = false;
    let actualOutput = "";
    let expectedOutput = normalizeOutput(tc.expectedOutput);
    let executionError = null;
    let consoleLogs = [];
    try {
      const { result, logs } = await executeCode({
        language: safeLanguage,
        code: safeCode,
        functionName: safeFunctionName,
        args
      });
      consoleLogs = Array.isArray(logs) ? logs : [];
      actualOutput = normalizeOutput(result);
      passed = valuesEqual(
        actualOutput,
        expectedOutput
      );
      if (passed) {
        passedCount++;
      }
    } catch (err) {
      executionError = err.message;
      consoleLogs = Array.isArray(err.logs) ? err.logs : [];
    }
    testResults.push({
      index,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      normalizedExpectedOutput: expectedOutput,
      actualOutput,
      passed,
      error: executionError,
      logs: consoleLogs,
      isHidden: !!tc.isHidden
    });
  }
  return {
    success: true,
    error: null,
    passedCount,
    totalCount: safeTestCases.length,
    allPassed: passedCount === safeTestCases.length,
    testResults
  };
}
module.exports = {
  judgeSubmission,
  runJavaScriptSubmission: judgeSubmission
};