const express = require("express");
const router = express.Router();
const Test = require("../../models/Test");
const Student = require("../../models/Student");
const ClassModel = require("../../models/Class");
const User = require("../../models/User");
const Result = require("../../models/Result");
const ClassSubject = require("../../models/ClassSubject");
const layout = require("../../views/layout");
const backButton = require("../../views/backButton");
const authMiddleware = require("../../middleware/auth");
const { escapeHtml, escapeAttribute, safeJsonForScript } = require("../../utils/html");
function teacherGuardScript() {
  return `
<script>
const pageUser = JSON.parse(localStorage.getItem("user") || "null");
if(!pageUser || pageUser.role !== "teacher"){
  window.location.replace("/");
}
</script>
`;
}

// ---------- VIEW STUDENTS ----------
router.get("/students", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return res.status(403).send("Access denied");
    }

    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;

    const students = await Student.find({
      teacherId,
      ...(schoolId ? { schoolId } : {})
    })
      .select("name class studentId teacherId")
      .sort({ class: 1, name: 1 })
      .lean();

    const rows = students.map(s => {
      const studentIdForAttribute = escapeAttribute(s.studentId || "");
      return `
<tr
class="teacher-student-row"
data-student-id="${studentIdForAttribute}"
style="cursor:pointer;"
>
<td>${escapeHtml(s.name || "-")}</td>
<td>${escapeHtml(s.class || "-")}</td>
<td>${escapeHtml(s.studentId || "-")}</td>
<td>${escapeHtml(req.user.name || req.user.email || "Teacher")}</td>
</tr>
`;
    }).join("");

    const content = `
<h1 style="margin-bottom:20px;">Students</h1>
<table border="1" cellpadding="10"
style="
width:100%;
background:white;
border-collapse:collapse;
border-radius:12px;
overflow:hidden;
">
<tr>
<th>Name</th>
<th>Class</th>
<th>Student ID</th>
<th>Teacher</th>
</tr>
<tbody>
${rows || "<tr><td colspan='4'>No students found</td></tr>"}
</tbody>
</table>
<script>
function viewStudent(studentId){
  window.location.replace(
    "/student?studentId=" + encodeURIComponent(studentId || "")
  );
}

document.querySelectorAll(".teacher-student-row").forEach(row => {
  row.addEventListener("click", function(){
    viewStudent(this.dataset.studentId || "");
  });
});
</script>
`;
    res.send(layout(content, "students"));
  } catch (err) {
    console.error("TEACHER STUDENTS PAGE ERROR:", err);
    res.send("Error loading students");
  }
});
// ---------- VIEW CLASSES ----------
router.get("/classes", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return res.redirect("/");
    }
    const content = `
${teacherGuardScript()}
<div style="
display:flex;
justify-content:space-between;
align-items:center;
gap:14px;
margin-bottom:20px;
">
  <h1 style="margin:0;">Classes</h1>
  ${backButton("/teacher")}
</div>
<div style="
display:flex;
gap:12px;
align-items:center;
margin-bottom:20px;
flex-wrap:wrap;
">
  <div style="position:relative;min-width:180px;">
    <button
      id="classFilterButton"
      type="button"
      class="teacher-dropdown-toggle"
      data-dropdown-id="classFilter"
      style="
        width:100%;
        padding:10px;
        border-radius:8px;
        border:1px solid #cbd5e1;
        background:white;
        cursor:pointer;
        text-align:left;
        display:flex;
        justify-content:space-between;
        align-items:center;
        box-sizing:border-box;
      "
    >
      <span id="classFilterLabel">All Classes</span>
      <span>▾</span>
    </button>
    <div
      id="classFilterMenu"
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
    <input id="classFilter" type="hidden" value="all">
  </div>
  <input
    id="studentSearch"
    placeholder="Search student name or ID"
    style="
      padding:10px;
      border-radius:8px;
      border:1px solid #cbd5e1;
      min-width:280px;
    "
  />
  <button id="classSearchButton" style="
    padding:10px 14px;
    background:#e0633a;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Search
  </button>
  <button id="clearClassFiltersButton" style="
    padding:10px 14px;
    background:#64748b;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Clear Filters
  </button>
</div>
<div id="classContainer"></div>
<div id="classPagination" style="margin-top:16px;"></div>
<script>
window.onload = function(){
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
function jsString(value){
  return JSON.stringify(String(value || ""));
}
function closeCustomDropdowns(){
  document.querySelectorAll("[id$='Menu']").forEach(menu => {
    menu.style.display = "none";
  });
}
window.toggleCustomDropdown = function(inputId){
  const menu = document.getElementById(inputId + "Menu");
  if(!menu){
    return;
  }
  const isOpen = menu.style.display === "block";
  closeCustomDropdowns();
  menu.style.display = isOpen ? "none" : "block";
};
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
  const clickedInsideDropdown =
    event.target.closest("[id$='Button']") ||
    event.target.closest("[id$='Menu']");
  if(!clickedInsideDropdown){
    closeCustomDropdowns();
  }
});
const user = JSON.parse(localStorage.getItem("user") || "null");
if(!user){
return window.location.replace("/");
}
let classesData = [];
let studentsData = [];
let teachersData = [];
let resultsData = [];
let paginationData = null;
let dropdownReady = false;
window.loadClasses = function(page){
  const selectedClass = document.getElementById("classFilter").value || "all";
  const search = document.getElementById("studentSearch").value || "";
  const params = new URLSearchParams({
    studentPage: String(page || 1),
    studentLimit: "100",
    className: selectedClass,
    search
  });
  document.getElementById("classContainer").innerHTML =
    "<p style='color:#64748b;'>Loading classes...</p>";
  fetch("/api/classes-data?" + params.toString())
    .then(res => {
      if(!res.ok){
        throw new Error("Failed to load classes");
      }
      return res.json();
    })
    .then(data => {
      classesData = data.classes || [];
      studentsData = data.students || [];
      teachersData = data.teachers || [];
      resultsData = data.results || [];
      paginationData = data.pagination?.students || null;
      setupClassDropdown();
      renderClasses();
      renderPagination();
    })
    .catch(err => {
      console.error("CLASSES LOAD ERROR:", err);
      document.getElementById("classContainer").innerHTML =
        "<p style='color:#dc2626;'>Failed to load classes. Please refresh.</p>";
    });
};
function setupClassDropdown(){
  if(dropdownReady){
    return;
  }
  const uniqueNames = [...new Set(
    classesData.map(c => c.name).filter(Boolean)
  )];
  let selected = localStorage.getItem("selectedClass") || "all";
  if(selected !== "all" && !uniqueNames.includes(selected)){
    selected = "all";
    localStorage.setItem("selectedClass", "all");
  }
  setCustomDropdownOptions(
    "classFilter",
    [
      { value: "all", label: "All Classes" },
      ...uniqueNames.map(name => ({
        value: name,
        label: name
      }))
    ],
    function(value){
      localStorage.setItem("selectedClass", value);
      loadClasses(1);
    }
  );
  document.getElementById("classFilter").value = selected;
  document.getElementById("classFilterLabel").textContent =
    selected === "all" ? "All Classes" : selected;
  dropdownReady = true;
}
function renderClasses(){
  const teacherMap = {};
  teachersData.forEach(t => {
    teacherMap[t._id] = t.name;
  });
  const selected = document.getElementById("classFilter").value || "all";
const teacherResults = resultsData;
  const visibleClasses = classesData.filter(c => {
    if(selected === "all") return true;
    return String(c.name || "") === String(selected);
  });
  let html = "";
  visibleClasses.forEach(c => {
const classStudents = studentsData.filter(s =>
 String(s.class || "").trim().toUpperCase() ===
 String(c.name || "").trim().toUpperCase()
);
    const studentCards = classStudents.length
      ? classStudents.map(s => {
        const safeStudentId = jsString(s.studentId);
        return \`
<div
class="class-student-card"
data-student-id="\${escapeHtml(s.studentId || "")}"
style="
background:#f8fafc;
padding:12px;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
  <div style="font-weight:700;margin-bottom:4px;">
    \${escapeHtml(s.name || "No Name")}
  </div>
  <div style="font-size:12px;color:#64748b;">
    ID: \${escapeHtml(s.studentId)}
  </div>
</div>
\`;
      }).join("")
      : "<p style='color:gray;'>No students on this page</p>";
    html += \`
<div style="
background:white;
padding:20px;
margin-bottom:20px;
border-radius:16px;
box-shadow:0 4px 12px rgba(0,0,0,0.06);
">
  <div style="
    background:linear-gradient(135deg,#e0633a,#c9542e);
    color:white;
    padding:18px 20px;
    border-radius:14px;
    margin-bottom:18px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:12px;
  ">
    <div>
      <h2 style="margin:0 0 6px 0;">Class: \${escapeHtml(c.name)}</h2>
      <div style="font-size:14px;opacity:0.9;">
        Teacher: \${escapeHtml(teacherMap[c.teacherId] || "Unknown")}
      </div>
    </div>
    <div style="
      background:rgba(255,255,255,0.18);
      padding:10px 14px;
      border-radius:10px;
      font-weight:700;
    ">
      Students on page: \${classStudents.length}
    </div>
  </div>
  <div style="
    display:grid;
    grid-template-columns:minmax(260px,360px) 1fr;
    gap:20px;
    align-items:start;
  ">
    <div>
      <h3 style="margin-top:0;">Students</h3>
      <div style="
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        height:520px;
        overflow-y:auto;
        padding-right:6px;
      ">
        \${studentCards}
      </div>
    </div>
    <div
      id="preview-\${escapeHtml(c.name)}"
      class="studentPreview"
      style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        height:520px;
        overflow-y:auto;
        box-sizing:border-box;
      "
    >
      <p style="color:#64748b;margin:0;">
        Select a student to preview performance and download report.
      </p>
    </div>
  </div>
</div>
\`;
  });
  document.getElementById("classContainer").innerHTML =
    html || "<p style='color:#64748b;'>No matching students found.</p>";
  if(!classesData.length){
    document.getElementById("classContainer").innerHTML =
      "<p style='color:#64748b;'>No classes mapped to this teacher.</p>";
  }
  window.previewStudent = function(studentId){
    const student = studentsData.find(s =>
      String(s.studentId) === String(studentId)
    );
    if(!student){
      return;
    }
    const studentResults = teacherResults
      .filter(r => String(r.studentId) === String(studentId))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    document.querySelectorAll(".studentPreview").forEach(p => {
      p.innerHTML =
        "<p style='color:#64748b;margin:0;'>Select a student to preview performance and download report.</p>";
    });
    const box = document.getElementById("preview-" + student.class);
    if(!box){
      return;
    }
    const safeStudentId = jsString(student.studentId);
    const resultCards = studentResults.length
      ? studentResults.map(r => {
        const percent = r.total
          ? Math.round((r.score / r.total) * 100)
          : 0;
        const color =
          percent >= 70
            ? "#16a34a"
            : percent >= 40
            ? "#ca8a04"
            : "#dc2626";
        const date = r.date
          ? new Date(r.date).toLocaleString()
          : "N/A";
        return \`
<div
class="student-result-preview-card"
data-test-id="\${escapeHtml(r.testId || "")}"
data-student-id="\${escapeHtml(student.studentId || "")}"
data-class-name="\${escapeHtml(student.class || "")}"
style="
background:white;
padding:14px;
margin:10px 0;
border-radius:10px;
cursor:pointer;
border:1px solid #e5e7eb;
"
>
  <div style="display:flex;justify-content:space-between;gap:10px;">
    <b>\${escapeHtml(r.testName || "Unnamed Test")}</b>
    <b style="color:\${color};">\${percent}%</b>
  </div>
  <div style="margin-top:6px;font-size:13px;">
    Score: <b>\${r.score}/\${r.total}</b>
  </div>
  <div style="font-size:12px;color:#64748b;margin-top:4px;">
    \${escapeHtml(date)}
  </div>
</div>
\`;
      }).join("")
      : "<p style='color:#64748b;'>No results found for this student.</p>";
    box.innerHTML = \`
<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:12px;
margin-bottom:15px;
">
  <div>
    <h2 style="margin:0 0 6px 0;">\${escapeHtml(student.name || "No Name")}</h2>
    <p style="margin:0;color:#64748b;">ID: \${escapeHtml(student.studentId)}</p>
    <p style="margin:4px 0 0 0;color:#64748b;">Class: \${escapeHtml(student.class)}</p>
  </div>
  <button
    class="download-student-report-button"
    data-student-id="\${escapeHtml(student.studentId || "")}"
    style="
    padding:10px 14px;
    background:#e0633a;
    color:white;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:700;
  ">
    Download Report
  </button>
</div>
<h3>Performance History</h3>
\${resultCards}
\`;
  };
}
function renderPagination(){
  const paginationBox = document.getElementById("classPagination");
  if(!paginationData || paginationData.totalPages <= 1){
    paginationBox.innerHTML = "";
    return;
  }
  paginationBox.innerHTML = \`
<div style="
display:flex;
gap:10px;
align-items:center;
justify-content:flex-end;
background:white;
padding:12px;
border-radius:10px;
box-shadow:0 4px 12px rgba(0,0,0,0.06);
">
  <button
    \${paginationData.hasPrevPage ? "" : "disabled"}
    class="class-pagination-button"
    data-page="\${paginationData.page - 1}"
    style="
      padding:8px 12px;
      border:none;
      border-radius:8px;
      background:#64748b;
      color:white;
      cursor:pointer;
      opacity:\${paginationData.hasPrevPage ? "1" : "0.5"};
    "
  >
    Previous
  </button>
  <span style="font-weight:700;color:#334155;">
    Page \${paginationData.page} of \${paginationData.totalPages}
  </span>
  <button
    \${paginationData.hasNextPage ? "" : "disabled"}
    class="class-pagination-button"
    data-page="\${paginationData.page + 1}"
    style="
      padding:8px 12px;
      border:none;
      border-radius:8px;
      background:#e0633a;
      color:white;
      cursor:pointer;
      opacity:\${paginationData.hasNextPage ? "1" : "0.5"};
    "
  >
    Next
  </button>
</div>
\`;
}
window.clearClassFilters = function(){
  document.getElementById("studentSearch").value = "";
  document.getElementById("classFilter").value = "all";
  document.getElementById("classFilterLabel").textContent = "All Classes";
  localStorage.setItem("selectedClass", "all");
  loadClasses(1);
};
document.addEventListener("click", function(event){
  const studentCard = event.target.closest(".class-student-card");
  if(studentCard){
    previewStudent(studentCard.dataset.studentId || "");
    return;
  }

  const resultCard = event.target.closest(".student-result-preview-card");
  if(resultCard){
    loadResultPreview(
      resultCard.dataset.testId || "",
      resultCard.dataset.studentId || "",
      resultCard.dataset.className || ""
    );
    return;
  }

  const downloadButton = event.target.closest(".download-student-report-button");
  if(downloadButton){
    downloadStudentReport(downloadButton.dataset.studentId || "");
    return;
  }

  const paginationButton = event.target.closest(".class-pagination-button");
  if(paginationButton && !paginationButton.disabled){
    loadClasses(Number(paginationButton.dataset.page || 1));
    return;
  }

  const dropdownToggle = event.target.closest(".teacher-dropdown-toggle");
  if(dropdownToggle){
    toggleCustomDropdown(dropdownToggle.dataset.dropdownId || "");
    return;
  }

  const clearClassFiltersButton = event.target.closest("#clearClassFiltersButton");
  if(clearClassFiltersButton){
    clearClassFilters();
  }
});
const classSearchButton = document.getElementById("classSearchButton");
if(classSearchButton){
  classSearchButton.addEventListener("click", function(){
    loadClasses(1);
  });
}
document.getElementById("studentSearch").addEventListener("keydown", function(event){
  if(event.key === "Enter"){
    loadClasses(1);
  }
});
window.downloadStudentReport = function(studentId){
fetch("/api/reports/student/download", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ studentId })
  })
  .then(res => {
    if(!res.ok){
      throw new Error("Download failed");
    }
    return res.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
  })
  .catch(() => alert("Download failed"));
};
window.loadResultPreview = function(testId, studentId, className){
  fetch(
    "/result?testId=" +
    encodeURIComponent(testId) +
    "&studentId=" +
    encodeURIComponent(studentId)
  )
  .then(res => res.text())
  .then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    if(doc.body){
      doc.body.querySelectorAll("button").forEach(button => {
        if((button.textContent || "").trim() === "Back"){
          button.remove();
        }
      });
    }
    const body = doc.body ? doc.body.innerHTML : html;
    const box = document.getElementById("preview-" + className);
    if(box){
      box.innerHTML =
        '<div style="margin-bottom:12px;">' +
        '<button id="backToStudentButton" type="button" style="' +
        'padding:8px 12px;' +
        'background:#e0633a;' +
        'color:white;' +
        'border:none;' +
        'border-radius:8px;' +
        'cursor:pointer;' +
        'font-weight:700;' +
        '">' +
        '← Back to Student' +
        '</button>' +
        '</div>' +
        '<div>' +
        body +
        '</div>';
      const backButton = document.getElementById("backToStudentButton");
      if(backButton){
        backButton.addEventListener("click", function(){
          previewStudent(studentId);
        });
      }
    }
  })
  .catch(() => alert("Failed to load result"));
};
loadClasses(1);
};
</script>
`;
    res.send(layout(content, "classes"));
  } catch (err) {
    console.error(err);
    res.send("Error loading classes");
  }
});
// ---------- CLASSES DATA API ----------
router.get("/api/classes-data", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return res.status(403).json({
        error: "Access denied"
      });
    }
    const ClassSubject = require("../../models/ClassSubject");
    const teacherId = String(req.user.id);
    const schoolId = req.user.schoolId || null;
    const schoolScopedFilter = schoolId
      ? { teacherId, schoolId }
      : { teacherId };
    const classSubjects = await ClassSubject.find(schoolScopedFilter)
      .select("className teacherId schoolId")
      .lean();
    const assignedClassNames = [...new Set(
      classSubjects
        .map(m => String(m.className || "").trim().toUpperCase())
        .filter(Boolean)
    )];
    const selectedClassName = String(req.query.className || "all")
      .trim()
      .toUpperCase();
    const search = String(req.query.search || "").trim();
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchFilter = search
      ? {
          $or: [
            { name: { $regex: escapedSearch, $options: "i" } },
            { studentId: { $regex: escapedSearch, $options: "i" } }
          ]
        }
      : {};
    const classFilter =
      selectedClassName && selectedClassName !== "ALL"
        ? { class: selectedClassName }
        : { class: { $in: assignedClassNames } };
    const classLookupFilter = {
      name: { $in: assignedClassNames },
      ...(schoolId ? { schoolId } : {})
    };
    const mappedClassDocs = assignedClassNames.map(className => ({
      _id: className,
      name: className,
      teacherId,
      studentIds: [],
      createdAt: null
    }));
    const studentPage = Math.max(parseInt(req.query.studentPage || "1"), 1);
    const studentLimit = Math.min(
      Math.max(parseInt(req.query.studentLimit || "100"), 1),
      500
    );
    const studentSkip = (studentPage - 1) * studentLimit;
    const studentQuery = {
      ...schoolScopedFilter,
      ...classFilter,
      ...searchFilter
    };
    const [classes, students, totalStudents, teachers, results] =
      await Promise.all([
        assignedClassNames.length
          ? ClassModel.find(classLookupFilter)
              .select("name createdAt")
              .sort({ name: 1 })
              .lean()
          : [],
        assignedClassNames.length
          ? Student.find(studentQuery)
              .select("studentId name class teacherId")
              .sort({ class: 1, name: 1 })
              .skip(studentSkip)
              .limit(studentLimit)
              .lean()
          : [],
        assignedClassNames.length
          ? Student.countDocuments(studentQuery)
          : 0,
        User.find({
          _id: teacherId,
          role: "teacher",
          ...(schoolId ? { schoolId } : {})
        })
          .select("name role")
          .lean(),
        Result.find(schoolScopedFilter)
          .select("studentId testId testName teacherId score total date")
          .sort({ date: -1 })
          .limit(500)
          .lean()
      ]);
    const classDocMap = {};
    classes.forEach(c => {
      classDocMap[String(c.name || "").trim().toUpperCase()] = c;
    });
    const mappedClasses = mappedClassDocs.map(mappedClass => ({
      ...(classDocMap[mappedClass.name] || mappedClass),
      teacherId
    }));
    res.json({
      classes: mappedClasses,
      students,
      teachers,
      results,
      pagination: {
        students: {
          page: studentPage,
          limit: studentLimit,
          total: totalStudents,
          totalPages: Math.ceil(totalStudents / studentLimit),
          hasNextPage: studentPage * studentLimit < totalStudents,
          hasPrevPage: studentPage > 1
        }
      }
    });
  } catch (err) {
    console.error("CLASSES DATA API ERROR:", err);
    res.status(500).json({
      error: "Failed to load classes data"
    });
  }
});

module.exports = router;
