exports.downloadReport = async (req, res) => {
  try {
    const { studentId } = req.body;
    const Result = require("../models/Result");
    if (!studentId) {
      return res.status(400).json({
        error: "Missing studentId"
      });
    }
    const teacherId = req.user.id;
const results = await Result.find({
  studentId: String(studentId),
  teacherId: String(teacherId),
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
})
  .sort({ date: -1 })
  .lean();
    if (!results || results.length === 0) {
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
      csv += `"${r.testName || ""}",${r.score},${r.total},${percent}%,${date}\n`;
    });
    const safeStudentId =
      encodeURIComponent(
        String(studentId || "unknown")
      );
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
    const { className } = req.body;
    const Result = require("../models/Result");
    if (!className) {
      return res.status(400).json({
        error: "Missing className"
      });
    }
const teacherId = req.user.id;
const results = await Result.find({
  class: className,
  teacherId: String(teacherId),
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
})
  .sort({ date: -1 })
  .lean();
    if (!results.length) {
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
      csv += `${s.name},${id},${avg}%,${s.attempts}\n`;
    });
    const safeClass =
      encodeURIComponent(className);
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let result;

  try {
    const student = await Student.findOne({
      studentId: String(studentId)
    })
      .select("studentId schoolId")
      .lean();

    if (!student) {
      return res.send("<h2>No result found</h2>");
    }

    result = await Result.findOne({
      testId: String(testId),
      studentId: String(studentId),
      ...(student.schoolId ? { schoolId: student.schoolId } : {})
    }).lean();
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
        _id: { $in: questionIds }
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
${result.score} / ${result.total}
<br>
<b>Percentage:</b>
${result.total ? Math.round((result.score / result.total) * 100) : 0}%
</div>
<h3>Answers</h3>
${answersHTML}
</body>
`);
};