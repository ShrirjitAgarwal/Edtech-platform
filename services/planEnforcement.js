const School = require("../models/School");
const User = require("../models/User");
const Student = require("../models/Student");
const Test = require("../models/Test");
const Assignment = require("../models/Assignment");
const UsageEvent = require("../models/UsageEvent");

const DEFAULT_LIMITS = {
  maxAdmins: 2,
  maxTeachers: 10,
  maxStudents: 200,
  maxTests: 100,
  maxAssignments: 500,
  maxMonthlyCodeRuns: 1000
};

const DEFAULT_FEATURES = {
  codingQuestions: true,
  bulkStudentImport: true,
  reportDownloads: true,
  publicQuestionLibrary: true
};

const DEFAULT_ENFORCEMENT = {
  enforceStudentLimit: false,
  enforceTeacherLimit: false,
  enforceCodeRunLimit: false,
  enforceTestLimit: false
};

function normalizeSchoolId(value) {
  return value ? String(value) : null;
}

function getLimit(school, fieldName) {
  const value = Number(school?.[fieldName]);

  if (Number.isFinite(value) && value >= 0) {
    return value;
  }

  return DEFAULT_LIMITS[fieldName] || 0;
}

function getFeatureEnabled(school, fieldName) {
  const value = school?.featuresEnabled?.[fieldName];

  if (typeof value === "boolean") {
    return value;
  }

  return DEFAULT_FEATURES[fieldName] !== false;
}

function getEnforcementEnabled(school, fieldName) {
  const value = school?.limitEnforcement?.[fieldName];

  if (typeof value === "boolean") {
    return value;
  }

  return DEFAULT_ENFORCEMENT[fieldName] === true;
}

function getCurrentMonthRange(referenceDate = new Date()) {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );

  return { start, end };
}

function buildAllowedResult({
  code,
  message,
  mode = "allowed",
  usage = null,
  limit = null,
  school = null
}) {
  return {
    allowed: true,
    mode,
    code,
    message,
    usage,
    limit,
    plan: school?.plan || "trial",
    billingStatus: school?.billingStatus || "trial"
  };
}

function buildBlockedResult({
  code,
  message,
  usage = null,
  limit = null,
  school = null
}) {
  return {
    allowed: false,
    mode: "enforced",
    code,
    message,
    usage,
    limit,
    plan: school?.plan || "trial",
    billingStatus: school?.billingStatus || "trial"
  };
}

async function getSchoolById(schoolId) {
  const normalizedSchoolId = normalizeSchoolId(schoolId);

  if (!normalizedSchoolId) {
    return null;
  }

  return School.findById(normalizedSchoolId).lean();
}

async function countAdmins(schoolId) {
  return User.countDocuments({
    schoolId: normalizeSchoolId(schoolId),
    role: "admin"
  });
}

async function countTeachers(schoolId) {
  return User.countDocuments({
    schoolId: normalizeSchoolId(schoolId),
    role: "teacher"
  });
}

async function countStudents(schoolId) {
  return Student.countDocuments({
    schoolId: normalizeSchoolId(schoolId),
    status: { $ne: "deleted" }
  });
}

async function countTests(schoolId) {
  return Test.countDocuments({
    schoolId: normalizeSchoolId(schoolId)
  });
}

async function countAssignments(schoolId) {
  return Assignment.countDocuments({
    schoolId: normalizeSchoolId(schoolId)
  });
}

async function countMonthlyCodeRuns(schoolId, referenceDate = new Date()) {
  const { start, end } = getCurrentMonthRange(referenceDate);

  return UsageEvent.countDocuments({
    schoolId: normalizeSchoolId(schoolId),
    eventType: "code_run",
    createdAt: {
      $gte: start,
      $lt: end
    }
  });
}

