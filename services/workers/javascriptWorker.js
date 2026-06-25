const vm = require("vm");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");

function buildWiredSandbox(logs) {
  function capture(prefix, args) {
    const parts = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === null) { parts.push("null"); continue; }
      if (a === undefined) { parts.push("undefined"); continue; }
      if (typeof a === "object") {
        try { parts.push(JSON.stringify(a)); } catch(e) { parts.push(String(a)); }
        continue;
      }
      parts.push(String(a));
    }
    logs.push(prefix + parts.join(" "));
  }
  return Object.create(null, {
    console: {
      value: Object.freeze({
        log:   function() { capture("", Array.from(arguments)); },
        warn:  function() { capture("[warn] ", Array.from(arguments)); },
        error: function() { capture("[error] ", Array.from(arguments)); }
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

function runJavaScriptCode({ code, functionName, args }, logs) {
  validateJavaScriptCode(code);
  const sandbox = buildWiredSandbox(logs);
  vm.createContext(sandbox);

  try {
    vm.runInContext(String(code || ""), sandbox, { timeout: EXECUTION_LIMITS.VM_TIMEOUT_MS });
  } catch (err) {
    const e = new Error(err.message);
    e.logs = logs.slice();
    throw e;
  }

  let executableFunction = sandbox[functionName];
  if (typeof executableFunction !== "function") {
    const matchedKey = Object.keys(sandbox).find(key =>
      String(key).toLowerCase() === String(functionName).toLowerCase()
    );
    if (matchedKey) executableFunction = sandbox[matchedKey];
  }
  if (typeof executableFunction !== "function") {
    const e = new Error("Function not found");
    e.logs = logs.slice();
    throw e;
  }

  sandbox.__studentArgs = args;
  sandbox.__studentFunction = executableFunction;
  try {
    vm.runInContext(
      "__studentResult = __studentFunction(...__studentArgs)",
      sandbox,
      { timeout: EXECUTION_LIMITS.VM_TIMEOUT_MS }
    );
  } catch (err) {
    const e = new Error(err.message);
    e.logs = logs.slice();
    throw e;
  }

  const result = sandbox.__studentResult;
  delete sandbox.__studentArgs;
  delete sandbox.__studentFunction;
  delete sandbox.__studentResult;
  return result;
}

process.on("message", (payload) => {
  const logs = [];
  try {
    const result = runJavaScriptCode(payload, logs);
    if (process.send) {
      process.send({ ok: true, result, logs });
    }
  } catch (err) {
    if (process.send) {
      process.send({ ok: false, error: err.message, logs: err.logs || logs });
    }
  }
});
