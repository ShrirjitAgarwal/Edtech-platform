const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  judgeSubmission
} = require("../services/codeJudge");
const {
  logAuditEvent
} = require("../services/auditLogger");
const {
  recordUsageEvent
} = require("../services/usageTracker");
// ---------- TEST PAGE ----------
router.get("/test", async (req, res, next) => {
  return next();
});
// ---------- SUBMIT TEST ----------
async function submitStudentTestHandler(req, res) {
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
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        metadata: {
          testId,
          testName,
          reason: "missing_student_session_token"
        },
        error: "Student session expired"
      });
      return res.status(401).json({ error: "Student session expired" });
    }
    let decodedStudent;
    try {
      decodedStudent = jwt.verify(
        studentToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        metadata: {
          testId,
          testName,
          reason: "invalid_student_session_token"
        },
        error: "Student session expired"
      });
      return res.status(401).json({ error: "Student session expired" });
    }
    if (!decodedStudent || decodedStudent.role !== "student") {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          reason: "invalid_student_role"
        },
        error: "Invalid student session"
      });
      return res.status(401).json({ error: "Invalid student session" });
    }
    const studentId = decodedStudent.studentId;
    const studentRecordId = decodedStudent.studentRecordId;
    if (!studentId || !studentRecordId || !testId || !Array.isArray(answers)) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          studentId,
          studentRecordId,
          reason: "invalid_submission_data"
        },
        error: "Invalid submission data"
      });
      return res.status(400).json({ error: "Invalid submission data" });
    }
    if (answers.length > 200) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          studentId,
          studentRecordId,
          answerCount: answers.length,
          reason: "too_many_answers"
        },
        error: "Too many answers submitted"
      });
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
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          studentId,
          studentRecordId,
          reason: "student_not_found"
        },
        error: "Invalid student session"
      });
      return res.status(401).json({ error: "Invalid student session" });
    }
    if (!student.schoolId) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          studentId,
          studentRecordId,
          reason: "missing_school_context"
        },
        error: "School context required"
      });
      return res.status(403).json({ error: "School context required" });
    }

    const test = await Test.findOne({
      _id: testId,
      schoolId: student.schoolId
    }).lean();
    if (!test) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName,
          studentId,
          studentRecordId,
          reason: "test_not_found"
        },
        error: "Test not found"
      });
      return res.status(404).json({ error: "Test not found" });
    }
    if (test.status !== "published") {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          testStatus: test.status,
          reason: "test_not_published"
        },
        error: "Test not available"
      });
      return res.status(403).json({ error: "Test not available" });
    }
    if (test.scheduledAt && new Date(test.scheduledAt) > new Date()) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          scheduledAt: test.scheduledAt,
          reason: "test_not_started"
        },
        error: "Test not available yet"
      });
      return res.status(403).json({ error: "Test not available yet" });
    }
    if (
      String(test.teacherId || "") !== String(student.teacherId || "")
    ) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          studentTeacherId: student.teacherId,
          testTeacherId: test.teacherId,
          reason: "teacher_mismatch"
        },
        error: "Test not available"
      });
      return res.status(403).json({ error: "Test not available" });
    }
    if (
      String(test.className || "").trim().toUpperCase() !==
      String(student.class || "").trim().toUpperCase()
    ) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          studentClass: student.class,
          testClassName: test.className,
          reason: "class_mismatch"
        },
        error: "Test not available"
      });
      return res.status(403).json({ error: "Test not available" });
    }
    if (
      student.schoolId &&
      test.schoolId &&
      String(student.schoolId) !== String(test.schoolId)
    ) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          studentSchoolId: student.schoolId,
          testSchoolId: test.schoolId,
          reason: "school_mismatch"
        },
        error: "Test not available"
      });
      return res.status(403).json({ error: "Test not available" });
    }
    const Assignment = require("../models/Assignment");
    const assignment = await Assignment.findOne({
      testId: String(testId),
      className: String(student.class || "").trim().toUpperCase(),
      teacherId: String(student.teacherId || ""),
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    })
      .select("_id")
      .lean();
    if (!assignment) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        actor: decodedStudent,
        metadata: {
          testId,
          testName: testName || test.name,
          studentId,
          studentRecordId,
          className: student.class,
          teacherId: student.teacherId,
          reason: "assignment_not_found"
        },
        error: "Test not assigned"
      });
      return res.status(403).json({ error: "Test not assigned" });
    }
    const allowedQuestionIds = new Set((test.questionIds || []).map(String));
    const validAnswers = answers.filter(answer =>
      answer &&
      answer.questionId &&
      allowedQuestionIds.has(String(answer.questionId))
    );
    const questionIds = validAnswers
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
      teacherId: String(test.teacherId || student.teacherId || ""),
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    });
    if (existing) {
      if (!test.allowRetake) {
        await logAuditEvent(req, {
          event: "student_test_submission_failed",
          status: "failed",
          actor: decodedStudent,
          metadata: {
            testId,
            testName: testName || test.name,
            studentId,
            studentRecordId,
            resultId: existing._id,
            reason: "already_submitted"
          },
          error: "Test already submitted"
        });
        return res.status(409).json({ error: "Test already submitted" });
      }
    }
    let finalScore = Number(score) || 0;
    const gradedAnswers = [];
    for (const answer of validAnswers) {
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
      total: Number(total) || gradedAnswers.length,
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
    await logAuditEvent(req, {
      event: "student_test_submitted",
      status: "success",
      actor: decodedStudent,
      metadata: {
        resultId: result._id,
        testId,
        testName: testName || test.name,
        studentId,
        studentRecordId,
        score: finalScore,
        total: Number(total) || gradedAnswers.length,
        answerCount: gradedAnswers.length,
        schoolId: result.schoolId || null,
        schoolCode: result.schoolCode || null
      }
    });

    await recordUsageEvent({
      schoolId: result.schoolId || null,
      schoolCode: result.schoolCode || null,
      teacherId: result.teacherId || null,
      studentId,
      role: "student",
      eventType: "test_submitted",
      eventLabel: "Test submitted",
      resourceType: "test",
      resourceId: testId,
      status: "submitted",
      metadata: {
        resultId: String(result._id),
        testId,
        testName: testName || test.name,
        studentRecordId,
        score: finalScore,
        total: Number(total) || gradedAnswers.length,
        answerCount: gradedAnswers.length
      }
    });

    res.json({
      status: "submitted",
      result
    });
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    if (err.code === 11000) {
      await logAuditEvent(req, {
        event: "student_test_submission_failed",
        status: "failed",
        metadata: {
          reason: "duplicate_result_key"
        },
        error: "Test already submitted"
      });
      return res.status(409).json({ error: "Test already submitted" });
    }
    await logAuditEvent(req, {
      event: "student_test_submission_failed",
      status: "failed",
      metadata: {
        reason: "submit_exception"
      },
      error: err.message
    });
    res.status(500).json({ error: "Failed to submit test" });
  }
}
router.post("/api/student/submit", submitStudentTestHandler);
module.exports = router;
