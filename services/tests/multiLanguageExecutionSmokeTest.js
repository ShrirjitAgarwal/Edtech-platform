const {
  executeCode,
  normalizeLanguage
} = require("../executeCode");
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
async function expectFailure(name, payload, expectedErrorPart) {
  try {
    await executeCode(payload);
    console.error("FAILED:", name, "did not fail");
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
function expectNormalizedLanguage(input, expected) {
  const actual = normalizeLanguage(input);
  if (actual !== expected) {
    console.error(
      "FAILED:",
      "normalizeLanguage " + input,
      "expected",
      expected,
      "but got",
      actual
    );
    process.exitCode = 1;
    return;
  }
  console.log("PASSED:", "normalizeLanguage " + input);
}
async function run() {
  expectNormalizedLanguage("javascript", "javascript");
  expectNormalizedLanguage("js", "javascript");
  expectNormalizedLanguage("python", "python");
  expectNormalizedLanguage("py", "python");
  await expectSuccess(
    "javascript execution",
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    5
  );
  await expectSuccess(
    "javascript alias execution",
    {
      language: "js",
      code: "function multiply(a, b){ return a * b; }",
      functionName: "multiply",
      args: [4, 5]
    },
    20
  );
  await expectSuccess(
    "python execution",
    {
      language: "python",
      code: "def add(a, b):\n    return a + b",
      functionName: "add",
      args: [2, 3]
    },
    5
  );
  await expectSuccess(
    "python alias execution",
    {
      language: "py",
      code: "def multiply(a, b):\n    return a * b",
      functionName: "multiply",
      args: [4, 5]
    },
    20
  );
  await expectFailure(
    "unsupported language rejected",
    {
      language: "ruby",
      code: "def add(a,b); a+b; end",
      functionName: "add",
      args: [1, 2]
    },
    "Unsupported language"
  );
  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log("All multi-language execution smoke tests passed");
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});