async function checkLimit({
  schoolId,
  limitField,
  enforcementField,
  usageCounter,
  blockedCode,
  allowedCode,
  notEnforcedCode,
  blockedMessage,
  allowedMessage,
  notEnforcedMessage,
  incrementBy = 1
}) {
  const school = await getSchoolById(schoolId);

  if (!school) {
    return buildAllowedResult({
      code: "SCHOOL_NOT_FOUND_LIMIT_NOT_ENFORCED",
      message: "School was not found. Limit was not enforced.",
      mode: "school_not_found"
    });
  }

  const limit = getLimit(school, limitField);
  const usage = await usageCounter(school._id);
  const projectedUsage = usage + incrementBy;
  const enforceLimit = getEnforcementEnabled(school, enforcementField);

  if (!enforceLimit) {
    return buildAllowedResult({
      code: notEnforcedCode,
      message: notEnforcedMessage,
      mode: "not_enforced",
      usage,
      limit,
      school
    });
  }

  if (limit > 0 && projectedUsage > limit) {
    return buildBlockedResult({
      code: blockedCode,
      message: blockedMessage,
      usage,
      limit,
      school
    });
  }

  return buildAllowedResult({
    code: allowedCode,
    message: allowedMessage,
    mode: "enforced_allowed",
    usage,
    limit,
    school
  });
}

async function checkFeature({
  schoolId,
  featureField,
  blockedCode,
  allowedCode,
  blockedMessage,
  allowedMessage
}) {
  const school = await getSchoolById(schoolId);

  if (!school) {
    return buildAllowedResult({
      code: "SCHOOL_NOT_FOUND_FEATURE_ALLOWED",
      message: "School was not found. Feature was not blocked.",
      mode: "school_not_found"
    });
  }

  const enabled = getFeatureEnabled(school, featureField);

  if (!enabled) {
    return buildBlockedResult({
      code: blockedCode,
      message: blockedMessage,
      school
    });
  }

  return buildAllowedResult({
    code: allowedCode,
    message: allowedMessage,
    school
  });
}

async function canCreateAdmin(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxAdmins",
    enforcementField: "enforceTeacherLimit",
    usageCounter: countAdmins,
    blockedCode: "ADMIN_LIMIT_REACHED",
    allowedCode: "ADMIN_LIMIT_ALLOWED",
    notEnforcedCode: "ADMIN_LIMIT_NOT_ENFORCED",
    blockedMessage: "Admin limit reached for this school's current plan.",
    allowedMessage: "Admin limit allows this action.",
    notEnforcedMessage: "Admin limit is not enforced for this school.",
    incrementBy
  });
}

async function canCreateTeacher(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxTeachers",
    enforcementField: "enforceTeacherLimit",
    usageCounter: countTeachers,
    blockedCode: "TEACHER_LIMIT_REACHED",
    allowedCode: "TEACHER_LIMIT_ALLOWED",
    notEnforcedCode: "TEACHER_LIMIT_NOT_ENFORCED",
    blockedMessage: "Teacher limit reached for this school's current plan.",
    allowedMessage: "Teacher limit allows this action.",
    notEnforcedMessage: "Teacher limit is not enforced for this school.",
    incrementBy
  });
}

async function canCreateStudent(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxStudents",
    enforcementField: "enforceStudentLimit",
    usageCounter: countStudents,
    blockedCode: "STUDENT_LIMIT_REACHED",
    allowedCode: "STUDENT_LIMIT_ALLOWED",
    notEnforcedCode: "STUDENT_LIMIT_NOT_ENFORCED",
    blockedMessage: "Student limit reached for this school's current plan.",
    allowedMessage: "Student limit allows this action.",
    notEnforcedMessage: "Student limit is not enforced for this school.",
    incrementBy
  });
}

async function canCreateTest(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxTests",
    enforcementField: "enforceTestLimit",
    usageCounter: countTests,
    blockedCode: "TEST_LIMIT_REACHED",
    allowedCode: "TEST_LIMIT_ALLOWED",
    notEnforcedCode: "TEST_LIMIT_NOT_ENFORCED",
    blockedMessage: "Test limit reached for this school's current plan.",
    allowedMessage: "Test limit allows this action.",
    notEnforcedMessage: "Test limit is not enforced for this school.",
    incrementBy
  });
}

