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
      console.log(JSON.stringify({
        ok: false,
        error: "Function not found"
      }));
      return;
    }

    const result = targetFunction(...args);

    console.log(JSON.stringify({
      ok: true,
      result,
      isUndefined: result === undefined
    }));
  } catch (err) {
    console.log(JSON.stringify({
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
        print(json.dumps({
            "ok": False,
            "error": "Function not found"
        }))
    else:
        result = target_function(*args)
        print(json.dumps({
            "ok": True,
            "result": result,
            "isUndefined": False
        }))
except Exception as err:
    print(json.dumps({
        "ok": False,
        "error": str(err)
    }))
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

    throw new Error(
      "Judge0 execution failed: " + String(errorOutput).trim()
    );
  }

  const stdout = String(submission.stdout || "").trim();

  if (!stdout) {
    throw new Error("Judge0 returned empty output");
  }

  let parsed;

  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    throw new Error(
      "Judge0 returned invalid JSON output"
    );
  }

  if (!parsed.ok) {
    throw new Error(
      parsed.error || "Judge0 code execution failed"
    );
  }

  if (parsed.isUndefined) {
    return undefined;
  }

  return parsed.result;
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

  throw new Error("Judge0 execution timed out while polling");
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