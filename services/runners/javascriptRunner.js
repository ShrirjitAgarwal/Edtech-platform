const path = require("path");
const { fork } = require("child_process");
const {
  executionQueue
} = require("../queue/executionQueue");

const WORKER_TIMEOUT = 1500;
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
        "--max-old-space-size=64"
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
    }, WORKER_TIMEOUT);

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
            message.error || "Execution failed"
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