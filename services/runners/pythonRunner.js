const path = require("path");
const { fork } = require("child_process");
const {
  executionQueue
} = require("../queue/executionQueue");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
function runPythonCode({
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
        "pythonWorker.js"
      );
      const child = fork(workerPath, [], {
        stdio: [
          "ignore",
          "ignore",
          "ignore",
          "ipc"
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
          new Error("Python execution timed out")
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
          resolve(message.result);
        } else {
          reject(
            new Error(
              message.error ||
              "Python execution failed"
            )
          );
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
            "Python worker exited with code " +
            code
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
  runPythonCode
};