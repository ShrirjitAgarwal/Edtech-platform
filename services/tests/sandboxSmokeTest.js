const {
  executeCode
} = require("../executeCode");

async function expectBlocked(name, payload, expectedErrorPart) {
  try {
    await executeCode(payload);

    console.error("FAILED:", name, "was not blocked");
    process.exitCode = 1;
  } catch (err) {
    const message = String(err.message || "");

    if (
      expectedErrorPart &&
      !message.includes(expectedErrorPart)
    ) {
      console.error("FAILED:", name, "wrong error:", message);
      process.exitCode = 1;
      return;
    }

    console.log("PASSED:", name);
    console.log("Error:", message);
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
    "javascript normal code still works",
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectBlocked(
    "javascript require blocked",
    {
      language: "javascript",
      code: "function bad(){ return require('fs'); }",
      functionName: "bad",
      args: []
    },
    "blocked JavaScript"
  );

  await expectBlocked(
    "javascript process blocked",
    {
      language: "javascript",
      code: "function bad(){ return process.env; }",
      functionName: "bad",
      args: []
    },
    "blocked JavaScript"
  );

  await expectSuccess(
    "python normal code still works",
    {
      language: "python",
      code: "def add(a, b):\n    return a + b",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectBlocked(
    "python os import blocked",
    {
      language: "python",
      code: "import os\ndef bad():\n    return os.listdir('.')",
      functionName: "bad",
      args: []
    },
    "blocked Python"
  );

  await expectBlocked(
    "python open blocked",
    {
      language: "python",
      code: "def bad():\n    return open('/etc/passwd').read()",
      functionName: "bad",
      args: []
    },
    "blocked Python"
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All sandbox smoke tests passed");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});