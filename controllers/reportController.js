const {
  recordUsageEvent
} = require("../services/usageTracker");
const { logAuditEvent } = require("../services/auditLogger");
const { escapeHtml } = require("../utils/html");
async function logReportDownloadDenied(req, metadata, error) {
  await logAuditEvent(req, {
    event: "report_download_denied",
    status: "failed",
    metadata,
    error
  });
}
function escapeCsvCell(value) {
  const raw = String(value ?? "");
  const protectedValue = /^[=+\-@]/.test(raw)
    ? "'" + raw
    : raw;
  return '"' + protectedValue.replace(/"/g, '""') + '"';
}
exports.downloadReport = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
      await logReportDownloadDenied(req, {
        reportType: "student",
        reason: "invalid_role",
        requestedStudentId: String(req.body?.studentId || "")
      }, "invalid_role");
      return res.status(403).json({ error: "Access denied" });
    }
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      await logReportDownloadDenied(req, {
        reportType: "student",
        reason: "missing_school_context",
        requestedStudentId: String(req.body?.studentId || "")
      }, "missing_school_context");
      return res.status(403).json({ error: "Access denied: missing school context" });
    }
    const { studentId } = req.body;
    const Result = require("../models/Result");
    if (!studentId) {
      await logReportDownloadDenied(req, {
        reportType: "student",
        reason: "missing_student_id"
      }, "missing_student_id");
      return res.status(400).json({
        error: "Missing studentId"
      });
    }
    const resultFilter = {
      studentId: String(studentId),
      schoolId
    };
    if (req.user.role === "teacher") {
      resultFilter.teacherId = String(req.user.id);
    }
    const results = await Result.find(resultFilter)
      .sort({ date: -1 })
      .lean();
    if (!results || results.length === 0) {
      await logReportDownloadDenied(req, {
        reportType: "student",
        reason: "no_results_or_not_authorized",
        requestedStudentId: String(studentId)
      }, "no_results_or_not_authorized");
      return res.status(404).json({
        error: "No results found"
      });
    }
    let csv =
      "Test Name,Score,Total,Percentage,Date\n";
    results.forEach((r) => {
      const percent = r.total
        ? Math.round(
            (r.score / r.total) * 100
          )
        : 0;
      const date = r.date
        ? new Date(r.date).toLocaleString()
        : "";
      csv += [
        escapeCsvCell(r.testName || ""),
        escapeCsvCell(r.score),
        escapeCsvCell(r.total),
        escapeCsvCell(percent + "%"),
        escapeCsvCell(date)
      ].join(",") + "\n";
    });
    const safeStudentId =
      encodeURIComponent(
        String(studentId || "unknown")
      );
    await recordUsageEvent({
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      userId: req.user.id,
      teacherId: req.user.role === "teacher" ? String(req.user.id) : null,
      role: req.user.role,
      eventType: "report_downloaded",
      eventLabel: "Student report downloaded",
      resourceType: "student_report",
      resourceId: String(studentId),
      status: "downloaded",
      metadata: {
        reportType: "student",
        studentId: String(studentId),
        resultCount: results.length
      }
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.ms-excel"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report_${safeStudentId}.xls"`
    );
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to generate report"
    });
  }
};
exports.downloadClassReport = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
      await logReportDownloadDenied(req, {
        reportType: "class",
        reason: "invalid_role",
        requestedClassName: String(req.body?.className || "")
      }, "invalid_role");
      return res.status(403).json({ error: "Access denied" });
    }
    const schoolId = req.user.schoolId || null;
    if (!schoolId) {
      await logReportDownloadDenied(req, {
        reportType: "class",
        reason: "missing_school_context",
        requestedClassName: String(req.body?.className || "")
      }, "missing_school_context");
      return res.status(403).json({ error: "Access denied: missing school context" });
    }
    const { className } = req.body;
    const Result = require("../models/Result");
    if (!className) {
      await logReportDownloadDenied(req, {
        reportType: "class",
        reason: "missing_class_name"
      }, "missing_class_name");
      return res.status(400).json({
        error: "Missing className"
      });
    }
    const resultFilter = {
      class: className,
      schoolId
    };
    if (req.user.role === "teacher") {
      resultFilter.teacherId = String(req.user.id);
    }
    const results = await Result.find(resultFilter)
      .sort({ date: -1 })
      .lean();
    if (!results.length) {
      await logReportDownloadDenied(req, {
        reportType: "class",
        reason: "no_results_or_not_authorized",
        requestedClassName: String(className)
      }, "no_results_or_not_authorized");
      return res.status(404).json({
        error: "No data found"
      });
    }
    let studentMap = {};
    results.forEach((r) => {
      if (!studentMap[r.studentId]) {
        studentMap[r.studentId] = {
          name: r.name,
          totalScore: 0,
          totalMarks: 0,
          attempts: 0
        };
      }
      studentMap[r.studentId].totalScore += r.score;
      studentMap[r.studentId].totalMarks += r.total;
      studentMap[r.studentId].attempts += 1;
    });
    let csv =
      "Name,Student ID,Average %,Attempts\n";
    Object.keys(studentMap).forEach((id) => {
      const s = studentMap[id];
      const avg =
        s.totalMarks > 0
          ? Math.round(
              (s.totalScore /
                s.totalMarks) *
                100
            )
          : 0;
      csv += [
        escapeCsvCell(s.name || ""),
        escapeCsvCell(id),
        escapeCsvCell(avg + "%"),
        escapeCsvCell(s.attempts)
      ].join(",") + "\n";
    });
    const safeClass =
      encodeURIComponent(className);
    await recordUsageEvent({
      schoolId: req.user.schoolId || null,
      schoolCode: req.user.schoolCode || null,
      userId: req.user.id,
      teacherId: req.user.role === "teacher" ? String(req.user.id) : null,
      role: req.user.role,
      eventType: "report_downloaded",
      eventLabel: "Class report downloaded",
      resourceType: "class_report",
      resourceId: String(className),
      status: "downloaded",
      metadata: {
        reportType: "class",
        className: String(className),
        resultCount: results.length,
        studentCount: Object.keys(studentMap).length
      }
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.ms-excel"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="class_${safeClass}.xls"`
    );
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to generate report"
    });
  }
};
exports.resultPage = async (req, res) => {
  const { testId, studentId } = req.query;
  const Result = require("../models/Result");
  const Student = require("../models/Student");
  const Question = require("../models/Question");
  if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
    return res.status(403).send("<h2>Access denied</h2>");
  }
  let result;
  try {
    const studentFilter = {
      studentId: String(studentId),
      schoolId: req.user.schoolId
    };
    if (req.user.role === "teacher") {
      studentFilter.teacherId = String(req.user.id);
    }
    const student = await Student.findOne(studentFilter)
      .select("studentId teacherId schoolId")
      .lean();
    if (!student) {
      return res.send("<h2>No result found</h2>");
    }
    const resultFilter = {
      testId: String(testId),
      studentId: String(studentId),
      schoolId: req.user.schoolId
    };
    if (req.user.role === "teacher") {
      resultFilter.teacherId = String(req.user.id);
    }
    result = await Result.findOne(resultFilter).lean();
  } catch (err) {
    console.error(err);
  }
  if (!result) {
    return res.send("<h2>No result found</h2>");
  }
  const questionIds = (result.answers || [])
    .map(answer => String(answer.questionId || ""))
    .filter(Boolean);
  const questions = questionIds.length
    ? await Question.find({
        _id: { $in: questionIds },
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      })
        .select("question")
        .lean()
    : [];
  const questionMap = {};
  questions.forEach(question => {
    questionMap[String(question._id)] = question.question || "";
  });
  const answersHTML = (result.answers || [])
    .map((a, index) => {
      const correct = a.isCorrect;
      const questionText =
        questionMap[String(a.questionId)] ||
        `Question ${index + 1}`;
      return `
<div style="
margin:12px 0;
padding:15px;
border-radius:10px;
background:${correct ? "#ecfdf5" : "#fef2f2"};
border:1px solid ${correct ? "#16a34a" : "#dc2626"};
">
<div style="font-weight:700;margin-bottom:8px;">
${index + 1}. ${escapeHtml(questionText)}
</div>
<div style="font-size:14px;margin-bottom:4px;">
Your Answer:
<b>${escapeHtml(a.selected || "N/A")}</b>
</div>
<div style="font-size:14px;margin-bottom:4px;">
Correct Answer:
<b>${escapeHtml(a.correctAnswer || "-")}</b>
</div>
<div style="
font-size:13px;
font-weight:600;
color:${correct ? "#16a34a" : "#dc2626"};
">
${correct ? "Correct" : "Incorrect"}
</div>
</div>
`;
    })
    .join("");
  res.send(`
<body style="
font-family:Arial;
background:#eef2ff;
padding:20px;
">
<h1>Test Details</h1>
<div style="
background:white;
padding:15px;
border-radius:10px;
margin-bottom:20px;
">
<b>Score:</b>
${escapeHtml(result.score)} / ${escapeHtml(result.total)}
<br>
<b>Percentage:</b>
${escapeHtml(result.total ? Math.round((result.score / result.total) * 100) : 0)}%
</div>
<h3>Answers</h3>
${answersHTML}
</body>
`);
};