const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const {
  judgeSubmission
} = require("../services/codeJudge");

// ---------- TEST PAGE ----------
router.get("/test", async (req, res, next) => {
  return next();
});
// ---------- SUBMIT TEST ----------
router.post("/submit", async (req, res) => {
  try {
    const {
      testId,
      testName,
      score,
      total,
      answers
    } = req.body;
    const studentToken = req.cookies && req.cookies.studentSessionToken;
    if (!studentToken) {
      return res.status(401).json({ error: "Student session expired" });
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(
        studentToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      return res.status(401).json({ error: "Student session expired" });
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      return res.status(401).json({ error: "Invalid student session" });
    }
    const studentId = decodedStudent.studentId;
    const studentRecordId = decodedStudent.studentRecordId;
    if (!studentId || !studentRecordId || !testId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid submission data" });
    }
    if (answers.length > 200) {
      return res.status(400).json({
        error: "Too many answers submitted"
      });
    }
    const Result = require("../models/Result");
    const Test = require("../models/Test");
    const Question = require("../models/Question");
    const Student = require("../models/Student");
    const student = await Student.findOne({
      _id: studentRecordId,
      studentId,
      status: "active"
    })
      .select("studentId name class teacherId schoolId schoolCode status")
      .lean();
    if (!student) {
      return res.status(401).json({ error: "Invalid student session" });
    }
    const test = await Test.findById(testId).lean();
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    if (
      student.schoolId &&
      test.schoolId &&
      String(student.schoolId) !== String(test.schoolId)
    ) {
      return res.status(403).json({ error: "Test not available" });
    }
    const questionIds = answers
      .filter(answer => answer.questionId)
      .map(answer => answer.questionId);
    const questions = await Question.find({
      _id: { $in: questionIds },
      $or: [
        { scope: "public" },
        ...(test.schoolId ? [{ schoolId: test.schoolId }] : [])
      ]
    })
      .select("codingMeta testCases")
      .lean();
    const questionMap = {};
    questions.forEach(question => {
      questionMap[String(question._id)] = question;
    });
    const existing = await Result.findOne({
      studentId,
      testId,
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    });
    if (existing) {
      if (!test.allowRetake) {
        return res.status(409).json({ error: "Test already submitted" });
      }
    }
    let finalScore = Number(score) || 0;
    const gradedAnswers = [];
    for (const answer of answers) {
      if (answer.type !== "coding") {
        gradedAnswers.push(answer);
        continue;
      }
      const question =
        questionMap[String(answer.questionId)];
      if (!question || !question.codingMeta?.functionName) {
        gradedAnswers.push({
          ...answer,
          isCorrect: false,
          codingScore: 0,
          codingTotal: 0
        });
        continue;
      }
      const code = String(answer.selected || "");
      if (code.length > 10000) {
        gradedAnswers.push({
          ...answer,
          isCorrect: false,
          codingScore: 0,
          codingTotal: 0
        });
        continue;
      }
const functionName =
  String(
    question.codingMeta.functionName || ""
  ).trim();
const testCases = Array.isArray(question.testCases)
  ? question.testCases
  : [];
const judgeResult =
  await judgeSubmission({
    code,
    functionName,
    testCases,
    language:
      question.codingMeta?.language ||
      "javascript"
  });
const codingTotal =
  judgeResult.totalCount || testCases.length;
const passedCount =
  judgeResult.passedCount || 0;
const codingPassed =
  codingTotal > 0 &&
  passedCount === codingTotal;
if (codingPassed) {
  finalScore++;
}
gradedAnswers.push({
  ...answer,
  isCorrect: codingPassed,
  codingScore: passedCount,
  codingTotal,
  judgeError: judgeResult.error || null,
  judgeResults: judgeResult.testResults || []
});
    }
    const result = await Result.create({
      studentId,
      name: student.name || "",
      class: test.className || student.class || "",
      testId,
      testName: testName || test.name,
      teacherId: test.teacherId,
      schoolId: test.schoolId || student.schoolId || null,
      schoolCode: test.schoolCode || student.schoolCode || null,
      score: finalScore,
      total,
      answers: gradedAnswers,
      date: new Date()
    });
    const bulkAnalyticsUpdates = gradedAnswers
      .filter(answer => answer.questionId)
      .map(answer => ({
        updateOne: {
          filter: {
            _id: answer.questionId
          },
          update: {
            $inc: {
              "analytics.attempted": 1,
              [answer.isCorrect
                ? "analytics.correct"
                : "analytics.incorrect"]: 1
            }
          }
        }
      }));
    if (bulkAnalyticsUpdates.length) {
      await Question.bulkWrite(bulkAnalyticsUpdates);
    }
    res.json({
      status: "submitted",
      result
    });
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Test already submitted" });
    }
    res.status(500).json({ error: "Failed to submit test" });
  }
});

module.exports = router;
