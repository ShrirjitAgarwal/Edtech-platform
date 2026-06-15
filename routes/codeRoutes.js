
const express = require("express");
const router = express.Router();
const {
  judgeSubmission
} = require("../services/codeJudge");
const {
  recordUsageEvent
} = require("../services/usageTracker");
const Student = require("../models/Student");
const {
  canRunCode
} = require("../services/planEnforcement");
const runCodeRateLimit = {};
function getRunCodeClientKey(req){
  return (
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}
function checkRunCodeRateLimit(req){
  const key = getRunCodeClientKey(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  if(!runCodeRateLimit[key]){
    runCodeRateLimit[key] = [];
  }
  runCodeRateLimit[key] = runCodeRateLimit[key].filter(timestamp =>
    now - timestamp < windowMs
  );
  if(runCodeRateLimit[key].length >= maxRequests){
    return false;
  }
  runCodeRateLimit[key].push(now);
  return true;
}
let activeCodeRuns = 0;
const maxActiveCodeRuns = 25;
// ---------- RUN CODE ----------
async function runCodeHandler(req, res) {
  try {
    if (activeCodeRuns >= maxActiveCodeRuns) {
      return res.status(503).json({
        error: "Code runner is busy. Please try again in a few seconds."
      });
    }
    if (!checkRunCodeRateLimit(req)) {
      return res.status(429).json({
        error: "Too many code runs. Please wait a minute and try again."
      });
    }
    activeCodeRuns++;
    const {
      code,
      language,
      functionName,
      testCases,
      schoolId,
      schoolCode,
      studentId,
      testId,
      questionId,
      testName,
      questionType
    } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({
        error: "Code required"
      });
    }
    if (String(code).length > 10000) {
      return res.status(400).json({
        error: "Code is too long. Please keep your answer under 10,000 characters."
      });
    }
    if (!functionName || !String(functionName).trim()) {
      return res.status(400).json({
        error: "Function name required"
      });
    }
    if (!Array.isArray(testCases) || !testCases.length) {
      return res.status(400).json({
        error: "No test cases found"
      });
    }
    if (testCases.length > 4) {
      return res.status(400).json({
        error: "Too many test cases"
      });
    }
    const cleanTestCases = testCases
      .filter(tc => tc && typeof tc === "object")
      .map(tc => ({
        input: String(tc.input || ""),
        expectedOutput: String(tc.expectedOutput || ""),
        isHidden: !!tc.isHidden
      }))
      .filter(tc =>
        tc.input.trim() !== "" ||
        tc.expectedOutput.trim() !== ""
      );
    if (!cleanTestCases.length) {
      return res.status(400).json({
        error: "No valid test cases found"
      });
    }

    const normalizedSchoolId = String(schoolId || "").trim();
    const normalizedStudentId = String(studentId || "").trim();

    if (!normalizedSchoolId) {
      return res.status(403).json({
        error: "School context required"
      });
    }

    if (!normalizedStudentId) {
      return res.status(401).json({
        error: "Invalid student context"
      });
    }

    const student = await Student.findOne({
      studentId: normalizedStudentId,
      schoolId: normalizedSchoolId,
      status: "active"
    })
      .select("studentId schoolId schoolCode status")
      .lean();

    if (!student) {
      return res.status(403).json({
        error: "Invalid student context"
      });
    }

    if (
      schoolCode &&
      student.schoolCode &&
      String(schoolCode) !== String(student.schoolCode)
    ) {
      return res.status(403).json({
        error: "Invalid school context"
      });
    }

    const codeRunLimitCheck = await canRunCode(normalizedSchoolId);

    if (!codeRunLimitCheck.allowed) {
      return res.status(403).json({
        error: codeRunLimitCheck.message,
        code: codeRunLimitCheck.code,
        usage: codeRunLimitCheck.usage,
        limit: codeRunLimitCheck.limit
      });
    }

    const judgeResult = await judgeSubmission({
      code,
      functionName: String(functionName).trim(),
      testCases: cleanTestCases,
      language: language || "javascript"
    });
    let output = "";
    if (judgeResult.error) {
      output += "Error:\n\n" + judgeResult.error + "\n";
    }
    const testResults = judgeResult.testResults || [];
    testResults.forEach((result, index) => {
      const originalCase = cleanTestCases[index] || {};
      const isHidden = !!originalCase.isHidden;
      if (isHidden) {
        output +=
          "Test Case " + (index + 1) + " (Hidden): " +
          (result.passed ? "PASS" : "FAIL") +
          "\n\n";
      } else {
        output +=
          "Test Case " + (index + 1) + ": " +
          (result.passed ? "PASS" : "FAIL") +
          "\nInput: " + (result.input || "") +
          "\nExpected: " + (result.expectedOutput || "") +
          "\nReceived: " + (
            result.error
              ? "Runtime Error: " + result.error
              : result.actualOutput
          ) +
          "\n\n";
      }
    });
    output +=
      "Result: " +
      (judgeResult.passedCount || 0) +
      " / " +
      (judgeResult.totalCount || cleanTestCases.length) +
      " test cases passed.";
    await recordUsageEvent({
      schoolId: normalizedSchoolId,
      schoolCode: student.schoolCode || schoolCode || null,
      studentId: normalizedStudentId,
      eventType: "code_run",
      eventLabel: "Code run",
      resourceType: "question",
      resourceId: questionId,
      status: judgeResult.error
        ? "error"
        : judgeResult.allPassed
          ? "passed"
          : "failed",
      metadata: {
        testId,
        testName,
        questionId,
        questionType: questionType || "coding",
        language: language || "javascript",
        codeLength: String(code || "").length,
        testCaseCount: cleanTestCases.length,
        passedCount: judgeResult.passedCount || 0,
        totalCount: judgeResult.totalCount || cleanTestCases.length,
        hasError: Boolean(judgeResult.error)
      }
    });

    res.json({
      output,
      passedCount: judgeResult.passedCount || 0,
      total: judgeResult.totalCount || cleanTestCases.length,
      passed: !!judgeResult.allPassed,
      testResults
    });
  } catch (err) {
    console.error("RUN CODE ERROR:", err);
    res.status(500).json({
      error: "Execution failed"
    });
  } finally {
    activeCodeRuns = Math.max(activeCodeRuns - 1, 0);
  }
}
router.post("/api/code/run", runCodeHandler);
module.exports = router;