const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const layout = require("../views/layout");
const backButton = require("../views/backButton");

// ---------- CREATE QUESTION PAGE ----------
router.get("/create-question", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
let editQuestion = null;
if(req.query.id){
editQuestion = await Question.findOne({
    _id: req.query.id,
    scope: "teacher",
    teacherId: String(req.user.id),
    ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
  }).lean();
}
const dropdownQuestions = await Question.find({
  $or: [
    { scope: "public" },
    req.user.schoolId
      ? {
          scope: "teacher",
          schoolId: req.user.schoolId
        }
      : {
          scope: "teacher",
          teacherId: String(req.user.id)
        }
  ]
})
  .select("subject category board")
  .limit(5000)
  .lean();
function normalizeSubjectOption(value){
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();

  if(!raw){
    return "";
  }

  if(
    lower === "math" ||
    lower === "maths" ||
    lower === "mathematics"
  ){
    return "Maths";
  }

  if(
    lower === "cs" ||
    lower === "computer science" ||
    lower === "programming"
  ){
    return "Computer Science";
  }

  if(lower === "physics"){
    return "Physics";
  }

  if(lower === "science"){
    return "Science";
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const subjectOptionsForQuestionBuilder = [...new Set(
  dropdownQuestions
    .map(q => normalizeSubjectOption(q.subject || q.category))
    .filter(Boolean)
)].sort();

const boardOptionsForQuestionBuilder = [...new Set(
  dropdownQuestions
    .map(q => String(q.board || "General").trim() || "General")
    .filter(Boolean)
)].sort();

if(!boardOptionsForQuestionBuilder.includes("General")){
  boardOptionsForQuestionBuilder.unshift("General");
}
    const content = `
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
</script>
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">${editQuestion ? "Edit Question" : "Create Question"}</h1>
  ${backButton("/library")}
</div>
<div style="
  background:white;
  padding:24px;
  border-radius:14px;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  max-width:1100px;
">
  <div style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:20px;
  ">
    <div>
      <label style="font-weight:600;">Question Type</label><br>
      <select id="questionType" onchange="toggleQuestionType()" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
                <option value="mcq" ${editQuestion?.type === "mcq" ? "selected" : ""}>MCQ</option>
        <option value="coding" ${editQuestion?.type === "coding" ? "selected" : ""}>Coding</option>
      </select>
    </div>
    <div>
      <label style="font-weight:600;">Difficulty</label><br>
      <select id="difficulty" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
                <option value="easy" ${editQuestion?.difficulty === "easy" ? "selected" : ""}>Easy</option>
        <option value="medium" ${editQuestion?.difficulty === "medium" ? "selected" : ""}>Medium</option>
        <option value="hard" ${editQuestion?.difficulty === "hard" ? "selected" : ""}>Hard</option>
      </select>
    </div>
  </div>
  <div style="margin-bottom:20px;">
    <label style="font-weight:600;">Question</label><br>
    <textarea
      id="question"
      rows="5"
      placeholder="Enter question"
      style="
        width:100%;
        padding:14px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        resize:vertical;
      "
        >${editQuestion?.question || ""}</textarea>
  </div>
  <div style="
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:20px;
  ">
    <div>
      <label style="font-weight:600;">Subject</label><br>
      <select id="subject" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      ">
        <option value="">Select Subject</option>
        ${subjectOptionsForQuestionBuilder.map(subject => `
          <option value="${subject}" ${editQuestion?.subject === subject ? "selected" : ""}>${subject}</option>
        `).join("")}
      </select>
    </div>
    <div>
      <label style="font-weight:600;">Board</label><br>
      <select id="board" style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      ">
        <option value="">Select Board</option>
        ${boardOptionsForQuestionBuilder.map(board => `
          <option value="${board}" ${editQuestion?.board === board ? "selected" : ""}>${board}</option>
        `).join("")}
      </select>
    </div>
  </div>
  <div id="mcqSection">
    <h3>Options</h3>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin-bottom:18px;
    ">
            <input id="option1" value="${editQuestion?.options?.[0] || ""}" placeholder="Option 1" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option2" value="${editQuestion?.options?.[1] || ""}" placeholder="Option 2" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option3" value="${editQuestion?.options?.[2] || ""}" placeholder="Option 3" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
            <input id="option4" value="${editQuestion?.options?.[3] || ""}" placeholder="Option 4" style="
        padding:12px;
        border-radius:8px;
        border:1px solid #cbd5e1;
      ">
    </div>
    <label style="font-weight:600;">Correct Answer</label><br>
    <input
            id="correctAnswer"
      value="${editQuestion?.correct || ""}"
      placeholder="Enter exact correct option"
      style="
        width:100%;
        padding:12px;
        margin-top:6px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
      "
    />
  </div>
  <div id="codingSection" style="display:none;">
    <h3>Coding Settings</h3>
    <div style="
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:20px;
      margin-bottom:18px;
    ">
      <input
                id="functionName"
        value="${editQuestion?.codingMeta?.functionName || ""}"
        placeholder="Function Name"
        style="
          padding:12px;
          border-radius:8px;
          border:1px solid #cbd5e1;
        "
      >
<select id="language" style="
  padding:12px;
  border-radius:8px;
  border:1px solid #cbd5e1;
">
  <option value="javascript" ${editQuestion?.codingMeta?.language === "javascript" ? "selected" : ""}>JavaScript</option>
  <option value="python" ${editQuestion?.codingMeta?.language === "python" ? "selected" : ""}>Python</option>
</select>
    </div>
    <textarea
      id="starterCode"
      rows="10"
      placeholder="Starter code"
      style="
        width:100%;
        padding:14px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        box-sizing:border-box;
        resize:vertical;
        font-family:monospace;
      "
        >${editQuestion?.codingMeta?.starterCode || ""}</textarea>
            <h3 style="margin-top:20px;">Test Cases</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <input id="testInput1" value="${editQuestion?.testCases?.[0]?.input || ""}" placeholder="Test Case 1 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput1" value="${editQuestion?.testCases?.[0]?.expectedOutput || ""}" placeholder="Test Case 1 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput2" value="${editQuestion?.testCases?.[1]?.input || ""}" placeholder="Test Case 2 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput2" value="${editQuestion?.testCases?.[1]?.expectedOutput || ""}" placeholder="Test Case 2 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput3" value="${editQuestion?.testCases?.[2]?.input || ""}" placeholder="Test Case 3 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput3" value="${editQuestion?.testCases?.[2]?.expectedOutput || ""}" placeholder="Test Case 3 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testInput4" value="${editQuestion?.testCases?.[3]?.input || ""}" placeholder="Test Case 4 Input" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
      <input id="testOutput4" value="${editQuestion?.testCases?.[3]?.expectedOutput || ""}" placeholder="Test Case 4 Expected Output" style="padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
    </div>
  </div>
  <button onclick="saveQuestion()" style="
    margin-top:24px;
    padding:14px 20px;
    background:#4f46e5;
    color:white;
    border:none;
    border-radius:10px;
    font-weight:700;
    cursor:pointer;
    font-size:15px;
  ">
    Save Question
  </button>
</div>
<script>
function toggleQuestionType(){
  const type = document.getElementById("questionType").value;
  document.getElementById("mcqSection").style.display =
    type === "mcq" ? "block" : "none";
  document.getElementById("codingSection").style.display =
    type === "coding" ? "block" : "none";
}
function saveQuestion(){
  const type =
    document.getElementById("questionType").value;
    const payload = {
    questionId: "${editQuestion?._id || ""}",
    type,
    question:
      document.getElementById("question").value.trim(),
    subject:
      document.getElementById("subject").value,
    board:
      document.getElementById("board").value,
    difficulty:
      document.getElementById("difficulty").value,
    options: [],
    correct: "",
    correctAnswers: [],
    codingMeta: {
      language:
        document.getElementById("language")?.value || "javascript",
      starterCode:
        document.getElementById("starterCode")?.value || "",
      functionName:
        document.getElementById("functionName")?.value || ""
     },
    testCases: []
  };
  if(!payload.question){
    return alert("Question is required");
  }
  if(!payload.subject){
    return alert("Select subject");
  }
  if(!payload.board){
    return alert("Select board");
  }
      if(type === "coding"){
    payload.testCases = [1, 2, 3, 4].map(i => ({
      input: document.getElementById("testInput" + i).value.trim(),
      expectedOutput: document.getElementById("testOutput" + i).value.trim(),
      isHidden: i > 2
    })).filter(tc => tc.input || tc.expectedOutput);
    if(!payload.codingMeta.functionName){
      return alert("Function name required");
    }
    if(payload.testCases.length < 4){
      return alert("Add all 4 test cases");
    }
    const incomplete = payload.testCases.some(tc =>
      !tc.input || !tc.expectedOutput
    );
    if(incomplete){
      return alert("Each test case needs input and expected output");
    }
  }
  if(type === "mcq"){
    payload.options = [
      document.getElementById("option1").value.trim(),
      document.getElementById("option2").value.trim(),
      document.getElementById("option3").value.trim(),
      document.getElementById("option4").value.trim()
    ].filter(Boolean);
    payload.correct =
      document.getElementById("correctAnswer").value.trim();
    payload.correctAnswers =
      payload.correct ? [payload.correct] : [];
    if(payload.options.length < 2){
      return alert("Add at least 2 options");
    }
    if(!payload.correct){
      return alert("Correct answer required");
    }
  }
  fetch("/save-question", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Question saved");
    window.location.replace("/library");
  })
  .catch(() => {
    alert("Failed to save question");
  });
}
toggleQuestionType();
</script>
`;
    res.send(layout(content, "create-question"));
  } catch (err) {
    console.error("CREATE QUESTION PAGE ERROR:", err);
    res.send("Error loading create question page");
  }
});
// ---------- SAVE QUESTION ----------
router.post("/save-question", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
    const {
      questionId,
      type,
      question,
      options,
      correct,
      correctAnswers,
      subject,
      board,
      difficulty,
      codingMeta,
      testCases
    } = req.body;
    if(!question){
      return res.status(400).json({
        error: "Question required"
      });
    }
const questionData = {
  type: type || "mcq",
  scope: "teacher",
  teacherId: String(req.user.id),
  schoolId: req.user.schoolId || null,
  schoolCode: req.user.schoolCode || null,
      question,
      options: Array.isArray(options)
        ? options
        : [],
      correct: correct || "",
      correctAnswers: Array.isArray(correctAnswers)
        ? correctAnswers
        : [],
      subject: subject || "",
      board: board || "General",
      difficulty: difficulty || "easy",
      category: subject || "",
            codingMeta: codingMeta || {
        language: "javascript",
        starterCode: "",
        functionName: ""
      },
      testCases: Array.isArray(testCases)
        ? testCases
        : []
    };
    if(questionId){
const existingQuestion = await Question.findOne({
        _id: questionId,
        teacherId: String(req.user.id),
        scope: "teacher",
        ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      });
      if(!existingQuestion){
        return res.status(404).json({
          error: "Question not found or unauthorized"
        });
      }
      Object.assign(existingQuestion, questionData);
      await existingQuestion.save();
      return res.json({
        status: "updated",
        question: existingQuestion
      });
    }
    const newQuestion = await Question.create({
      ...questionData,
      analytics: {
        attempted: 0,
        correct: 0,
        incorrect: 0
      }
    });
    res.json({
      status: "created",
      question: newQuestion
    });
  } catch (err) {
    console.error("SAVE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to save question"
    });
  }
});
// ---------- MY QUESTIONS ----------
router.get("/my-questions", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
const teacherId = String(req.user.id);
const schoolId = req.user.schoolId || null;
const questions = await Question.find({
  scope: "teacher",
  teacherId,
  ...(schoolId ? { schoolId } : {})
})
  .select("question options correct subject board difficulty type teacherId scope analytics createdAt")
  .sort({ createdAt: -1 })
  .limit(1000)
  .lean();
    const content = `
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
</script>
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
">
  <h1 style="margin:0;">Manage Questions</h1>
  ${backButton("/library")}
</div>
<div style="
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:22px;
  align-items:stretch;
  height:calc(100vh - 180px);
  min-height:620px;
">
  <div style="
    background:white;
    padding:20px;
    border-radius:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.08);
    overflow-y:auto;
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:18px;
    ">
      <h2 style="margin:0;">My Questions</h2>
      <button onclick="go('/create-question')" style="
        padding:10px 14px;
        background:#4f46e5;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:600;
        cursor:pointer;
      ">
        + Create
      </button>
    </div>
    <div id="questionList"></div>
  </div>
  <div
    id="questionPreview"
    style="
      background:white;
      padding:22px;
      border-radius:14px;
      box-shadow:0 4px 12px rgba(0,0,0,0.08);
      overflow-y:auto;
    "
  >
    <h2 style="margin-top:0;">Question Preview</h2>
    <p style="color:#64748b;">
      Select a question to preview it here.
    </p>
  </div>
</div>
<script>
const allQuestions = ${JSON.stringify(questions)};
const user = JSON.parse(localStorage.getItem("user") || "null");
const teacherId = user?._id || user?.id;
const questions = allQuestions.filter(q =>
  String(q.teacherId) === String(teacherId)
);
function toTitleCase(value){
  return String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\\b\\w/g, letter => letter.toUpperCase());
}
function renderMyQuestions(){
  const list = document.getElementById("questionList");
  if(!list){
    return;
  }
  if(!questions.length){
    list.innerHTML = "<p style='color:#64748b;'>No questions created yet.</p>";
    return;
  }
  list.innerHTML = questions.map(q => {
    return "" +
      "<div onclick=\\"previewQuestion('" + q._id + "')\\" style=\\"" +
        "background:#f8fafc;" +
        "padding:16px;" +
        "border-radius:12px;" +
        "border:1px solid #e5e7eb;" +
        "margin-bottom:14px;" +
        "cursor:pointer;" +
        "display:flex;" +
        "justify-content:space-between;" +
        "align-items:flex-start;" +
        "gap:16px;" +
      "\\">" +
        "<div style=\\"min-width:0;flex:1;\\">" +
          "<div style=\\"font-weight:700;margin-bottom:8px;line-height:1.4;\\">" +
            (q.question || "Untitled Question") +
          "</div>" +
          "<div style=\\"display:flex;gap:8px;flex-wrap:wrap;\\">" +
            "<span style=\\"background:#4f46e5;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              toTitleCase(q.subject || "No Subject") +
            "</span>" +
            "<span style=\\"background:#0f172a;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              String(q.type || "mcq").toUpperCase() +
            "</span>" +
            "<span style=\\"background:#16a34a;color:white;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;\\">" +
              toTitleCase(q.difficulty || "easy") +
            "</span>" +
          "</div>" +
        "</div>" +
        "<div style=\\"display:flex;gap:10px;flex-shrink:0;align-items:center;\\">" +
          "<button onclick=\\"event.stopPropagation(); editQuestion('" + q._id + "')\\" style=\\"padding:8px 12px;background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;\\">Edit</button>" +
          "<button onclick=\\"event.stopPropagation(); deleteQuestion('" + q._id + "')\\" style=\\"padding:8px 12px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;\\">Delete</button>" +
        "</div>" +
      "</div>";
  }).join("");
}
function previewQuestion(id){
  const q = questions.find(item =>
    String(item._id) === String(id)
  );
  if(!q){
    return;
  }
  const optionsHtml =
    q.options && q.options.length
      ? q.options.map((opt, index) =>
          "<div style='background:#f8fafc;padding:10px;border-radius:8px;margin:8px 0;'>" +
          "<b>Option " + (index + 1) + ":</b> " + opt +
          "</div>"
        ).join("")
      : "<p style='color:#64748b;'>No options found.</p>";
  document.getElementById("questionPreview").innerHTML =
    "<h2 style='margin-top:0;'>Question Preview</h2>" +
    "<div style='background:#f8fafc;padding:16px;border-radius:12px;margin-bottom:18px;'>" +
      "<b>Question</b>" +
      "<div style='margin-top:10px;line-height:1.6;'>" +
        (q.question || "No question") +
      "</div>" +
    "</div>" +
    "<div style='margin-bottom:18px;'>" +
      optionsHtml +
    "</div>" +
    "<div style='background:#ecfdf5;padding:14px;border-radius:10px;margin-bottom:14px;'>" +
      "<b>Correct Answer:</b> " +
      (q.correct || "N/A") +
    "</div>" +
    "<p><b>Subject:</b> " + toTitleCase(q.subject || "N/A") + "</p>" +
    "<p><b>Board:</b> " + toTitleCase(q.board || "N/A") + "</p>" +
    "<p><b>Difficulty:</b> " + toTitleCase(q.difficulty || "N/A") + "</p>" +
    "<p><b>Type:</b> " + String(q.type || "mcq").toUpperCase() + "</p>" +
    "<div style='background:#eef2ff;padding:14px;border-radius:10px;margin-top:18px;'>" +
      "<b>Analytics</b><br><br>" +
      "Attempted: " + (q.analytics?.attempted || 0) + "<br>" +
      "Correct: " + (q.analytics?.correct || 0) + "<br>" +
      "Incorrect: " + (q.analytics?.incorrect || 0) +
    "</div>";
}
function editQuestion(id){
  window.location.replace("/create-question?id=" + id);
}
function deleteQuestion(id){
  if(!confirm("Delete this question?")){
    return;
  }
  fetch("/delete-question", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      alert(data.error);
      return;
    }
    alert("Question deleted");
    location.reload();
  })
  .catch(() => {
    alert("Delete failed");
  });
}
renderMyQuestions();
</script>
`;
    res.send(layout(content, "my-questions"));
  } catch (err) {
    console.error("MY QUESTIONS ERROR:", err);
    res.send("Error loading questions");
  }
});
// ---------- UPDATE QUESTION ----------
router.post("/update-question", authMiddleware, async (req, res) => {
  res.json({
    status: "placeholder"
  });
});
// ---------- DELETE QUESTION ----------
router.post("/delete-question", authMiddleware, async (req, res) => {
  try {
    const Question = require("../models/Question");
    const { id } = req.body;
    if(!id){
      return res.status(400).json({
        error: "Missing question id"
      });
    }
const question = await Question.findOne({
      _id: id,
      teacherId: String(req.user.id),
      scope: "teacher",
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    if(!question){
      return res.status(404).json({
        error: "Question not found or unauthorized"
      });
    }
await Question.deleteOne({
      _id: id,
      teacherId: String(req.user.id),
      scope: "teacher",
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    });
    res.json({
      status: "deleted"
    });
  } catch (err) {
    console.error("DELETE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to delete question"
    });
  }
});

module.exports = router;
