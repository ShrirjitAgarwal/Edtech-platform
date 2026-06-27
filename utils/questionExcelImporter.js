const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const Question = require("../models/Question");
const ImportBatch = require("../models/ImportBatch");
const BATCH_SIZE = 500;
function clean(value) {
  return String(value || "").trim();
}
function normalize(value) {
  return clean(value)
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function normalizeSubject(value) {
  const subject = clean(value);
  const lower = subject.toLowerCase();
  if (lower === "cs" || lower === "computer science") {
    return "Computer Science";
  }
  if (lower === "maths" || lower === "math") {
    return "Maths";
  }
  if (lower === "physics") {
    return "Physics";
  }
  return subject;
}
function normalizeDifficulty(value) {
  const difficulty = clean(value).toLowerCase();
  if (["easy", "medium", "hard"].includes(difficulty)) {
    return difficulty;
  }
  return difficulty;
}
function makeImportKey(question) {
  const raw = [
    question.type,
    question.question,
    question.subject,
    question.board,
    question.difficulty,
    question.category || ""
  ].map(normalize).join("|");
  return crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");
}
function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false
  });
}
function addError(errors, sheet, rowNumber, message) {
  errors.push({
    sheet,
    rowNumber,
    message
  });
}
function parseCorrectAnswers(value, optionsMap) {
  const rawValues = clean(value)
    .split(",")
    .map(v => clean(v))
    .filter(Boolean);
  const answers = [];
  rawValues.forEach(raw => {
    const upper = raw.toUpperCase();
    if (optionsMap[upper]) {
      answers.push(optionsMap[upper]);
      return;
    }
    const matchingOption = Object.values(optionsMap).find(option =>
      normalize(option) === normalize(raw)
    );
    if (matchingOption) {
      answers.push(matchingOption);
    }
  });
  return answers;
}
function parseTags(value) {
  return clean(value)
    .split(",")
    .map(t => clean(t))
    .filter(Boolean);
}

