const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
const BLOCKED_PATTERNS = [
  /\bimport\s+os\b/,
  /\bimport\s+sys\b/,
  /\bimport\s+subprocess\b/,
  /\bimport\s+socket\b/,
  /\bimport\s+pathlib\b/,
  /\bimport\s+shutil\b/,
  /\bimport\s+glob\b/,
  /\bimport\s+inspect\b/,
  /\bimport\s+ctypes\b/,
  /\bimport\s+importlib\b/,
  /\bimport\s+builtins\b/,
  /\bimport\s+pickle\b/,
  /\bimport\s+marshal\b/,
  /\bimport\s+tempfile\b/,
  /\bimport\s+signal\b/,
  /\bimport\s+resource\b/,
  /\bimport\s+multiprocessing\b/,
  /\bimport\s+threading\b/,
  /\bfrom\s+os\s+import\b/,
  /\bfrom\s+sys\s+import\b/,
  /\bfrom\s+subprocess\s+import\b/,
  /\bfrom\s+socket\s+import\b/,
  /\bfrom\s+pathlib\s+import\b/,
  /\bfrom\s+shutil\s+import\b/,
  /\bfrom\s+ctypes\s+import\b/,
  /\bfrom\s+importlib\s+import\b/,
  /\bfrom\s+builtins\s+import\b/,
  /\bopen\s*\(/,
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\bcompile\s*\(/,
  /\b__import__\s*\(/,
  /\bglobals\s*\(/,
  /\blocals\s*\(/,
  /\bvars\s*\(/,
  /\bdir\s*\(/,
  /\bgetattr\s*\(/,
  /\bsetattr\s*\(/,
  /\bdelattr\s*\(/,
  /\binput\s*\(/,
  /\bhelp\s*\(/,
  /\bexit\s*\(/,
  /\bquit\s*\(/,
  /\bmro\s*\(/,
  /\bsubclasses\s*\(/,
  /__/
];
function validatePythonCode(code) {
  const safeCode = String(code || "");
  if (!safeCode.trim()) {
    return {
      ok: false,
      error: "Empty code submission"
    };
  }
  if (safeCode.length > EXECUTION_LIMITS.MAX_CODE_LENGTH) {
    return {
      ok: false,
      error: "Code exceeds limit"
    };
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(safeCode)) {
      return {
        ok: false,
        error: "Code uses blocked Python features"
      };
    }
  }
  return {
    ok: true,
    error: null
  };
}
module.exports = {
  validatePythonCode
};