async function canCreateAssignment(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxAssignments",
    enforcementField: "enforceTestLimit",
    usageCounter: countAssignments,
    blockedCode: "ASSIGNMENT_LIMIT_REACHED",
    allowedCode: "ASSIGNMENT_LIMIT_ALLOWED",
    notEnforcedCode: "ASSIGNMENT_LIMIT_NOT_ENFORCED",
    blockedMessage: "Assignment limit reached for this school's current plan.",
    allowedMessage: "Assignment limit allows this action.",
    notEnforcedMessage: "Assignment limit is not enforced for this school.",
    incrementBy
  });
}

async function canRunCode(schoolId, incrementBy = 1) {
  return checkLimit({
    schoolId,
    limitField: "maxMonthlyCodeRuns",
    enforcementField: "enforceCodeRunLimit",
    usageCounter: countMonthlyCodeRuns,
    blockedCode: "MONTHLY_CODE_RUN_LIMIT_REACHED",
    allowedCode: "MONTHLY_CODE_RUN_LIMIT_ALLOWED",
    notEnforcedCode: "MONTHLY_CODE_RUN_LIMIT_NOT_ENFORCED",
    blockedMessage: "Monthly code run limit reached for this school's current plan.",
    allowedMessage: "Monthly code run limit allows this action.",
    notEnforcedMessage: "Monthly code run limit is not enforced for this school.",
    incrementBy
  });
}

async function canUseBulkStudentImport(schoolId) {
  return checkFeature({
    schoolId,
    featureField: "bulkStudentImport",
    blockedCode: "BULK_STUDENT_IMPORT_DISABLED",
    allowedCode: "BULK_STUDENT_IMPORT_ENABLED",
    blockedMessage: "Bulk student import is disabled for this school's current plan.",
    allowedMessage: "Bulk student import is enabled for this school."
  });
}

async function canDownloadReports(schoolId) {
  return checkFeature({
    schoolId,
    featureField: "reportDownloads",
    blockedCode: "REPORT_DOWNLOADS_DISABLED",
    allowedCode: "REPORT_DOWNLOADS_ENABLED",
    blockedMessage: "Report downloads are disabled for this school's current plan.",
    allowedMessage: "Report downloads are enabled for this school."
  });
}

async function canUseCodingQuestions(schoolId) {
  return checkFeature({
    schoolId,
    featureField: "codingQuestions",
    blockedCode: "CODING_QUESTIONS_DISABLED",
    allowedCode: "CODING_QUESTIONS_ENABLED",
    blockedMessage: "Coding questions are disabled for this school's current plan.",
    allowedMessage: "Coding questions are enabled for this school."
  });
}

async function canUsePublicQuestionLibrary(schoolId) {
  return checkFeature({
    schoolId,
    featureField: "publicQuestionLibrary",
    blockedCode: "PUBLIC_QUESTION_LIBRARY_DISABLED",
    allowedCode: "PUBLIC_QUESTION_LIBRARY_ENABLED",
    blockedMessage: "Public question library is disabled for this school's current plan.",
    allowedMessage: "Public question library is enabled for this school."
  });
}

module.exports = {
  DEFAULT_LIMITS,
  DEFAULT_FEATURES,
  DEFAULT_ENFORCEMENT,
  getCurrentMonthRange,
  getLimit,
  getFeatureEnabled,
  getEnforcementEnabled,
  getSchoolById,
  countAdmins,
  countTeachers,
  countStudents,
  countTests,
  countAssignments,
  countMonthlyCodeRuns,
  canCreateAdmin,
  canCreateTeacher,
  canCreateStudent,
  canCreateTest,
  canCreateAssignment,
  canRunCode,
  canUseBulkStudentImport,
  canDownloadReports,
  canUseCodingQuestions,
  canUsePublicQuestionLibrary
};