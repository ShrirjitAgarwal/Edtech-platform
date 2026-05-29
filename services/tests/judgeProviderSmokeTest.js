const {
  executeCode
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

async function expectFailure(name, env, payload, expectedErrorPart) {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    JUDGE_PROVIDER: process.env.JUDGE_PROVIDER,
    LOCAL_CODE_EXECUTION_ENABLED:
      process.env.LOCAL_CODE_EXECUTION_ENABLED,
    JUDGE0_API_URL: process.env.JUDGE0_API_URL
  };

  Object.assign(process.env, env);

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
  } finally {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.JUDGE_PROVIDER = originalEnv.JUDGE_PROVIDER;
    process.env.LOCAL_CODE_EXECUTION_ENABLED =
      originalEnv.LOCAL_CODE_EXECUTION_ENABLED;
    process.env.JUDGE0_API_URL = originalEnv.JUDGE0_API_URL;
  }
}

async function run() {
  process.env.JUDGE_PROVIDER = "local";
  process.env.LOCAL_CODE_EXECUTION_ENABLED = "true";

  await expectSuccess(
    "local provider still works",
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    5
  );

  await expectFailure(
    "production blocks local execution",
    {
      NODE_ENV: "production",
      JUDGE_PROVIDER: "local",
      LOCAL_CODE_EXECUTION_ENABLED: "false"
    },
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    "Local code execution is disabled"
  );

  await expectFailure(
    "judge0 provider requires api url",
    {
      NODE_ENV: "production",
      JUDGE_PROVIDER: "judge0",
      LOCAL_CODE_EXECUTION_ENABLED: "false",
      JUDGE0_API_URL: ""
    },
    {
      language: "javascript",
      code: "function add(a, b){ return a + b; }",
      functionName: "add",
      args: [2, 3]
    },
    "Judge0 API URL is required"
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All judge provider smoke tests passed");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});