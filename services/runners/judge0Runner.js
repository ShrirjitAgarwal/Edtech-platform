const {
  getJudge0Config
} = require("../config/judgeProvider");
const {
  EXECUTION_LIMITS
} = require("../config/executionLimits");
const LANGUAGE_IDS = Object.freeze({
  javascript: Number(
    process.env.JUDGE0_LANGUAGE_ID_JAVASCRIPT || 63
  ),
  python: Number(
    process.env.JUDGE0_LANGUAGE_ID_PYTHON || 71
  )
});
function normalizeApiUrl(apiUrl) {
  return String(apiUrl || "")
    .trim()
    .replace(/\/+$/, "");
}
function buildHeaders(apiKey) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers["X-Auth-Token"] = apiKey;
  }
  return headers;
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getLanguageId(language) {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId || Number.isNaN(languageId)) {
    throw new Error(
      "Judge0 language id is not configured for " +
      language
    );
  }
  return languageId;
}
function buildJavaScriptSource({
  code,
  functionName,
  args
}) {
  return `
const __logs__ = [];
const __origLog = console.log.bind(console);
const __origWarn = console.warn.bind(console);
const __origError = console.error.bind(console);
function __fmt__(args) {
  return Array.from(args).map(function(a){
    if(a===null) return "null";
    if(a===undefined) return "undefined";
    if(typeof a==="object"){try{return JSON.stringify(a);}catch(e){return String(a);}}
    return String(a);
  }).join(" ");
}
console.log = function(){ __logs__.push(__fmt__(arguments)); };
console.warn = function(){ __logs__.push("[warn] " + __fmt__(arguments)); };
console.error = function(){ __logs__.push("[error] " + __fmt__(arguments)); };
${code}
(function(){
  const functionName = ${JSON.stringify(functionName)};
  const args = ${JSON.stringify(args || [])};
  try {
    let targetFunction = globalThis[functionName];
    if (typeof targetFunction !== "function") {
      const matchedKey = Object.keys(globalThis).find(key =>
        String(key).toLowerCase() ===
        String(functionName).toLowerCase()
      );
      if (matchedKey) {
        targetFunction = globalThis[matchedKey];
      }
    }
    if (typeof targetFunction !== "function") {
      __origLog("__LOGS__:" + JSON.stringify(__logs__));
      __origLog("__RESULT__:" + JSON.stringify({
        ok: false,
        error: "Function not found"
      }));
      return;
    }
    const result = targetFunction(...args);
    __origLog("__LOGS__:" + JSON.stringify(__logs__));
    __origLog("__RESULT__:" + JSON.stringify({
      ok: true,
      result,
      isUndefined: result === undefined
    }));
  } catch (err) {
    __origLog("__LOGS__:" + JSON.stringify(__logs__));
    __origLog("__RESULT__:" + JSON.stringify({
      ok: false,
      error: String(err && err.message ? err.message : err)
    }));
  }
})();
`;
}
function buildPythonSource({
  code,
  functionName,
  args
}) {
  return `
import json
import sys
__logs__ = []
def print(*args, **kwargs):
    sep = kwargs.get('sep', ' ')
    __logs__.append(sep.join(str(a) for a in args))
${code}
function_name = ${JSON.stringify(functionName)}
args = json.loads(${JSON.stringify(JSON.stringify(args || []))})
try:
    target_function = globals().get(function_name)
    if not callable(target_function):
        matched_name = None
        for key in globals().keys():
            if str(key).lower() == str(function_name).lower():
                matched_name = key
                break
        if matched_name:
            target_function = globals().get(matched_name)
    if not callable(target_function):
        sys.__stdout__.write("__LOGS__:" + json.dumps(__logs__) + "\\n")
        sys.__stdout__.write("__RESULT__:" + json.dumps({
            "ok": False,
            "error": "Function not found"
        }) + "\\n")
    else:
        result = target_function(*args)
        sys.__stdout__.write("__LOGS__:" + json.dumps(__logs__) + "\\n")
        sys.__stdout__.write("__RESULT__:" + json.dumps({
            "ok": True,
            "result": result,
            "isUndefined": False
        }) + "\\n")
except Exception as err:
    sys.__stdout__.write("__LOGS__:" + json.dumps(__logs__) + "\\n")
    sys.__stdout__.write("__RESULT__:" + json.dumps({
        "ok": False,
        "error": str(err)
    }) + "\\n")
`;
}
function buildSource({
  language,
  code,
  functionName,
  args
}) {
  if (language === "javascript") {
    return buildJavaScriptSource({
      code,
      functionName,
      args
    });
  }
  if (language === "python") {
    return buildPythonSource({
      code,
      functionName,
      args
    });
  }
  throw new Error(
    "Unsupported Judge0 language: " + language
  );
}
async function createSubmission({
  apiUrl,
  headers,
  languageId,
  sourceCode
}) {
  const response = await fetch(
    apiUrl + "/submissions?base64_encoded=false&wait=false",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        language_id: languageId,
        source_code: sourceCode,
        stdin: "",
        cpu_time_limit:
          EXECUTION_LIMITS.JUDGE0_CPU_TIME_LIMIT_SECONDS,
        wall_time_limit:
          EXECUTION_LIMITS.JUDGE0_WALL_TIME_LIMIT_SECONDS,
        memory_limit:
          EXECUTION_LIMITS.JUDGE0_MEMORY_LIMIT_KB
      })
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      "Judge0 submission failed: " +
      response.status +
      " " +
      text
    );
  }
  const data = await response.json();
  if (!data.token) {
    throw new Error("Judge0 submission token missing");
  }
  return data.token;
}
async function getSubmission({
  apiUrl,
  headers,
  token
}) {
  const fields = [
    "stdout",
    "stderr",
    "compile_output",
    "message",
    "status",
    "time",
    "memory"
  ].join(",");
  const response = await fetch(
    apiUrl +
      "/submissions/" +
      encodeURIComponent(token) +
      "?base64_encoded=false&fields=" +
      fields,
    {
      method: "GET",
      headers
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      "Judge0 result fetch failed: " +
      response.status +
      " " +
      text
    );
  }
  return response.json();
}
function parseSentinelOutput(stdout) {
  const lines = String(stdout || "").split("\n");
  let resultLine = null;
  let logsLine = null;
  for (const line of lines) {
    if (line.startsWith("__RESULT__:")) {
      resultLine = line.slice("__RESULT__:".length);
    } else if (line.startsWith("__LOGS__:")) {
      logsLine = line.slice("__LOGS__:".length);
    }
  }
  let logs = [];
  if (logsLine) {
    try { logs = JSON.parse(logsLine); } catch(e) { logs = []; }
  }
  return { resultLine, logs };
}
function parseJudge0Output(submission) {
  const statusId = submission?.status?.id;
  const statusDescription =
    submission?.status?.description || "Unknown";
  if (statusId !== 3) {
    const errorOutput =
      submission.compile_output ||
      submission.stderr ||
      submission.message ||
      statusDescription;
    const err = new Error(
      "Judge0 execution failed: " + String(errorOutput).trim()
    );
    err.logs = [];
    throw err;
  }
  const stdout = String(submission.stdout || "").trim();
  if (!stdout) {
    const err = new Error("Judge0 returned empty output");
    err.logs = [];
    throw err;
  }
  const { resultLine, logs } = parseSentinelOutput(stdout);
  if (!resultLine) {
    // Legacy fallback: try parsing whole stdout as JSON
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (e) {
      const err = new Error("Judge0 returned invalid output");
      err.logs = [];
      throw err;
    }
    if (!parsed.ok) {
      const err = new Error(parsed.error || "Judge0 code execution failed");
      err.logs = [];
      throw err;
    }
    return { result: parsed.isUndefined ? undefined : parsed.result, logs: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(resultLine);
  } catch (e) {
    const err = new Error("Judge0 returned invalid JSON output");
    err.logs = logs;
    throw err;
  }
  if (!parsed.ok) {
    const err = new Error(parsed.error || "Judge0 code execution failed");
    err.logs = logs;
    throw err;
  }
  return {
    result: parsed.isUndefined ? undefined : parsed.result,
    logs
  };
}
async function waitForSubmission({
  apiUrl,
  headers,
  token
}) {
  for (
    let attempt = 0;
    attempt < EXECUTION_LIMITS.JUDGE0_MAX_POLL_ATTEMPTS;
    attempt++
  ) {
    const submission = await getSubmission({
      apiUrl,
      headers,
      token
    });
    const statusId = submission?.status?.id;
    if (statusId !== 1 && statusId !== 2) {
      return submission;
    }
    await sleep(EXECUTION_LIMITS.JUDGE0_POLL_INTERVAL_MS);
  }
  const err = new Error("Judge0 execution timed out while polling");
  err.logs = [];
  throw err;
}
async function runJudge0Code({
  language,
  code,
  functionName,
  args
}) {
  const config = getJudge0Config();
  const apiUrl = normalizeApiUrl(config.apiUrl);
  if (!apiUrl) {
    throw new Error("Judge0 API URL is required");
  }
  if (typeof fetch !== "function") {
    throw new Error(
      "Fetch API is not available. Use Node 18+ or add a fetch client."
    );
  }
  const languageId = getLanguageId(language);
  const headers = buildHeaders(config.apiKey);
  const sourceCode = buildSource({
    language,
    code,
    functionName,
    args
  });
  const token = await createSubmission({
    apiUrl,
    headers,
    languageId,
    sourceCode
  });
  const submission = await waitForSubmission({
    apiUrl,
    headers,
    token
  });
  return parseJudge0Output(submission);
}
module.exports = {
  runJudge0Code
};
