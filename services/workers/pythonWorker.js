const {
  validatePythonCode
} = require("../security/pythonPolicy");
const { execFile } = require("child_process");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
process.on("message", (payload) => {
  const {
    code,
    functionName,
    args
  } = payload;
  const policyResult = validatePythonCode(code);
if (!policyResult.ok) {
  if (process.send) {
    process.send({
      ok: false,
      error: policyResult.error
    });
  }
  return;
}
  const serializedArgs =
    JSON.stringify(args || []);
  const pythonScript = `
import json
import sys
student_globals = {}
${code}
function_name = "${functionName}"
if function_name not in student_globals and function_name in globals():
    student_globals[function_name] = globals()[function_name]
if function_name not in student_globals:
    print(json.dumps({
        "ok": False,
        "error": "Function not found"
    }))
    sys.exit(0)
try:
    parsed_args = json.loads("""${serializedArgs}""")
    result = student_globals[function_name](*parsed_args)
    print(json.dumps({
        "ok": True,
        "result": result
    }))
except Exception as err:
    print(json.dumps({
        "ok": False,
        "error": str(err)
    }))
`;
  execFile(
    "python3",
    ["-c", pythonScript],
    {
      timeout: EXECUTION_LIMITS.PYTHON_TIMEOUT_MS,
maxBuffer: EXECUTION_LIMITS.STDOUT_MAX_BUFFER_BYTES
    },
    (err, stdout) => {
      if (err) {
        if (process.send) {
          process.send({
            ok: false,
            error: "Python execution failed"
          });
        }
        return;
      }
      try {
        const parsed = JSON.parse(
          String(stdout || "").trim()
        );
        if (process.send) {
          process.send(parsed);
        }
      } catch (parseErr) {
        if (process.send) {
          process.send({
            ok: false,
            error: "Invalid Python output"
          });
        }
      }
    }
  );
});