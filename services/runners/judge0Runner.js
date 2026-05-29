const {
  getJudge0Config
} = require("../config/judgeProvider");

async function runJudge0Code({
  language,
  code,
  functionName,
  args
}) {
  const config = getJudge0Config();

  if (!config.apiUrl) {
    throw new Error("Judge0 API URL is required");
  }

  throw new Error(
    "Judge0 runner is configured but not connected yet"
  );
}

module.exports = {
  runJudge0Code
};