const {
  executeCode
} = require("../executeCode");

async function expectTimeout(name, payload) {
  const startedAt = Date.now();

  try {
    await executeCode(payload);

    console.error("FAILED:", name, "did not time out");
    process.exitCode = 1;
  } catch (err) {
    const duration = Date.now() - startedAt;

    console.log("PASSED:", name);
    console.log("Error:", err.message);
    console.log("Duration:", duration + "ms");

    if (duration > 4000) {
      console.error("FAILED:", name, "took too long to stop");
      process.exitCode = 1;
    }
  }
}

async function expectSuccess(name, payload, expected) {
  try {
    const result = await executeCode(payload);

    if (String(result) !== String(expected)) {
      console.error(
        "FAILED:",
        name,
        "expected",
        expected,
        "but got",
        result
      );
      process.exitCode = 1;
      return;
    }

    console.log("PASSED:", name);
  } catch (err) {
    console.error("FAILED:", name, err.message);
    process.exitCode = 1;
  }
}

async function run() {
  await expectSuccess(
    "javascript normal execution",
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectTimeout(
    "javascript infinite loop",
    {
      language: "javascript",
      code: "function loop(){ while(true){} }",
      functionName: "loop",
      args: []
    }
  );

  await expectSuccess(
    "python normal execution",
    {
      language: "python",
      code: "def add(a, b):\n    return a + b",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectTimeout(
    "python infinite loop",
    {
      language: "python",
      code: "def loop():\n    while True:\n        pass",
      functionName: "loop",
      args: []
    }
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All runtime limit smoke tests passed");
}

run();