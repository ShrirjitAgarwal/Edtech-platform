require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : process.env.NODE_ENV === "staging"
      ? ".env.staging"
      : ".env.local"
});

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

const connectDB = require("../data/config/db");
const Question = require("../models/Question");

const IMPORT_FILE = path.join(
  __dirname,
  "imports",
  "question-import.xlsx"
);

const REPORT_DIR = path.join(
  __dirname,
  "reports"
);

const REPORT_FILE = path.join(
  REPORT_DIR,
  "question-import-report.json"
);

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

  if (
    subject.toLowerCase() === "cs" ||
    subject.toLowerCase() === "computer science"
  ) {
    return "Computer Science";
  }

  if (subject.toLowerCase() === "maths") {
    return "Maths";
  }

  if (subject.toLowerCase() === "physics") {
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
  return clean(value)
    .split(",")
    .map(v => clean(v).toUpperCase())
    .filter(Boolean)
    .map(letter => optionsMap[letter])
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

async function runImport() {
  const startedAt = new Date();

  const report = {
    startedAt,
    finishedAt: null,
    importFile: IMPORT_FILE,
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

  try {
    if (!fs.existsSync(IMPORT_FILE)) {
      throw new Error(
        "Import file not found. Expected: " + IMPORT_FILE
      );
    }

    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, {
        recursive: true
      });
    }

    await connectDB();

    const workbook = XLSX.readFile(IMPORT_FILE);

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

      fs.writeFileSync(
        REPORT_FILE,
        JSON.stringify(report, null, 2)
      );

      console.log("Import stopped because validation errors were found.");
      console.log("See report:", REPORT_FILE);

      await mongoose.disconnect();
      process.exit(1);
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

    const inserted = await insertInBatches(
      questionsToInsert
    );

    report.inserted = inserted;
    report.status = "completed";
    report.finishedAt = new Date();

    fs.writeFileSync(
      REPORT_FILE,
      JSON.stringify(report, null, 2)
    );

    console.log("Question import completed");
    console.log({
      parsed: report.parsed,
      inserted: report.inserted,
      skippedDuplicates: report.skippedDuplicates,
      failedRows: report.failedRows.length,
      reportFile: REPORT_FILE
    });

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    report.status = "failed";
    report.finishedAt = new Date();
    report.error = err.message;

    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, {
        recursive: true
      });
    }

    fs.writeFileSync(
      REPORT_FILE,
      JSON.stringify(report, null, 2)
    );

    console.error("Question import failed:", err.message);
    console.error("See report:", REPORT_FILE);

    await mongoose.disconnect();
    process.exit(1);
  }
}

runImport();