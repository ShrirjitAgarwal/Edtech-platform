const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const Test = require("../../models/Test");
const layout = require("../../views/layout");
const backButton = require("../../views/backButton");
const { logAuditEvent } = require("../../services/auditLogger");
const { recordUsageEvent } = require("../../services/usageTracker");
const { canCreateTest } = require("../../services/planEnforcement");
const { escapeHtml, escapeAttribute, safeJsonForScript, escapeRegExp, buildExactNameRegex } = require("../../utils/html");

const Assignment = require("../../models/Assignment");

// ---------- TEST SETTINGS PAGE ----------
router.get("/test-settings", authMiddleware, async (req, res) => {
  try {
    const selectedTestId = req.query.id || "";
const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const tests = await Test.find({
  teacherId,
  ...(schoolId ? { schoolId } : {})
})
  .select("name className subject status teacherId scheduledAt durationMinutes testType questionTimersEnabled passingPercentage createdAt")
  .sort({ createdAt: -1 })
  .limit(1000)
  .lean();
    const content = `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Test Settings</h1>
  ${backButton("/teacher-tests")}
</div>
<div style="
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  max-width:760px;
">
  <div style="margin-bottom:20px;">
    <label style="font-weight:700;">Select Test</label><br>
    <div style="position:relative;width:100%;margin-top:6px;">
      <button
        id="testSelectorButton"
        type="button"
        class="custom-dropdown-toggle"
        data-dropdown-id="testSelector"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          background:white;
          cursor:pointer;
          text-align:left;
          display:flex;
          justify-content:space-between;
          align-items:center;
        "
      >
        <span id="testSelectorLabel">Choose a test</span>
        <span>▾</span>
      </button>
      <div
        id="testSelectorMenu"
        style="
          display:none;
          position:absolute;
          top:calc(100% + 6px);
          left:0;
          right:0;
          background:white;
          border:1px solid #cbd5e1;
          border-radius:10px;
          box-shadow:0 8px 24px rgba(15,23,42,0.16);
          max-height:260px;
          overflow-y:auto;
          z-index:120;
        "
      ></div>
      <input id="testSelector" type="hidden" value="${escapeAttribute(selectedTestId)}">
    </div>
  </div>
  <div id="settingsPanel"></div>
</div>
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(
  !pageUser ||
  (
    pageUser.role !== "teacher" &&
    pageUser.role !== "admin"
  )
){
  window.location.replace("/");
}
const tests = ${JSON.stringify(tests)};
let selectedTestId = "${selectedTestId}";
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
function getErrorMessage(error){
  if(!error){
    return "Something went wrong";
  }
  if(typeof error === "string"){
    return error;
  }
  return error.message || "Something went wrong";
}
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
  });
}
function toggleCustomDropdown(inputId){
  const menu = document.getElementById(inputId + "Menu");
  if(!menu){
    return;
  }
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  menu.style.display = isOpen ? "none" : "block";
}
function setCustomDropdownOptions(inputId, options, onSelect){
  const input = document.getElementById(inputId);
  const menu = document.getElementById(inputId + "Menu");
  const label = document.getElementById(inputId + "Label");
  if(!input || !menu || !label){
    return;
  }
  const currentValue = input.value || options[0]?.value || "";
  menu.innerHTML = "";
  options.forEach(optionData => {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = optionData.label;
    option.style.width = "100%";
    option.style.padding = "10px 12px";
    option.style.border = "none";
    option.style.background = "white";
    option.style.textAlign = "left";
    option.style.cursor = "pointer";
    option.style.fontSize = "13px";
    option.style.boxSizing = "border-box";
    option.onmouseenter = function(){
      option.style.background = "#eef2ff";
    };
    option.onmouseleave = function(){
      option.style.background = "white";
    };
    option.addEventListener("click", function(){
      input.value = optionData.value;
      label.textContent = optionData.label;
      closeCustomDropdowns();
      if(typeof onSelect === "function"){
        onSelect(optionData.value);
      }
    });
    menu.appendChild(option);
  });
  const selectedOption = options.find(optionData =>
    String(optionData.value) === String(currentValue)
  );
  if(selectedOption){
    input.value = selectedOption.value;
    label.textContent = selectedOption.label;
  } else {
    input.value = options[0]?.value || "";
    label.textContent = options[0]?.label || "Select";
  }
}
document.addEventListener("click", function(event){
  const dropdownToggle = event.target.closest(".custom-dropdown-toggle");
  if(dropdownToggle){
    const dropdownId = dropdownToggle.dataset.dropdownId;
    if(dropdownId){
      toggleCustomDropdown(dropdownId);
    }
    return;
  }

  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");

  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
function formatDateForInput(value){
  if(!value) return "";
  const date = new Date(value);
  if(isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
function loadSelectedTest(){
  selectedTestId = document.getElementById("testSelector").value;
  if(!selectedTestId){
    document.getElementById("settingsPanel").innerHTML =
      "<p style='color:#64748b;'>Select a test to edit settings.</p>";
    return;
  }
  const test = tests.find(t =>
    String(t._id) === String(selectedTestId)
  );
  if(!test){
    document.getElementById("settingsPanel").innerHTML =
      "<p style='color:#dc2626;'>Test not found.</p>";
    return;
  }
  document.getElementById("settingsPanel").innerHTML = \`
    <h2 style="margin-top:0;">\${escapeHtml(test.name || "Untitled Test")}</h2>
    <div style="
      background:#f8fafc;
      padding:14px;
      border-radius:10px;
      margin-bottom:20px;
      border:1px solid #e5e7eb;
    ">
      <p><b>Class:</b> \${escapeHtml(test.className || "N/A")}</p>
      <p><b>Subject:</b> \${escapeHtml(test.subject || "N/A")}</p>
      <p><b>Status:</b> \${test.status === "published" ? "Published" : "Draft"}</p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Schedule Date / Time</label><br>
      <input
        id="scheduledAt"
        type="datetime-local"
        value="\${formatDateForInput(test.scheduledAt)}"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      />
      <p style="color:#64748b;font-size:13px;margin-top:6px;">
        Published tests appear to students only after this date and time. Leave blank to make it available immediately after publishing.
      </p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Timer Duration</label><br>
      <input
        id="durationMinutes"
        type="number"
        min="1"
        max="1440"
        value="\${test.durationMinutes || 60}"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      />
      <p style="color:#64748b;font-size:13px;margin-top:6px;">
        Duration is in minutes. Maximum allowed is 1440 minutes / 24 hours.
      </p>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Test Type</label><br>
      <div style="position:relative;width:100%;margin-top:6px;">
        <button
          id="testTypeButton"
          type="button"
          class="custom-dropdown-toggle"
          data-dropdown-id="testType"
          style="
            width:100%;
            padding:12px;
            border-radius:8px;
            border:1px solid #cbd5e1;
            box-sizing:border-box;
            background:white;
            cursor:pointer;
            text-align:left;
            display:flex;
            justify-content:space-between;
            align-items:center;
          "
        >
          <span id="testTypeLabel">Practice</span>
          <span>▾</span>
        </button>
        <div
          id="testTypeMenu"
          style="
            display:none;
            position:absolute;
            top:calc(100% + 6px);
            left:0;
            right:0;
            background:white;
            border:1px solid #cbd5e1;
            border-radius:10px;
            box-shadow:0 8px 24px rgba(15,23,42,0.16);
            max-height:220px;
            overflow-y:auto;
            z-index:120;
          "
        ></div>
        <input id="testType" type="hidden" value="\${test.testType || "practice"}">
      </div>
    </div>
        <div style="margin-bottom:16px;">
      <label style="font-weight:700;">Pass / Fail Cutoff (%)</label><br>
      <input
        id="passingPercentage"
        type="number"
        min="0"
        max="100"
        value="\${test.passingPercentage ?? 50}"
        style="
          width:100%;
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
          box-sizing:border-box;
          margin-top:6px;
        "
      />
      <p style="color:#64748b;font-size:13px;margin-top:6px;">
        Students scoring this percentage or above will be counted as passed.
      </p>
    </div>
    <div style="
      margin-bottom:22px;
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:10px;
      padding:14px;
    ">
      <label style="
        display:flex;
        align-items:center;
        gap:10px;
        font-weight:700;
        cursor:pointer;
      ">
        <input
          id="questionTimersEnabled"
          type="checkbox"
          \${test.questionTimersEnabled ? "checked" : ""}
          style="width:18px;height:18px;"
        />
        Enable question timers
      </label>
      <p style="color:#64748b;font-size:13px;margin:8px 0 0 28px;">
        When enabled, students will answer one question at a time. Easy questions get 2 minutes, medium questions get 5 minutes, and hard questions get 10 minutes.
      </p>
    </div>
    <div style="display:flex;gap:12px;">
      <button id="saveTestSettingsButton" style="
        padding:12px 18px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;
      ">
        Save Settings
      </button>
      <button id="backToTeacherTestsButton" style="
        padding:12px 18px;
        background:#64748b;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;
      ">
        Back
      </button>
    </div>
  \`;
  setCustomDropdownOptions(
    "testType",
    [
      { value: "practice", label: "Practice" },
      { value: "unit", label: "Unit" },
      { value: "exam", label: "Exam" }
    ]
  );
}
function saveSettings(){
  if(!selectedTestId){
    return alert("Select a test first");
  }
  const scheduledAt = document.getElementById("scheduledAt").value;
  const durationMinutes = Number(document.getElementById("durationMinutes").value);
    const testType = document.getElementById("testType").value;
  const passingPercentage = Number(document.getElementById("passingPercentage").value);
  const questionTimersEnabled =
    document.getElementById("questionTimersEnabled")?.checked || false;
  if(!durationMinutes || durationMinutes < 1){
    return alert("Duration must be at least 1 minute");
  }
  if(durationMinutes > 1440){
    return alert("Duration cannot exceed 1440 minutes");
  }
  if(Number.isNaN(passingPercentage) || passingPercentage < 0 || passingPercentage > 100){
    return alert("Pass / Fail cutoff must be between 0 and 100");
  }
  fetch("/api/teacher/tests/settings/save", {
    method:"POST",
headers:{
  "Content-Type":"application/json"
},
    body: JSON.stringify({
      testId: selectedTestId,
      scheduledAt,
      durationMinutes,
      testType,
      passingPercentage,
      questionTimersEnabled
    })
  })
  .then(res => res.json())
.then(data => {
  if(data.error){
    alert(getErrorMessage(data.error));
    return;
  }
  const index = tests.findIndex(t =>
    String(t._id) === String(selectedTestId)
  );
  if(index !== -1){
    tests[index] = data.test;
  }
  alert("Settings saved");
  loadSelectedTest();
})
  .catch(() => alert("Failed to save settings"));
}
document.addEventListener("click", function(event){
  const saveButton = event.target.closest("#saveTestSettingsButton");
  if(saveButton){
    saveSettings();
    return;
  }

  const backButton = event.target.closest("#backToTeacherTestsButton");
  if(backButton){
    window.location.replace("/teacher-tests");
  }
});
setCustomDropdownOptions(
  "testSelector",
  [
    { value: "", label: "Choose a test" },
    ...tests.map(test => ({
      value: String(test._id),
      label:
        (test.name || "Untitled Test") +
        " - " +
        (test.className || "No Class") +
        " - " +
        (test.status === "published" ? "Published" : "Draft")
    }))
  ],
  function(){
    loadSelectedTest();
  }
);
loadSelectedTest();
</script>
`;
    res.send(layout(content, "tests"));
  } catch (err) {
    console.error("TEST SETTINGS PAGE ERROR:", err);
    res.send("Error loading test settings");
  }
});
// ---------- SAVE TEST SETTINGS ----------
async function saveTestSettingsHandler(req, res) {
  try {
    const {
      testId,
      scheduledAt,
      durationMinutes,
      testType,
      passingPercentage,
      questionTimersEnabled
    } = req.body;
    if (!testId) {
      return res.status(400).json({ error: "Missing test id" });
    }
    const duration = Number(durationMinutes);
    if (!duration || duration < 1 || duration > 1440) {
      return res.status(400).json({
        error: "Duration must be between 1 and 1440 minutes"
      });
    }
    if (!["practice", "unit", "exam"].includes(testType)) {
      return res.status(400).json({
        error: "Invalid test type"
      });
    }
    const cutoff = Number(passingPercentage);
    if (Number.isNaN(cutoff) || cutoff < 0 || cutoff > 100) {
      return res.status(400).json({
        error: "Pass / Fail cutoff must be between 0 and 100"
      });
    }
const test = await Test.findOne({
  _id: testId,
  teacherId: String(req.user.id),
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    if (!test) {
      return res.status(404).json({
        error: "Test not found or unauthorized"
      });
    }
    test.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    test.durationMinutes = duration;
    test.testType = testType;
    test.passingPercentage = cutoff;
    test.questionTimersEnabled = !!questionTimersEnabled;
await test.save();
await logAuditEvent(req, {
  event: "teacher_test_settings_updated",
  status: "success",
  metadata: {
    testId: test._id,
    testName: test.name,
    scheduledAt: test.scheduledAt,
    durationMinutes: test.durationMinutes,
    testType: test.testType,
    passingPercentage: test.passingPercentage,
    questionTimersEnabled: test.questionTimersEnabled,
    schoolId: test.schoolId || null,
    schoolCode: test.schoolCode || null
  }
});
res.json({
 status: "settings_saved",
 test
 });
  } catch (err) {
    console.error("SAVE TEST SETTINGS ERROR:", err);
    res.status(500).json({
      error: "Failed to save test settings"
    });
  }
}
router.post("/api/teacher/tests/settings/save", authMiddleware, saveTestSettingsHandler);
// ---------- DELETE TEST ----------
async function deleteTestHandler(req, res) {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing test id" });
    }
    const Test = require("../../models/Test");
    const Assignment = require("../../models/Assignment");
    // 🔒 Only allow deleting own tests
const test = await Test.findOne({
  _id: id,
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    if (!test) {
      return res.status(404).json({ error: "Test not found or unauthorized" });
    }
    // 🗑 Delete test
    await Test.deleteOne({
  _id: id,
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
    // 🧹 Remove assignments linked to this test
await Assignment.deleteMany({
testId: id,
teacherId: req.user.id,
...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
await logAuditEvent(req, {
  event: "teacher_test_deleted",
  status: "success",
  metadata: {
    testId: test._id,
    testName: test.name,
    className: test.className,
    subject: test.subject,
    schoolId: test.schoolId || null,
    schoolCode: test.schoolCode || null
  }
});
 res.json({ status: "deleted" });
  } catch (err) {
    console.error("DELETE TEST ERROR:", err);
    res.status(500).json({ error: "Failed to delete test" });
  }
}
router.post("/api/teacher/tests/delete", authMiddleware, deleteTestHandler);
async function deleteMultipleTestsHandler(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "No test ids provided" });
    }
    const Test = require("../../models/Test");
    const Assignment = require("../../models/Assignment");
 const testsToDelete = await Test.find({
 _id: { $in: ids },
 teacherId: req.user.id,
 ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
 })
 .select("_id name className subject schoolId schoolCode")
 .lean();
 // 🔒 Only delete teacher's own tests
await Test.deleteMany({
  _id: { $in: ids },
  teacherId: req.user.id,
  ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
await Assignment.deleteMany({
testId: { $in: ids },
teacherId: req.user.id,
...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
});
await logAuditEvent(req, {
  event: "teacher_tests_bulk_deleted",
  status: "success",
  metadata: {
    requestedIds: ids,
    deletedCount: testsToDelete.length,
    tests: testsToDelete.map(test => ({
      testId: test._id,
      testName: test.name,
      className: test.className,
      subject: test.subject,
      schoolId: test.schoolId || null,
      schoolCode: test.schoolCode || null
    }))
  }
});
 res.json({ status: "deleted" });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed" });
  }
}
router.post("/api/teacher/tests/delete-multiple", authMiddleware, deleteMultipleTestsHandler);
module.exports = router;

module.exports = router;
