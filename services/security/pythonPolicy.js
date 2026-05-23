const MAX_PYTHON_CODE_LENGTH = 10000;

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
  /\bfrom\s+os\s+import\b/,
  /\bfrom\s+sys\s+import\b/,
  /\bfrom\s+subprocess\s+import\b/,
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

  if (safeCode.length > MAX_PYTHON_CODE_LENGTH) {
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