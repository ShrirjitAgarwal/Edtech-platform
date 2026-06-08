const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const workbook = XLSX.utils.book_new();
// ---------- MCQ SHEET ----------
const mcqData = [
  [
    "question",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctAnswers",
    "subject",
    "board",
    "difficulty",
    "category"
  ],
  [
    "What is 2 + 2?",
    "2",
    "3",
    "4",
    "5",
    "C",
    "Maths",
    "General",
    "easy",
    "Arithmetic"
  ]
];
const mcqSheet =
  XLSX.utils.aoa_to_sheet(mcqData);
XLSX.utils.book_append_sheet(
  workbook,
  mcqSheet,
  "MCQ"
);
// ---------- CODING SHEET ----------
const codingData = [
  [
    "question",
    "functionName",
    "starterCode",
    "testInput1",
    "expectedOutput1",
    "testInput2",
    "expectedOutput2",
    "testInput3",
    "expectedOutput3",
    "testInput4",
    "expectedOutput4",
    "hiddenTests",
    "subject",
    "board",
    "difficulty",
    "category"
  ],
  [
    "Return sum of two numbers",
    "sum",
    "function sum(a, b) {\n  \n}",
    "1,2",
    "3",
    "10,20",
    "30",
    "100,200",
    "300",
    "",
    "",
    "3",
    "Computer Science",
    "General",
    "easy",
    "Functions"
  ]
];
const codingSheet =
  XLSX.utils.aoa_to_sheet(codingData);
XLSX.utils.book_append_sheet(
  workbook,
  codingSheet,
  "Coding"
);
// ---------- WRITTEN SHEET ----------
const writtenData = [
  [
    "question",
    "subject",
    "board",
    "difficulty",
    "category",
    "sampleAnswer"
  ],
  [
    "Explain Newton's First Law",
    "Physics",
    "General",
    "medium",
    "Mechanics",
    "An object remains at rest or in motion unless acted upon by an external force."
  ]
];
const writtenSheet =
  XLSX.utils.aoa_to_sheet(writtenData);
XLSX.utils.book_append_sheet(
  workbook,
  writtenSheet,
  "Written"
);
// ---------- CREATE OUTPUT DIRECTORY ----------
const outputDir = path.join(
  __dirname,
  "templates"
);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, {
    recursive: true
  });
}
// ---------- WRITE FILE ----------
const outputPath = path.join(
  outputDir,
  "question-import-template.xlsx"
);
XLSX.writeFile(workbook, outputPath);
console.log(
  "Template created at:",
  outputPath
);