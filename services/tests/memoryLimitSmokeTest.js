const {
  executeCode
} = require("../executeCode");

async function expectFailure(name, payload) {
  try {
    await executeCode(payload);

    console.error("FAILED:", name, "did not fail");
    process.exitCode = 1;
  } catch (err) {
    console.log("PASSED:", name);
    console.log("Error:", err.message);
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
    "javascript normal memory usage",
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectFailure(
    "javascript excessive memory usage",
    {
      language: "javascript",
      code: "function memory(){ const items = []; while(true){ items.push(new Array(1000000).fill('x')); } }",
      functionName: "memory",
      args: []
    }
  );

  await expectSuccess(
    "python normal memory usage",
    {
      language: "python",
      code: "def add(a, b):\n    return a + b",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectFailure(
    "python excessive memory usage",
    {
      language: "python",
      code: "def memory():\n    items = []\n    while True:\n        items.append('x' * 1000000)",
      functionName: "memory",
      args: []
    }
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All memory limit smoke tests passed");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});