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
function runJavaScriptCode({
  code,
  functionName,
  args
}) {
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