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
      error: policyResult.error,
      logs: []
    });
  }
  return;
}
  const serializedArgs =
    JSON.stringify(args || []);
const pythonScript = `
import json
import sys
try:
 import resource
 memory_limit_bytes = ${EXECUTION_LIMITS.PYTHON_MEMORY_MB} * 1024 * 1024
 resource.setrlimit(resource.RLIMIT_AS, (memory_limit_bytes, memory_limit_bytes))
except Exception:
 pass
__logs__ = []
def __capture_print(*args, **kwargs):
 sep = kwargs.get('sep', ' ')
 __logs__.append(sep.join(str(a) for a in args))
SAFE_BUILTINS = {
 "abs": abs,
 "all": all,
 "any": any,
 "bool": bool,
 "dict": dict,
 "enumerate": enumerate,
 "filter": filter,
 "float": float,
 "int": int,
 "len": len,
 "list": list,
 "map": map,
 "max": max,
 "min": min,
 "pow": pow,
 "print": __capture_print,
 "range": range,
 "round": round,
 "set": set,
 "sorted": sorted,
 "str": str,
 "sum": sum,
 "tuple": tuple,
 "zip": zip
}
student_globals = {
 "__builtins__": SAFE_BUILTINS
}
exec(${JSON.stringify(code)}, student_globals)
function_name = "${functionName}"
if function_name not in student_globals:
    sys.stdout.write(json.dumps({
        "ok": False,
        "error": "Function not found",
        "logs": __logs__
    }) + "\\n")
    sys.exit(0)
try:
    parsed_args = json.loads("""${serializedArgs}""")
    result = student_globals[function_name](*parsed_args)
    sys.stdout.write(json.dumps({
        "ok": True,
        "result": result,
        "logs": __logs__
    }) + "\\n")
except Exception as err:
    sys.stdout.write(json.dumps({
        "ok": False,
        "error": str(err),
        "logs": __logs__
    }) + "\\n")
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
 error: err.killed
   ? "Python execution timed out"
   : "Python execution failed or exceeded memory limit",
 logs: []
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
            error: "Invalid Python output",
            logs: []
          });
        }
      }
    }
  );
});
