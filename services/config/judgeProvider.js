function getJudgeProvider() {
  return String(process.env.JUDGE_PROVIDER || "local")
    .trim()
    .toLowerCase();
}
function isProduction() {
  return process.env.NODE_ENV === "production";
}
function isLocalCodeExecutionEnabled() {
  return String(process.env.LOCAL_CODE_EXECUTION_ENABLED || "true")
    .trim()
    .toLowerCase() === "true";
}
function getJudge0Config() {
  return {
    apiUrl: String(process.env.JUDGE0_API_URL || "").trim(),
    apiKey: String(process.env.JUDGE0_API_KEY || "").trim()
  };
}
function assertProviderAllowed(provider) {
  if (
    isProduction() &&
    provider === "local" &&
    !isLocalCodeExecutionEnabled()
  ) {
    throw new Error(
      "Local code execution is disabled in production"
    );
  }
  if (
    provider === "judge0" &&
    !getJudge0Config().apiUrl
  ) {
    throw new Error(
      "Judge0 API URL is required"
    );
  }
}
module.exports = {
  getJudgeProvider,
  getJudge0Config,
  assertProviderAllowed,
  isProduction,
  isLocalCodeExecutionEnabled
};