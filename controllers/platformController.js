const fs = require("fs");
const {
importQuestionsFromExcel,
writeImportReport
} = require("../utils/questionExcelImporter");
const {
  logAdminAction
} = require("../services/adminActionLogger");
exports.importPage = (req, res) => {
  res.send(`
<body style="font-family:Arial;background:#eef2ff;margin:0;padding:40px;">
  <div style="
    max-width:760px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:14px;
    box-shadow:0 4px 14px rgba(0,0,0,0.08);
  ">
    <h1>Platform Question Import</h1>
    <p style="color:#64748b;">
      Upload an Excel file containing MCQ, Coding, and Written question sheets.
      Imported questions will be public and visible to all schools.
    </p>
    <form id="importForm" enctype="multipart/form-data">
      <input
        type="file"
        id="questionFile"
        name="questionFile"
        accept=".xlsx"
        style="margin:20px 0;"
      />
      <br>
      <button type="submit" style="
        padding:12px 18px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        font-weight:700;
      ">
        Import Questions
      </button>
    </form>
    <div id="resultBox" style="
      margin-top:24px;
      background:#f8fafc;
      padding:18px;
      border-radius:12px;
      border:1px solid #e5e7eb;
      display:none;
      white-space:pre-wrap;
      font-family:Consolas, Monaco, monospace;
      font-size:13px;
    "></div>
    <br>
    <button id="platformImportBackButton" style="
      padding:10px 14px;
      background:#64748b;
      color:white;
      border:none;
      border-radius:8px;
      cursor:pointer;
    ">
      Back
    </button>
  </div>
<script>
const platformImportBackButton = document.getElementById("platformImportBackButton");
if(platformImportBackButton){
  platformImportBackButton.addEventListener("click", function(){
    window.location.replace("/school-dashboard");
  });
}

document.getElementById("importForm").addEventListener("submit", function(e){
  e.preventDefault();
  const fileInput = document.getElementById("questionFile");
  const resultBox = document.getElementById("resultBox");
  if(!fileInput.files.length){
    alert("Please select an .xlsx file");
    return;
  }
  const formData = new FormData();
  formData.append("questionFile", fileInput.files[0]);
  resultBox.style.display = "block";
  resultBox.textContent = "Importing...";
fetch("/api/platform/questions/import", {
    method:"POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    resultBox.textContent = JSON.stringify(data, null, 2);
  })
  .catch(() => {
    resultBox.textContent = "Import failed";
  });
});
</script>
</body>
`);
};
exports.importQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }
    const report = await importQuestionsFromExcel(
      req.file.path
    );
    const reportPath = writeImportReport(report);
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.error("UPLOAD CLEANUP ERROR:", cleanupErr);
    }
 if (report.status === "failed_validation") {
 await logAdminAction(req, {
 action: "question_import",
 status: "failed",
 targetType: "ImportBatch",
 targetId: report.importBatchId,
 metadata: {
 importFile: report.importFile,
 reportPath,
 parsed: report.parsed,
 inserted: report.inserted,
 skippedDuplicates: report.skippedDuplicates,
 failedRows: report.failedRows.length,
 importBatchId: report.importBatchId
 },
 error: "Validation failed"
 });
 return res.status(400).json({
 error: "Validation failed",
 report,
 reportPath
 });
 }
 await logAdminAction(req, {
 action: "question_import",
 status: "success",
 targetType: "ImportBatch",
 targetId: report.importBatchId,
 metadata: {
 importFile: report.importFile,
 reportPath,
 parsed: report.parsed,
 inserted: report.inserted,
 skippedDuplicates: report.skippedDuplicates,
 failedRows: report.failedRows.length,
 importBatchId: report.importBatchId
 }
 });
 res.json({
 status: "success",
 report,
 reportPath
 });
} catch (err) {
 console.error("PLATFORM IMPORT ERROR:", err);
 await logAdminAction(req, {
 action: "question_import",
 status: "failed",
 targetType: "ImportBatch",
 targetId: null,
 metadata: {
 uploadedFile: req.file ? req.file.path : null
 },
 error: err.message
 });
 res.status(500).json({
 error: "Import failed",
 details: err.message
 });
}
};