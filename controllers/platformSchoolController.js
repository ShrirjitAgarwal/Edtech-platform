const bcrypt = require("bcrypt");
const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const ClassSubject = require("../models/ClassSubject");
const {
  validatePasswordPolicy
} = require("../utils/passwordPolicy");
const Test = require("../models/Test");
const Assignment = require("../models/Assignment");
const Result = require("../models/Result");
const Question = require("../models/Question");
const UsageEvent = require("../models/UsageEvent");
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function normalizeSchoolCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}
function buildPlatformMessage(req) {
  const errorMessage = String(req.query.error || "").trim();
  const successMessage = String(req.query.success || "").trim();
  if (errorMessage) {
    return `
      <div style="
        background:#fee2e2;
        color:#991b1b;
        border:1px solid #fecaca;
        padding:14px 16px;
        border-radius:10px;
        font-weight:700;
        margin-bottom:18px;
      ">
        ${escapeHtml(errorMessage)}
      </div>
    `;
  }
  if (successMessage) {
    return `
      <div style="
        background:#dcfce7;
        color:#166534;
        border:1px solid #bbf7d0;
        padding:14px 16px;
        border-radius:10px;
        font-weight:700;
        margin-bottom:18px;
      ">
        ${escapeHtml(successMessage)}
      </div>
    `;
  }
  return "";
}
function formatPlanLabel(value) {
  const text = String(value || "trial").trim();
  return text
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLimitValue(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return "N/A";
  }
  return String(numberValue);
}

function formatFeatureStatus(value) {
  return value ? "On" : "Off";
}

function formatEnforcementStatus(limitEnforcement = {}) {
  const enabled = [];

  if (limitEnforcement.enforceAdminLimit) {
    enabled.push("Admins");
  }
  if (limitEnforcement.enforceTeacherLimit) {
    enabled.push("Teachers");
  }
  if (limitEnforcement.enforceStudentLimit) {
    enabled.push("Students");
  }
  if (limitEnforcement.enforceTestLimit) {
    enabled.push("Tests");
  }
  if (limitEnforcement.enforceCodeRunLimit) {
    enabled.push("Code Runs");
  }

  return enabled.length ? enabled.join(", ") : "Off";
}
function selectedAttribute(currentValue, optionValue) {
  return String(currentValue || "") === String(optionValue || "") ? "selected" : "";
}

function checkedAttribute(value) {
  return value ? "checked" : "";
}

function renderLimitInput(name, label, value, helpText) {
  return `
    <div style="
      background:white;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:12px;
    ">
      <label style="
        display:block;
        font-weight:800;
        margin:0 0 6px 0;
        color:#0f172a;
      ">
        ${escapeHtml(label)}
      </label>
      <input
        name="${escapeHtml(name)}"
        type="number"
        min="0"
        value="${escapeHtml(formatLimitValue(value))}"
        placeholder="${escapeHtml(label)}"
        style="width:100%;padding:10px;margin-bottom:6px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
      />
      ${
        helpText
          ? `<div style="font-size:12px;color:#64748b;line-height:1.4;">${escapeHtml(helpText)}</div>`
          : ""
      }
    </div>
  `;
}

function normalizeEnumValue(value, allowedValues, fallbackValue) {
  const text = String(value || "").trim().toLowerCase();
  return allowedValues.includes(text) ? text : fallbackValue;
}

function normalizeLimitNumber(value, fallbackValue) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallbackValue;
  }
  return Math.floor(numberValue);
}
function getSchoolLimitValue(school, fieldName, fallbackValue) {
  const numberValue = Number(school && school[fieldName]);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallbackValue;
  }
  return Math.floor(numberValue);
}
function buildLimitWarning(label, usedValue, limitValue) {
  const used = Number(usedValue);
  const limit = Number(limitValue);

  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return "";
  }

  const percentage = Math.round((used / limit) * 100);

  if (percentage < 80) {
    return "";
  }

  const isExceeded = used >= limit;
  const background = isExceeded ? "#fee2e2" : "#fef3c7";
  const border = isExceeded ? "#fecaca" : "#fde68a";
  const color = isExceeded ? "#991b1b" : "#92400e";
  const message = isExceeded
    ? "Limit reached or exceeded. This is warning-only; users are not blocked yet."
    : "Approaching limit. This is warning-only; users are not blocked yet.";

  return `
    <div style="
      background:${background};
      border:1px solid ${border};
      color:${color};
      padding:12px 14px;
      border-radius:10px;
      margin-bottom:10px;
      font-weight:700;
    ">
      ${escapeHtml(label)}: ${escapeHtml(used)} / ${escapeHtml(limit)}
      (${escapeHtml(percentage)}%) — ${escapeHtml(message)}
    </div>
  `;
}

