const path = require("path");
const { fork } = require("child_process");
const {
  executionQueue
} = require("../queue/executionQueue");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
function runJavaScriptCode({
  code,
  functionName,
  args
}) {
  return executionQueue.add(() =>
    new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      "..",
      "workers",
      "javascriptWorker.js"
    );
    const child = fork(workerPath, [], {
      stdio: [
        "ignore",
        "ignore",
        "ignore",
        "ipc"
      ],
      execArgv: [
        "--max-old-space-size=" + EXECUTION_LIMITS.JAVASCRIPT_MEMORY_MB
      ]
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error("Execution timed out")
      );
    }, EXECUTION_LIMITS.WORKER_TIMEOUT_MS);
    child.on("message", (message) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (message.ok) {
        resolve({ result: message.result, logs: message.logs || [] });
      } else {
        const err = new Error(message.error || "Execution failed");
        err.logs = message.logs || [];
        reject(err);
      }
    });
    child.on("error", (err) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          "Worker exited with code " + code
        )
      );
    });
    child.send({
      code,
      functionName,
      args
    });
  })
  );
}
module.exports = {
  runJavaScriptCode
};