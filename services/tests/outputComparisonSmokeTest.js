const {
  judgeSubmission
} = require("../codeJudge");

async function expectPass(name, payload) {
  const result = await judgeSubmission(payload);

  if (!result.allPassed) {
    console.error("FAILED:", name);
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("PASSED:", name);
}

async function expectFail(name, payload) {
  const result = await judgeSubmission(payload);

  if (result.allPassed) {
    console.error("FAILED:", name, "should not have passed");
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("PASSED:", name);
}

async function run() {
  await expectPass(
    "number comparison",
    {
      language: "javascript",
      code: "function answer(){ return 5; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "5"
        }
      ]
    }
  );

  await expectPass(
    "array comparison",
    {
      language: "javascript",
      code: "function answer(){ return [1,2,3]; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "[1,2,3]"
        }
      ]
    }
  );

  await expectPass(
    "object comparison ignores key order",
    {
      language: "javascript",
      code: "function answer(){ return { b: 2, a: 1 }; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "{\"a\":1,\"b\":2}"
        }
      ]
    }
  );

  await expectPass(
    "boolean comparison",
    {
      language: "javascript",
      code: "function answer(){ return true; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "true"
        }
      ]
    }
  );

  await expectFail(
    "case sensitive string comparison",
    {
      language: "javascript",
      code: "function answer(){ return 'Hello'; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "hello"
        }
      ]
    }
  );

  await expectFail(
    "wrong array order fails",
    {
      language: "javascript",
      code: "function answer(){ return [1,2,3]; }",
      functionName: "answer",
      testCases: [
        {
          input: "",
          expectedOutput: "[3,2,1]"
        }
      ]
    }
  );

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("All output comparison smoke tests passed");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});