function renderLimitWarnings(warnings = []) {
  const visibleWarnings = warnings.filter(Boolean);

  if (!visibleWarnings.length) {
    return "";
  }

  return `
    <div style="
      margin-bottom:28px;
      padding:16px;
      background:#fff7ed;
      border:1px solid #fed7aa;
      border-radius:14px;
    ">
      <h2 style="margin:0 0 12px 0;color:#9a3412;">Limit Warnings</h2>
      <p style="margin:0 0 12px 0;color:#9a3412;">
        These are advisory warnings only. No school users are blocked by these warnings.
      </p>
      ${visibleWarnings.join("")}
    </div>
  `;
}
exports.listSchoolsPage = async (req, res) => {
  try {
    const platformMessage = buildPlatformMessage(req);
    const schools = await School.find({})
      .sort({ createdAt: -1 })
      .lean();
    const admins = await User.find({
      role: "admin",
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    })
      .select("name email schoolId schoolCode createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const adminsBySchoolCode = {};
    admins.forEach(admin => {
      const code = String(admin.schoolCode || "");
      if (!adminsBySchoolCode[code]) {
        adminsBySchoolCode[code] = [];
      }
      adminsBySchoolCode[code].push(admin);
    });
    const schoolRows = schools.length
      ? `
        <div style="
          overflow-x:auto;
          border:1px solid #e5e7eb;
          border-radius:14px;
          background:white;
        ">
          <div style="min-width:1180px;">
            <div class="platform-school-table-header" style="
              display:grid;
              grid-template-columns:2fr 1fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 1.2fr 1.6fr;
              gap:10px;
              padding:12px 14px;
              background:#e2e8f0;
              color:#334155;
              font-size:12px;
              font-weight:900;
              text-transform:uppercase;
              letter-spacing:0.03em;
            ">
              <div>School</div>
              <div>Code</div>
              <div>Status</div>
              <div>Plan</div>
              <div>Billing</div>
              <div>Admins</div>
              <div>Teachers</div>
              <div>Students</div>
              <div>Tests</div>
              <div>Code Runs</div>
              <div>Actions</div>
            </div>
            ${schools.map(school => {
              const schoolAdmins = adminsBySchoolCode[String(school.code || "")] || [];
              const features = school.featuresEnabled || {};
              const enforcement = school.limitEnforcement || {};
              const maxAdmins = getSchoolLimitValue(school, "maxAdmins", 2);
              const maxTeachers = getSchoolLimitValue(school, "maxTeachers", 10);
              const maxStudents = getSchoolLimitValue(school, "maxStudents", 200);
              const maxTests = getSchoolLimitValue(school, "maxTests", 100);
              const maxAssignments = getSchoolLimitValue(school, "maxAssignments", 500);
              const maxMonthlyCodeRuns = getSchoolLimitValue(school, "maxMonthlyCodeRuns", 1000);

              return `
                <div
                  class="platform-school-card"
                  data-school-name="${escapeHtml(school.name)}"
                  data-school-code="${escapeHtml(school.code)}"
                  style="
                    border-top:1px solid #e5e7eb;
                    background:#ffffff;
                  "
                >
                  <div class="platform-school-row" style="
                    display:grid;
                    grid-template-columns:2fr 1fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 1.2fr 1.6fr;
                    gap:10px;
                    align-items:center;
                    padding:14px;
                    color:#0f172a;
                    font-size:13px;
                  ">
                    <div>
                      <div style="font-weight:900;font-size:14px;">
                        ${escapeHtml(school.name)}
                      </div>
                      <div style="color:#64748b;font-size:12px;margin-top:3px;">
                        Enforcement: ${escapeHtml(formatEnforcementStatus(enforcement))}
                      </div>
                    </div>
                    <div style="font-weight:800;color:#334155;">
                      ${escapeHtml(school.code)}
                    </div>
                    <div>
                      <span style="
                        display:inline-block;
                        padding:4px 8px;
                        border-radius:999px;
                        background:#dcfce7;
                        color:#166534;
                        font-weight:900;
                        font-size:12px;
                      ">
                        ${escapeHtml(school.status || "active")}
                      </span>
                    </div>
                    <div>${escapeHtml(formatPlanLabel(school.plan))}</div>
                    <div>${escapeHtml(formatPlanLabel(school.billingStatus))}</div>
                    <div>
                      <b>${escapeHtml(schoolAdmins.length)}</b> / ${escapeHtml(formatLimitValue(maxAdmins))}
                    </div>
                    <div>
                      Limit ${escapeHtml(formatLimitValue(maxTeachers))}
                    </div>
                    <div>
                      Limit ${escapeHtml(formatLimitValue(maxStudents))}
                    </div>
                    <div>
                      Limit ${escapeHtml(formatLimitValue(maxTests))}
                    </div>
                    <div>
                      Limit ${escapeHtml(formatLimitValue(maxMonthlyCodeRuns))}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                      <a
                        href="/platform/schools/${school._id}/usage"
                        style="
                          display:inline-block;
                          padding:8px 10px;
                          background:#0f172a;
                          color:white;
                          text-decoration:none;
                          border-radius:8px;
                          font-weight:900;
                          font-size:12px;
                        "
                      >
                        Usage
                      </a>
                      <form
                        method="POST"
                        action="/platform/schools/${school._id}/delete"
                        onsubmit="return confirm('Delete this school? This is only allowed if the school has no users, students, classes, subjects, mappings, or tests.');"
                        style="margin:0;"
                      >
                        <button type="submit" style="
                          padding:8px 10px;
                          background:#dc2626;
                          color:white;
                          border:none;
                          border-radius:8px;
                          font-weight:900;
                          cursor:pointer;
                          font-size:12px;
                        ">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  <div style="
                    display:block;
                    padding:0 14px 14px 14px;
                  ">
                    <details style="
                      width:100%;
                      background:#f8fafc;
                      border:1px solid #e2e8f0;
                      border-radius:10px;
                      padding:10px 12px;
                      box-sizing:border-box;
                      margin-bottom:10px;
                    ">
                      <summary style="cursor:pointer;font-weight:900;color:#1e293b;">
                        Edit school plan, limits, features, and enforcement
                      </summary>

                      <form method="POST" action="/platform/schools/${school._id}/update" style="margin-top:14px;">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                            <label style="display:block;font-weight:800;margin-bottom:6px;">School Name</label>
                            <input
                              name="name"
                              value="${escapeHtml(school.name)}"
                              placeholder="School name"
                              required
                              style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                            />
                          </div>

                          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                            <label style="display:block;font-weight:800;margin-bottom:6px;">School Code</label>
                            <input
                              name="code"
                              value="${escapeHtml(school.code)}"
                              placeholder="School code"
                              required
                              style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                            />
                          </div>

                          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                            <label style="display:block;font-weight:800;margin-bottom:6px;">Plan</label>
                            <select
                              name="plan"
                              style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                            >
                              <option value="trial" ${selectedAttribute(school.plan || "trial", "trial")}>Trial</option>
                              <option value="starter" ${selectedAttribute(school.plan || "trial", "starter")}>Starter</option>
                              <option value="growth" ${selectedAttribute(school.plan || "trial", "growth")}>Growth</option>
                              <option value="enterprise" ${selectedAttribute(school.plan || "trial", "enterprise")}>Enterprise</option>
                            </select>
                          </div>

                          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                            <label style="display:block;font-weight:800;margin-bottom:6px;">Billing Status</label>
                            <select
                              name="billingStatus"
                              style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                            >
                              <option value="trial" ${selectedAttribute(school.billingStatus || "trial", "trial")}>Trial</option>
                              <option value="active" ${selectedAttribute(school.billingStatus || "trial", "active")}>Active</option>
                              <option value="past_due" ${selectedAttribute(school.billingStatus || "trial", "past_due")}>Past Due</option>
                              <option value="paused" ${selectedAttribute(school.billingStatus || "trial", "paused")}>Paused</option>
                              <option value="cancelled" ${selectedAttribute(school.billingStatus || "trial", "cancelled")}>Cancelled</option>
                            </select>
                          </div>
                        </div>

                        <h3 style="margin:18px 0 8px 0;">Limits</h3>
                        <p style="margin:0 0 10px 0;color:#64748b;font-size:13px;">
                          These values define the commercial plan limits for this school. A value of 0 means unlimited.
                        </p>

                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
                          ${renderLimitInput("maxAdmins", "Max Admins", maxAdmins, "Maximum school admin users allowed.")}
                          ${renderLimitInput("maxTeachers", "Max Teachers", maxTeachers, "Maximum teacher users allowed.")}
                          ${renderLimitInput("maxStudents", "Max Students", maxStudents, "Maximum active student records allowed.")}
                          ${renderLimitInput("maxTests", "Max Tests", maxTests, "Maximum tests created by this school.")}
                          ${renderLimitInput("maxAssignments", "Max Assignments", maxAssignments, "Maximum assigned-test records.")}
                          ${renderLimitInput("maxMonthlyCodeRuns", "Max Monthly Code Runs", maxMonthlyCodeRuns, "Maximum Run Code usage per calendar month.")}
                        </div>

                        <h3 style="margin:18px 0 8px 0;">Limit Enforcement</h3>
                        <p style="margin:0 0 10px 0;color:#64748b;font-size:13px;">
                          These switches actively control blocking for the enforcement paths already connected in the app.
                          Turn them ON only for a test school first.
                        </p>

                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;">
                          <label style="display:block;">
                            <input type="checkbox" name="enforceStudentLimit" ${checkedAttribute(enforcement.enforceStudentLimit)} />
                            Enforce Student Limit
                          </label>
                          <label style="display:block;">
                            <input type="checkbox" name="enforceTeacherLimit" ${checkedAttribute(enforcement.enforceTeacherLimit)} />
                            Enforce Teacher Limit
                          </label>
                          <label style="display:block;">
                            <input type="checkbox" name="enforceAdminLimit" ${checkedAttribute(enforcement.enforceAdminLimit)} />
                            Enforce Admin Limit
                          </label>
                          <label style="display:block;">
                            <input type="checkbox" name="enforceCodeRunLimit" ${checkedAttribute(enforcement.enforceCodeRunLimit)} />
                            Enforce Code Run Limit
                          </label>
                          <label style="display:block;">
                            <input type="checkbox" name="enforceTestLimit" ${checkedAttribute(enforcement.enforceTestLimit)} />
                            Enforce Test Limit
                          </label>
                        </div>

                        <button type="submit" style="
                          margin-top:16px;
                          padding:10px 14px;
                          background:#4f46e5;
                          color:white;
                          border:none;
                          border-radius:8px;
                          font-weight:900;
                          cursor:pointer;
                        ">
                          Save School
                        </button>
                      </form>
                    </details>

                    <details style="
                      width:100%;
                      background:#f8fafc;
                      border:1px solid #e2e8f0;
                      border-radius:10px;
                      padding:10px 12px;
                      box-sizing:border-box;
                    ">
                      <summary style="cursor:pointer;font-weight:900;color:#1e293b;">
                        Admins (${schoolAdmins.length})
                      </summary>

                      <form method="POST" action="/platform/schools/${school._id}/admins" style="margin-top:14px;">
                        <input
                          name="name"
                          placeholder="Admin name"
                          required
                          style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                        />
                        <input
                          name="email"
                          type="email"
                          placeholder="Admin email"
                          required
                          style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                        />
                        <input
                          name="password"
                          type="password"
                          placeholder="Temporary password"
                          required
                          minlength="10"
                          style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
                        />
                        <button type="submit" style="
                          padding:10px 14px;
                          background:#16a34a;
                          color:white;
                          border:none;
                          border-radius:8px;
                          font-weight:900;
                          cursor:pointer;
                        ">
                          Create School Admin
                        </button>
                      </form>

                      ${
                        schoolAdmins.length
                          ? `
                            <div style="margin-top:16px;">
                              <h3 style="margin-bottom:8px;">Existing School Admins</h3>
                              ${schoolAdmins.map(admin => `
                                <div style="
                                  background:white;
                                  border:1px solid #e5e7eb;
                                  border-radius:8px;
                                  padding:10px;
                                  margin-bottom:8px;
                                ">
                                  <b>${escapeHtml(admin.name)}</b><br>
                                  <span style="color:#64748b;">${escapeHtml(admin.email)}</span>
                                </div>
                              `).join("")}
                            </div>
                          `
                          : `<p style="color:#64748b;">No school admins created yet.</p>`
                      }
                    </details>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `
      : "";
    res.send(`
<body style="font-family:Arial;background:#eef2ff;margin:0;padding:28px;">
<style>
  .platform-school-table-header {
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .platform-school-table-header > div,
  .platform-school-row > div {
    border-right: 1px solid #cbd5e1;
    padding-right: 10px;
    min-width: 0;
  }

  .platform-school-table-header > div:last-child,
  .platform-school-row > div:last-child {
    border-right: none;
  }

  .platform-school-row:hover {
    background: #f8fafc;
  }
</style>
  <div style="
    max-width:1500px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:14px;
    box-shadow:0 4px 14px rgba(0,0,0,0.08);
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      margin-bottom:20px;
    ">
      <h1 style="margin:0;">School Onboarding</h1>
      <div style="display:flex;gap:10px;">
 <button id="platformQuestionImportButton" style="
 padding:10px 14px;
 background:#4f46e5;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 Question Import
 </button>
 <button id="togglePlatformAdminFormButton" style="
 padding:10px 14px;
 background:#111827;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 New Platform Admin
 </button>
        <button id="platformSchoolBackButton" style="
          padding:10px 14px;
          background:#64748b;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        ">
          Back
        </button>
      </div>
    </div>
    ${platformMessage}
 <div
 id="platformAdminForm"
 style="
 display:none;
 background:#f8fafc;
 border:1px solid #e5e7eb;
 padding:18px;
 border-radius:12px;
 margin-bottom:24px;
 "
 >
 <h2 style="margin-top:0;">Create Platform Admin</h2>
 <input
 id="platformAdminName"
 placeholder="Platform admin name"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <input
 id="platformAdminEmail"
 type="email"
 placeholder="Platform admin email"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <input
 id="platformAdminPassword"
 type="password"
 placeholder="Temporary password"
 style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
 />
 <button id="createPlatformAdminButton" style="
 padding:12px 18px;
 background:#111827;
 color:white;
 border:none;
 border-radius:8px;
 cursor:pointer;
 font-weight:700;
 ">
 Create Platform Admin
 </button>
 <p id="platformAdminMessage" style="font-weight:700;"></p>
 </div>
 <div style="
 background:#f8fafc;
 border:1px solid #e5e7eb;
 padding:18px;
 border-radius:12px;
 margin-bottom:24px;
 ">
 <h2 style="margin-top:0;">Create School</h2>
      <form method="POST" action="/platform/schools">
        <input
          name="name"
          placeholder="School name"
          required
          style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
        />
        <input
          name="code"
          placeholder="School code, example DPS-KOLKATA"
          required
          style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;"
        />
        <button type="submit" style="
          padding:12px 18px;
          background:#4f46e5;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:700;
        ">
          Create School
        </button>
      </form>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <h2 style="margin:0;">Existing Schools</h2>
      <input
        id="schoolSearchInput"
        placeholder="Search schools by name or code..."
        style="min-width:280px;flex:1;max-width:420px;padding:12px;border:1px solid #cbd5e1;border-radius:10px;box-sizing:border-box;"
      />
    </div>
    <p id="schoolSearchCount" style="color:#64748b;font-weight:700;margin:10px 0 18px 0;"></p>
    ${
      schoolRows ||
      `<p style="color:#64748b;">No schools created yet.</p>`
    }
</div>
<script>
const platformQuestionImportButton = document.getElementById("platformQuestionImportButton");
if(platformQuestionImportButton){
  platformQuestionImportButton.addEventListener("click", function(){
    window.location.replace("/platform-import");
  });
}

const togglePlatformAdminFormButton = document.getElementById("togglePlatformAdminFormButton");
if(togglePlatformAdminFormButton){
  togglePlatformAdminFormButton.addEventListener("click", togglePlatformAdminForm);
}

const platformSchoolBackButton = document.getElementById("platformSchoolBackButton");
if(platformSchoolBackButton){
  platformSchoolBackButton.addEventListener("click", function(){
    window.location.replace("/school-dashboard");
  });
}

const createPlatformAdminButton = document.getElementById("createPlatformAdminButton");
if(createPlatformAdminButton){
  createPlatformAdminButton.addEventListener("click", createPlatformAdmin);
}

const schoolSearchInput = document.getElementById("schoolSearchInput");
const schoolSearchCount = document.getElementById("schoolSearchCount");

function updateSchoolSearch(){
  const query = schoolSearchInput
    ? schoolSearchInput.value.trim().toLowerCase()
    : "";
  const cards = Array.from(document.querySelectorAll(".platform-school-card"));
  let visibleCount = 0;

  cards.forEach(card => {
    const text = (
      (card.dataset.schoolName || "") +
      " " +
      (card.dataset.schoolCode || "")
    ).toLowerCase();

    const isVisible = !query || text.includes(query);
    card.style.display = isVisible ? "block" : "none";

    if (isVisible) {
      visibleCount += 1;
    }
  });

  if (schoolSearchCount) {
    schoolSearchCount.textContent =
      visibleCount + " of " + cards.length + " schools shown";
  }
}

if(schoolSearchInput){
  schoolSearchInput.addEventListener("input", updateSchoolSearch);
}
updateSchoolSearch();

function togglePlatformAdminForm(){
  const form = document.getElementById("platformAdminForm");
  if(!form){
    return;
  }
  form.style.display =
    form.style.display === "none" ? "block" : "none";
}
function createPlatformAdmin(){
  const name = document.getElementById("platformAdminName").value.trim();
  const email = document.getElementById("platformAdminEmail").value.trim();
  const password = document.getElementById("platformAdminPassword").value.trim();
  const message = document.getElementById("platformAdminMessage");
  message.style.color = "#dc2626";
  message.textContent = "";
  if(!name || !email || !password){
    message.textContent = "Name, email, and temporary password are required";
    return;
  }
fetch("/api/platform/admins/create", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    if(data.error){
      message.textContent = data.error.message || data.error;
      return;
    }
    message.style.color = "#16a34a";
    message.textContent = "Platform admin created. They must change password after first login.";
    document.getElementById("platformAdminName").value = "";
    document.getElementById("platformAdminEmail").value = "";
    document.getElementById("platformAdminPassword").value = "";
  })
  .catch(() => {
    message.textContent = "Failed to create platform admin";
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error("PLATFORM SCHOOLS PAGE ERROR:", err);
    res.status(500).send("Failed to load schools");
  }
};
function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

function buildSchoolUsageFilter(school) {
  const schoolId = String(school._id);

  return {
    $or: [
      { schoolId: school._id },
      { schoolId },
      { schoolCode: school.code }
    ]
  };
}

function usageCard(label, value, note) {
  return `
    <div style="
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:14px;
      padding:18px;
    ">
      <div style="color:#64748b;font-size:13px;font-weight:800;">
        ${escapeHtml(label)}
      </div>
      <div style="font-size:30px;font-weight:900;margin-top:8px;color:#0f172a;">
        ${escapeHtml(String(value))}
      </div>
      ${
        note
          ? `<div style="color:#64748b;font-size:12px;margin-top:6px;">${escapeHtml(note)}</div>`
          : ""
      }
    </div>
  `;
}

exports.schoolUsagePage = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const school = await School.findById(schoolId).lean();

    if (!school) {
      return res.status(404).send("School not found");
    }

    const schoolFilter = buildSchoolUsageFilter(school);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthFilter = {
      ...schoolFilter,
      createdAt: {
        $gte: monthStart
      }
    };

    const [
      adminsCount,
      teachersCount,
      studentsCount,
      classesCount,
      subjectsCount,
      testsCount,
      publishedTestsCount,
      draftTestsCount,
      assignmentsCount,
      resultsCount,
      questionsCount,
      codeRunsThisMonth,
      testsCreatedThisMonth,
      testsUpdatedThisMonth,
      testsAssignedThisMonth,
      testsSubmittedThisMonth,
      reportsDownloadedThisMonth,
      questionsCreatedThisMonth,
      studentsCreatedThisMonth,
      studentsImportedThisMonth,
      usersCreatedThisMonth,
      teachersCreatedThisMonth,
      adminsCreatedThisMonth,
      userLoginsThisMonth,
      studentLoginsThisMonth,
      platformLoginsThisMonth,
      recentEvents
    ] = await Promise.all([
      User.countDocuments({ ...schoolFilter, role: "admin" }),
      User.countDocuments({ ...schoolFilter, role: "teacher" }),
      Student.countDocuments(schoolFilter),
      ClassModel.countDocuments(schoolFilter),
      Subject.countDocuments(schoolFilter),
      Test.countDocuments(schoolFilter),
      Test.countDocuments({ ...schoolFilter, status: "published" }),
      Test.countDocuments({ ...schoolFilter, status: { $ne: "published" } }),
      Assignment.countDocuments(schoolFilter),
      Result.countDocuments(schoolFilter),
      Question.countDocuments({ ...schoolFilter, scope: "teacher" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "code_run" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "test_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "test_updated" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "test_assigned" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "test_submitted" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "report_downloaded" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "question_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "student_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "student_imported" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "user_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "teacher_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "admin_created" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "login_success" }),
      UsageEvent.countDocuments({ ...monthFilter, eventType: "student_login_success" }),
      UsageEvent.countDocuments({ eventType: "platform_login_success", createdAt: { $gte: monthStart } }),
      UsageEvent.find(schoolFilter)
        .sort({ createdAt: -1 })
        .limit(25)
        .lean()
    ]);
    const limitWarningHtml = renderLimitWarnings([
      buildLimitWarning("Admins", adminsCount, getSchoolLimitValue(school, "maxAdmins", 2)),
      buildLimitWarning("Teachers", teachersCount, getSchoolLimitValue(school, "maxTeachers", 10)),
      buildLimitWarning("Students", studentsCount, getSchoolLimitValue(school, "maxStudents", 200)),
      buildLimitWarning("Tests", testsCount, getSchoolLimitValue(school, "maxTests", 100)),
      buildLimitWarning("Assignments", assignmentsCount, getSchoolLimitValue(school, "maxAssignments", 500)),
      buildLimitWarning("Monthly Code Runs", codeRunsThisMonth, getSchoolLimitValue(school, "maxMonthlyCodeRuns", 1000))
    ]);
    const recentRows = recentEvents.length
      ? recentEvents.map(event => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(formatDate(event.createdAt))}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:800;">
            ${escapeHtml(event.eventType)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(event.eventLabel || "-")}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(event.status || "-")}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(event.role || "-")}
          </td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="5" style="padding:16px;color:#64748b;">
            No usage events recorded yet.
          </td>
        </tr>
      `;

    res.send(`
<body style="font-family:Arial;background:#eef2ff;margin:0;padding:40px;">
  <div style="
    max-width:1180px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:16px;
    box-shadow:0 8px 24px rgba(15,23,42,0.08);
  ">
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      margin-bottom:24px;
    ">
      <div>
        <h1 style="margin:0;">School Usage</h1>
        <p style="margin:8px 0 0 0;color:#64748b;">
          ${escapeHtml(school.name)} · ${escapeHtml(school.code)}
        </p>
      </div>
      <button id="schoolUsageBackButton" style="
        padding:11px 15px;
        background:#475569;
        color:white;
        border:none;
        border-radius:8px;
        cursor:pointer;
        font-weight:800;
      ">
        Back
      </button>
    </div>

    <div style="
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:14px;
      padding:18px;
      margin-bottom:24px;
    ">
      <h2 style="margin-top:0;">Overview</h2>
      <p><b>School:</b> ${escapeHtml(school.name)}</p>
      <p><b>Code:</b> ${escapeHtml(school.code)}</p>
      <p><b>Status:</b> ${escapeHtml(school.status || "active")}</p>
      <p><b>Created:</b> ${escapeHtml(formatDate(school.createdAt))}</p>
      <p style="color:#64748b;margin-bottom:0;">
        This page shows current platform size and this-month activity for this school.
      </p>
    </div>

    <h2>Plan and Limits</h2>
    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:14px;
      margin-bottom:28px;
    ">
      ${usageCard("Plan", formatPlanLabel(school.plan))}
      ${usageCard("Billing", formatPlanLabel(school.billingStatus))}
      ${usageCard("Admins", `${adminsCount} / ${formatLimitValue(getSchoolLimitValue(school, "maxAdmins", 2))}`)}
      ${usageCard("Teachers", `${teachersCount} / ${formatLimitValue(getSchoolLimitValue(school, "maxTeachers", 10))}`)}
      ${usageCard("Students", `${studentsCount} / ${formatLimitValue(getSchoolLimitValue(school, "maxStudents", 200))}`)}
      ${usageCard("Tests", `${testsCount} / ${formatLimitValue(getSchoolLimitValue(school, "maxTests", 100))}`)}
      ${usageCard("Assignments", `${assignmentsCount} / ${formatLimitValue(getSchoolLimitValue(school, "maxAssignments", 500))}`)}
      ${usageCard("Monthly Code Runs", `${codeRunsThisMonth} / ${formatLimitValue(getSchoolLimitValue(school, "maxMonthlyCodeRuns", 1000))}`)}
      ${usageCard("Limit Enforcement", formatEnforcementStatus(school.limitEnforcement || {}))}
    </div>

    ${limitWarningHtml}

    <h2>Current Account Size</h2>
    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:14px;
      margin-bottom:28px;
    ">
      ${usageCard("School Admins", adminsCount)}
      ${usageCard("Teachers", teachersCount)}
      ${usageCard("Students", studentsCount)}
      ${usageCard("Classes", classesCount)}
      ${usageCard("Subjects", subjectsCount)}
      ${usageCard("Tests", testsCount)}
      ${usageCard("Published Tests", publishedTestsCount)}
      ${usageCard("Draft Tests", draftTestsCount)}
      ${usageCard("Assignments", assignmentsCount)}
      ${usageCard("Submissions", resultsCount)}
      ${usageCard("Questions", questionsCount)}
    </div>

    <h2>This Month Activity</h2>
    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:14px;
      margin-bottom:28px;
    ">
      ${usageCard("Code Runs", codeRunsThisMonth, "Tracked from Run Code")}
      ${usageCard("Tests Created", testsCreatedThisMonth)}
      ${usageCard("Tests Updated", testsUpdatedThisMonth)}
      ${usageCard("Tests Assigned", testsAssignedThisMonth)}
      ${usageCard("Tests Submitted", testsSubmittedThisMonth)}
      ${usageCard("Reports Downloaded", reportsDownloadedThisMonth)}
      ${usageCard("Questions Created", questionsCreatedThisMonth)}
      ${usageCard("Students Created", studentsCreatedThisMonth)}
      ${usageCard("Bulk Student Imports", studentsImportedThisMonth)}
      ${usageCard("Users Created", usersCreatedThisMonth)}
      ${usageCard("Teachers Created", teachersCreatedThisMonth)}
      ${usageCard("Admins Created", adminsCreatedThisMonth)}
      ${usageCard("User Logins", userLoginsThisMonth, "Admin/teacher logins")}
      ${usageCard("Student Logins", studentLoginsThisMonth)}
      ${usageCard("Platform Admin Logins", platformLoginsThisMonth, "Platform-wide")}
    </div>

    <h2>Recent Activity</h2>
    <div style="
      border:1px solid #e5e7eb;
      border-radius:14px;
      overflow:hidden;
      background:white;
    ">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#e2e8f0;text-align:left;">
          <th style="padding:12px;">Date</th>
          <th style="padding:12px;">Event</th>
          <th style="padding:12px;">Label</th>
          <th style="padding:12px;">Status</th>
          <th style="padding:12px;">Role</th>
        </tr>
        ${recentRows}
      </table>
    </div>
  </div>

<script>
const schoolUsageBackButton = document.getElementById("schoolUsageBackButton");
if(schoolUsageBackButton){
  schoolUsageBackButton.addEventListener("click", function(){
    window.location.replace("/platform/schools");
  });
}
</script>
</body>
`);
  } catch (err) {
    console.error("SCHOOL USAGE PAGE ERROR:", err);
    res.status(500).send("Failed to load school usage");
  }
};
exports.createSchool = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const code = normalizeSchoolCode(req.body.code);
    if (!name || !code) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School name and code are required.")
      );
    }
    const existingSchool = await School.findOne({ code }).lean();
    if (existingSchool) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School code already exists.")
      );
    }
    await School.create({
      name,
      code,
      status: "active"
    });
        res.redirect(
      "/platform/schools?success=" +
        encodeURIComponent("School created successfully.")
    );
  } catch (err) {
    console.error("CREATE SCHOOL ERROR:", err);
    if (err.code === 11000) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School code already exists.")
      );
    }
    res.redirect(
      "/platform/schools?error=" +
        encodeURIComponent("School could not be created. Please try again.")
    );
  }
};
exports.updateSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const name = String(req.body.name || "").trim();
    const code = normalizeSchoolCode(req.body.code);
    if (!schoolId || !name || !code) {
      return res.status(400).send("School name and code are required");
    }
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).send("School not found");
    }
    const existingSchool = await School.findOne({
      code,
      _id: {
        $ne: school._id
      }
    }).lean();
    if (existingSchool) {
      return res.status(409).send("School code already exists");
    }
    const oldCode = school.code;

    const plan = normalizeEnumValue(
      req.body.plan,
      ["trial", "starter", "growth", "enterprise"],
      school.plan || "trial"
    );

    const billingStatus = normalizeEnumValue(
      req.body.billingStatus,
      ["trial", "active", "past_due", "paused", "cancelled"],
      school.billingStatus || "trial"
    );

    school.name = name;
    school.code = code;
    school.plan = plan;
    school.billingStatus = billingStatus;

    school.maxAdmins = normalizeLimitNumber(req.body.maxAdmins, school.maxAdmins ?? 2);
    school.maxTeachers = normalizeLimitNumber(req.body.maxTeachers, school.maxTeachers ?? 10);
    school.maxStudents = normalizeLimitNumber(req.body.maxStudents, school.maxStudents ?? 200);
    school.maxTests = normalizeLimitNumber(req.body.maxTests, school.maxTests ?? 100);
    school.maxAssignments = normalizeLimitNumber(req.body.maxAssignments, school.maxAssignments ?? 500);
    school.maxMonthlyCodeRuns = normalizeLimitNumber(req.body.maxMonthlyCodeRuns, school.maxMonthlyCodeRuns ?? 1000);

    school.limitEnforcement = {
      enforceStudentLimit: req.body.enforceStudentLimit === "on",
      enforceTeacherLimit: req.body.enforceTeacherLimit === "on",
      enforceAdminLimit: req.body.enforceAdminLimit === "on",
      enforceCodeRunLimit: req.body.enforceCodeRunLimit === "on",
      enforceTestLimit: req.body.enforceTestLimit === "on"
    };

    await school.save();
    if (oldCode !== code) {
      await Promise.all([
        User.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Student.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        ClassModel.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Subject.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        ClassSubject.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        ),
        Test.updateMany(
          { schoolId: String(school._id) },
          { $set: { schoolCode: code } }
        )
      ]);
    }
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("UPDATE SCHOOL ERROR:", err);
    if (err.code === 11000) {
      return res.status(409).send("School code already exists");
    }
    res.status(500).send("Failed to update school");
  }
};
exports.deleteSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    if (!schoolId) {
      return res.status(400).send("Missing schoolId");
    }
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).send("School not found");
    }
    const schoolFilter = {
      schoolId: String(school._id)
    };
    const [
      userCount,
      studentCount,
      classCount,
      subjectCount,
      mappingCount,
      testCount
    ] = await Promise.all([
      User.countDocuments(schoolFilter),
      Student.countDocuments(schoolFilter),
      ClassModel.countDocuments(schoolFilter),
      Subject.countDocuments(schoolFilter),
      ClassSubject.countDocuments(schoolFilter),
      Test.countDocuments(schoolFilter)
    ]);
    const totalLinkedRecords =
      userCount +
      studentCount +
      classCount +
      subjectCount +
      mappingCount +
      testCount;
    if (totalLinkedRecords > 0) {
      return res.status(400).send(
        "Cannot delete school because it still has linked data. Delete school admins, teachers, students, classes, subjects, mappings, and tests first."
      );
    }
    await School.deleteOne({
      _id: school._id
    });
    res.redirect("/platform/schools");
  } catch (err) {
    console.error("DELETE SCHOOL ERROR:", err);
    res.status(500).send("Failed to delete school");
  }
};
exports.createAdminForSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!schoolId || !name || !email || !password) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("Admin name, email, and temporary password are required.")
      );
    }
    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent(passwordPolicyError)
      );
    }
    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("School not found.")
      );
    }
    const existingUser = await User.findOne({
      email,
      ...(req.user.schoolId ? { schoolId: req.user.schoolId } : {})
    }).lean();
    if (existingUser) {
      return res.redirect(
        "/platform/schools?error=" +
          encodeURIComponent("A user with this email already exists.")
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      schoolId: String(school._id),
      schoolCode: school.code,
      createdBy: String(req.user.id || req.user._id || ""),
      createdByName: req.user.name || req.user.email || "Platform Admin"
    });
       res.redirect(
      "/platform/schools?success=" +
        encodeURIComponent("School admin created successfully.")
    );
  } catch (err) {
    console.error("CREATE SCHOOL ADMIN ERROR:", err);
        res.redirect(
      "/platform/schools?error=" +
        encodeURIComponent("School admin could not be created. Please try again.")
    );
  }
};