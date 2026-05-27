const vm = require("vm");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
function buildSandbox() {
  return Object.create(null, {
    console: {
      value: Object.freeze({
        log: function () {},
        error: function () {},
        warn: function () {}
      }),
      enumerable: true
    }
  });
}
const BLOCKED_JS_PATTERNS = [
  /\brequire\s*\(/,
  /\bprocess\b/,
  /\bglobal\b/,
  /\bglobalThis\b/,
  /\bFunction\s*\(/,
  /\beval\s*\(/,
  /\bconstructor\b/,
  /\bmodule\b/,
  /\bexports\b/,
  /\bBuffer\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bsetImmediate\b/,
  /\bPromise\b/,
  /\bWebAssembly\b/,
  /\bimport\s*\(/,
  /\bwhile\s*\(\s*true\s*\)/
];

function validateJavaScriptCode(code) {
  const safeCode = String(code || "");

  if (!safeCode.trim()) {
    throw new Error("Empty code submission");
  }

  if (safeCode.length > EXECUTION_LIMITS.MAX_CODE_LENGTH) {
    throw new Error("Code exceeds limit");
  }

  for (const pattern of BLOCKED_JS_PATTERNS) {
    if (pattern.test(safeCode)) {
      throw new Error("Code uses blocked JavaScript features");
    }
  }
}
function runJavaScriptCode({
code,
functionName,
args
}) {
validateJavaScriptCode(code);
const sandbox = buildSandbox();
  vm.createContext(sandbox);
  vm.runInContext(
    String(code || ""),
    sandbox,
    {
      timeout: EXECUTION_LIMITS.VM_TIMEOUT_MS
    }
  );
  let executableFunction =
    sandbox[functionName];
  if (
    typeof executableFunction !== "function"
  ) {
    const matchedKey =
      Object.keys(sandbox).find(key =>
        String(key).toLowerCase() ===
        String(functionName).toLowerCase()
      );
    if (matchedKey) {
      executableFunction =
        sandbox[matchedKey];
    }
  }
  if (
    typeof executableFunction !== "function"
  ) {
    throw new Error("Function not found");
  }
  sandbox.__studentArgs = args;
  sandbox.__studentFunction =
    executableFunction;
  vm.runInContext(
    "__studentResult = __studentFunction(...__studentArgs)",
    sandbox,
    {
      timeout: EXECUTION_LIMITS.VM_TIMEOUT_MS
    }
  );
  const result = sandbox.__studentResult;
  delete sandbox.__studentArgs;
  delete sandbox.__studentFunction;
  delete sandbox.__studentResult;
  return result;
}
process.on("message", (payload) => {
  try {
    const result = runJavaScriptCode(payload);
    if (process.send) {
      process.send({
        ok: true,
        result
      });
    }
  } catch (err) {
    if (process.send) {
      process.send({
        ok: false,
        error: err.message
      });
    }
  }
});