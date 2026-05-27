const {
  judgeSubmission
} = require("../codeJudge");

async function expectFailure(name, payload, expectedErrorPart) {
  const result = await judgeSubmission(payload);

  if (result.success !== false) {
    console.error("FAILED:", name, "expected failure");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  if (
    expectedErrorPart &&
    !String(result.error || "").includes(expectedErrorPart)
  ) {
    console.error("FAILED:", name, "wrong error");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("PASSED:", name);
}

async function expectJudgeResult(name, payload, expected) {
  const result = await judgeSubmission(payload);

  if (result.success !== expected.success) {
    console.error("FAILED:", name, "success mismatch");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  if (result.passedCount !== expected.passedCount) {
    console.error("FAILED:", name, "passedCount mismatch");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  if (result.totalCount !== expected.totalCount) {
    console.error("FAILED:", name, "totalCount mismatch");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  if (result.allPassed !== expected.allPassed) {
    console.error("FAILED:", name, "allPassed mismatch");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("PASSED:", name);
}

async function run() {
  await expectFailure(
    "empty code fails",
    {
      language: "javascript",
      code: "",
      functionName: "add",
      testCases: [
        {
          input: "1,2",
          expectedOutput: "3"
        }
      ]
    },
    "Empty code"
  );

  await expectFailure(
    "missing function name fails",
    {
      language: "javascript",
      code: "function add(a,b){ return a + b; }",
      functionName: "",
      testCases: [
        {
          input: "1,2",
          expectedOutput: "3"
        }
      ]
    },
    "Function name"
  );

  await expectFailure(
    "unsupported language fails",
    {
      language: "ruby",
      code: "def add(a,b); a+b; end",
      functionName: "add",
      testCases: [
        {
          input: "1,2",
          expectedOutput: "3"
        }
      ]
    },
    "Unsupported language"
  );

  await expectFailure(
    "missing test cases fails",
    {
      language: "javascript",
      code: "function add(a,b){ return a + b; }",
      functionName: "add",
      testCases: []
    },
    "At least one test case"
  );

  await expectFailure(
    "invalid test case fails",
    {
      language: "javascript",
      code: "function add(a,b){ return a + b; }",
      functionName: "add",
      testCases: [
        {
          input: "1,2"
        }
      ]
    },
    "Invalid test case"
  );

  await expectJudgeResult(
    "mixed pass and fail returns consistent result",
    {
      language: "javascript",
      code: "function add(a,b){ return a + b; }",
      functionName: "add",
      testCases: [
        {
          input: "1,2",
          expectedOutput: "3"
        },
        {
          input: "1,2",
          expectedOutput: "4"
        }
      ]
    },
    {
      success: true,
      passedCount: 1,
      totalCount: 2,
      allPassed: false
    }
  );

  await expectJudgeResult(
    "python judge works",
    {
      language: "python",
      code: "def add(a, b):\n    return a + b",
      functionName: "add",
      testCases: [
        {
          input: "2,3",
          expectedOutput: "5"
        }
      ]
    },
    {
      success: true,
      passedCount: 1,
      totalCount: 1,
      allPassed: true
    }
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All judge system smoke tests passed");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});