
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {
  judgeSubmission
} = require("../services/codeJudge");
const {
  recordUsageEvent
} = require("../services/usageTracker");
const Student = require("../models/Student");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Assignment = require("../models/Assignment");
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
  let codeRunSlotReserved = false;
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
    codeRunSlotReserved = true;
    // Verify student session cookie
    const studentToken = req.cookies && req.cookies.studentSessionToken;
    if (!studentToken) {
      return res.status(401).json({ error: "Student session required" });
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(studentToken, process.env.JWT_SECRET);
    } catch (tokenErr) {
      return res.status(401).json({ error: "Student session expired" });
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      return res.status(401).json({ error: "Invalid student session" });
    }
    const {
      code,
      language,
      testId,
      questionId,
      testName,
      questionType
    } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: "Code required" });
    }
    if (String(code).length > 10000) {
      return res.status(400).json({
        error: "Code is too long. Please keep your answer under 10,000 characters."
      });
    }
    if (!testId || !String(testId).trim()) {
      return res.status(400).json({ error: "Test ID required" });
    }
    if (!questionId || !String(questionId).trim()) {
      return res.status(400).json({ error: "Question ID required" });
    }
    // Load student from DB using decoded token — not body values
    const student = await Student.findOne({
      _id: decodedStudent.studentRecordId,
      studentId: decodedStudent.studentId,
      status: "active"
    })
      .select("studentId class teacherId schoolId schoolCode status")
      .lean();
    if (!student) {
      return res.status(401).json({ error: "Invalid student session" });
    }
    if (!student.schoolId) {
      return res.status(403).json({ error: "School context required" });
    }
    // Load and authorize the test
    const test = await Test.findOne({
      _id: testId,
      schoolId: student.schoolId
    })
      .select("status teacherId className questionIds")
      .lean();
    if (!test) {
      return res.status(403).json({ error: "Test not available" });
    }
    if (test.status !== "published") {
      return res.status(403).json({ error: "Test not available" });
    }
    if (String(test.teacherId || "") !== String(student.teacherId || "")) {
      return res.status(403).json({ error: "Test not available" });
    }
    const normalizedStudentClass = String(student.class || "").trim().toUpperCase();
    const normalizedTestClass = String(test.className || "").trim().toUpperCase();
    if (normalizedTestClass !== normalizedStudentClass) {
      return res.status(403).json({ error: "Test not available" });
    }
    // Verify questionId belongs to this test
    const testQuestionIds = (test.questionIds || []).map(String);
    if (!testQuestionIds.includes(String(questionId))) {
      return res.status(403).json({ error: "Question not available" });
    }
    // Verify the student is assigned to this test
    const assignment = await Assignment.findOne({
      testId: String(test._id),
      className: normalizedStudentClass,
      teacherId: String(student.teacherId || ""),
      schoolId: student.schoolId
    })
      .select("_id")
      .lean();
    if (!assignment) {
      return res.status(403).json({ error: "Test not assigned" });
    }
    // Load question from DB — functionName and testCases come only from here
    const question = await Question.findOne({
      _id: questionId,
      $or: [
        { scope: "public" },
        { schoolId: student.schoolId }
      ]
    })
      .select("codingMeta testCases type")
      .lean();
    if (!question) {
      return res.status(403).json({ error: "Question not available" });
    }
    const dbFunctionName = String(question.codingMeta?.functionName || "").trim();
    const dbTestCases = Array.isArray(question.testCases) ? question.testCases : [];
    const dbLanguage = String(question.codingMeta?.language || "").trim() || language || "javascript";
    if (!dbFunctionName) {
      return res.status(400).json({ error: "Function name required" });
    }
    if (!dbTestCases.length) {
      return res.status(400).json({ error: "No test cases found" });
    }
    if (dbTestCases.length > 4) {
      return res.status(400).json({ error: "Too many test cases" });
    }
    const cleanTestCases = dbTestCases
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
      return res.status(400).json({ error: "No valid test cases found" });
    }
    const codeRunLimitCheck = await canRunCode(student.schoolId);
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
      functionName: dbFunctionName,
      testCases: cleanTestCases,
      language: dbLanguage
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
      schoolId: student.schoolId,
      schoolCode: student.schoolCode || null,
      studentId: student.studentId,
      eventType: "code_run",
      eventLabel: "Code run",
      resourceType: "question",
      resourceId: String(questionId),
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
        language: dbLanguage,
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
    if (codeRunSlotReserved) {
      activeCodeRuns = Math.max(activeCodeRuns - 1, 0);
    }
  }
}
router.post("/api/code/run", runCodeHandler);
module.exports = router;