function buildPublicQuestion(base) {
  const question = {
    ...base,
    scope: "public",
    teacherId: null,
    schoolId: null,
    schoolCode: null,
    analytics: {
      attempted: 0,
      correct: 0,
      incorrect: 0
    },
    createdAt: new Date()
  };
  question.importKey = makeImportKey(question);
  return question;
}
function parseMCQRows(rows, errors) {
  const parsed = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questionText = clean(row.question);
    const optionA = clean(row.optionA);
    const optionB = clean(row.optionB);
    const optionC = clean(row.optionC);
    const optionD = clean(row.optionD);
    const subject = normalizeSubject(row.subject);
    const board = clean(row.board) || "General";
    const difficulty = normalizeDifficulty(row.difficulty);
    const category = clean(row.category);
    const tags = parseTags(row.tags);
    if (!questionText) {
      addError(errors, "MCQ", rowNumber, "Missing question");
      return;
    }
    const options = [
      optionA,
      optionB,
      optionC,
      optionD
    ].filter(Boolean);
    if (options.length < 2) {
      addError(errors, "MCQ", rowNumber, "At least 2 options are required");
      return;
    }
    if (!subject) {
      addError(errors, "MCQ", rowNumber, "Missing subject");
      return;
    }
    if (!difficulty) {
      addError(errors, "MCQ", rowNumber, "Missing difficulty");
      return;
    }
    const optionsMap = {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD
    };
    const correctAnswers = parseCorrectAnswers(
      row.correctAnswers,
      optionsMap
    );
    if (!correctAnswers.length) {
      addError(errors, "MCQ", rowNumber, "Missing or invalid correctAnswers");
      return;
    }
    parsed.push(buildPublicQuestion({
      type: "mcq",
      question: questionText,
      options,
      correct: correctAnswers.length === 1
        ? correctAnswers[0]
        : correctAnswers,
      correctAnswers,
      subject,
      board,
      difficulty,
      category,
      tags,
      testCases: [],
      codingMeta: {
        language: "javascript",
        starterCode: "",
        functionName: ""
      }
    }));
  });
  return parsed;
}
function parseHiddenTests(value) {
  return clean(value)
    .split(",")
    .map(v => parseInt(clean(v), 10))
    .filter(n => !Number.isNaN(n));
}
function parseCodingRows(rows, errors) {
  const parsed = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questionText = clean(row.question);
    const functionName = clean(row.functionName);
    const starterCode = String(row.starterCode || "");
    const subject = normalizeSubject(row.subject);
    const board = clean(row.board) || "General";
    const difficulty = normalizeDifficulty(row.difficulty);
    const category = clean(row.category);
    const tags = parseTags(row.tags);
    const hiddenTests = parseHiddenTests(row.hiddenTests);
    if (!questionText) {
      addError(errors, "Coding", rowNumber, "Missing question");
      return;
    }
    if (!functionName) {
      addError(errors, "Coding", rowNumber, "Missing functionName");
      return;
    }
    if (!starterCode) {
      addError(errors, "Coding", rowNumber, "Missing starterCode");
      return;
    }
    if (!subject) {
      addError(errors, "Coding", rowNumber, "Missing subject");
      return;
    }
    if (!difficulty) {
      addError(errors, "Coding", rowNumber, "Missing difficulty");
      return;
    }
    const testCases = [];
    for (let i = 1; i <= 4; i++) {
      const input = clean(row["testInput" + i]);
      const expectedOutput = clean(row["expectedOutput" + i]);
      if (input || expectedOutput) {
        if (!input || !expectedOutput) {
          addError(
            errors,
            "Coding",
            rowNumber,
            "testInput" + i + " and expectedOutput" + i + " must both be filled"
          );
          return;
        }
        testCases.push({
          input,
          expectedOutput,
          isHidden: hiddenTests.includes(i)
        });
      }
    }
    if (!testCases.length) {
      addError(errors, "Coding", rowNumber, "At least 1 test case is required");
      return;
    }
    parsed.push(buildPublicQuestion({
      type: "coding",
      question: questionText,
      options: [],
      correct: null,
      correctAnswers: [],
      subject,
      board,
      difficulty,
      category,
      tags,
      testCases,
      codingMeta: {
        language: "javascript",
        starterCode,
        functionName
      }
    }));
  });
  return parsed;
}
function parseWrittenRows(rows, errors) {
  const parsed = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questionText = clean(row.question);
    const subject = normalizeSubject(row.subject);
    const board = clean(row.board) || "General";
    const difficulty = normalizeDifficulty(row.difficulty);
    const category = clean(row.category);
    const tags = parseTags(row.tags);
    const sampleAnswer = clean(row.sampleAnswer);
    if (!questionText) {
      addError(errors, "Written", rowNumber, "Missing question");
      return;
    }
    if (!subject) {
      addError(errors, "Written", rowNumber, "Missing subject");
      return;
    }
    if (!difficulty) {
      addError(errors, "Written", rowNumber, "Missing difficulty");
      return;
    }
    parsed.push(buildPublicQuestion({
      type: "written",
      question: questionText,
      options: [],
      correct: sampleAnswer || null,
      correctAnswers: sampleAnswer
        ? [sampleAnswer]
        : [],
      subject,
      board,
      difficulty,
      category,
      tags,
      testCases: [],
      codingMeta: {
        language: "javascript",
        starterCode: "",
        functionName: ""
      }
    }));
  });
  return parsed;
}
async function insertInBatches(questions) {
  let inserted = 0;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    if (!batch.length) {
      continue;
    }
    await Question.insertMany(batch, {
      ordered: false
    });
    inserted += batch.length;
  }
  return inserted;
}
async function createImportBatch({
  filePath,
  source
}) {
  return ImportBatch.create({
    type: "question_import",
    source: source || "platform_upload",
    fileName: path.basename(filePath || ""),
    filePath: filePath || "",
    status: "started",
    startedAt: new Date()
  });
}
async function updateImportBatch(importBatchId, updates) {
  if (!importBatchId) {
    return;
  }
  await ImportBatch.updateOne(
    {
      _id: importBatchId
    },
    {
      $set: updates
    }
  );
}
function attachImportBatchData(questions, importBatchId, source) {
  const importedAt = new Date();
  return questions.map(question => ({
    ...question,
    importBatchId,
    importSource: source || "platform_upload",
    importedAt
  }));
}
async function importQuestionsFromExcel(filePath, options = {}) {
  const startedAt = new Date();
  const importSource = options.source || "platform_upload";
  let importBatch = null;
  const report = {
    startedAt,
    finishedAt: null,
    importFile: filePath,
    importBatchId: null,
    parsed: {
      mcq: 0,
      coding: 0,
      written: 0,
      total: 0
    },
    inserted: 0,
    skippedDuplicates: 0,
    failedRows: [],
    status: "started"
  };
  if (!fs.existsSync(filePath)) {
    throw new Error("Import file not found: " + filePath);
  }
  if (!options.validateOnly) {
    importBatch = await createImportBatch({
      filePath,
      source: importSource
    });
    report.importBatchId = String(importBatch._id);
  }
  const workbook = XLSX.readFile(filePath);
  const errors = [];
  const mcqQuestions = parseMCQRows(
    sheetToRows(workbook, "MCQ"),
    errors
  );
  const codingQuestions = parseCodingRows(
    sheetToRows(workbook, "Coding"),
    errors
  );
  const writtenQuestions = parseWrittenRows(
    sheetToRows(workbook, "Written"),
    errors
  );
  const allParsed = [
    ...mcqQuestions,
    ...codingQuestions,
    ...writtenQuestions
  ];
  report.parsed = {
    mcq: mcqQuestions.length,
    coding: codingQuestions.length,
    written: writtenQuestions.length,
    total: allParsed.length
  };
  report.failedRows = errors;
  if (errors.length) {
    report.status = "failed_validation";
    report.finishedAt = new Date();
    await updateImportBatch(report.importBatchId, {
      status: report.status,
      parsedCount: report.parsed.total,
      insertedCount: 0,
      skippedDuplicateCount: 0,
      failedRowCount: errors.length,
      finishedAt: report.finishedAt
    });
    return report;
  }
  const importKeys = allParsed.map(q => q.importKey);
  const existing = await Question.find({
    importKey: { $in: importKeys }
  })
    .select("importKey")
    .lean();
  const existingKeys = new Set(
    existing.map(q => q.importKey)
  );
  const questionsToInsert = allParsed.filter(q =>
    !existingKeys.has(q.importKey)
  );
  report.skippedDuplicates =
    allParsed.length - questionsToInsert.length;
  if (!options.validateOnly) {
    const taggedQuestions = attachImportBatchData(
      questionsToInsert,
      report.importBatchId,
      importSource
    );
    report.inserted = await insertInBatches(
      taggedQuestions
    );
  }
  report.status = "completed";
  report.finishedAt = new Date();
  await updateImportBatch(report.importBatchId, {
    status: report.status,
    parsedCount: report.parsed.total,
    insertedCount: report.inserted,
    skippedDuplicateCount: report.skippedDuplicates,
    failedRowCount: report.failedRows.length,
    finishedAt: report.finishedAt
  });
  return report;
}
function writeImportReport(report) {
  const reportDir = path.join(
    __dirname,
    "..",
    "scripts",
    "reports"
  );
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, {
      recursive: true
    });
  }
  const fileName =
    "question-import-report-" +
    Date.now() +
    ".json";
  const reportPath = path.join(
    reportDir,
    fileName
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2)
  );
  return reportPath;
}
module.exports = {
  importQuestionsFromExcel,
  writeImportReport
};