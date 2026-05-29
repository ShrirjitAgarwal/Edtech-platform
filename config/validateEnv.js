function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}
function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || "local";
  requireEnv("JWT_SECRET");
  requireEnv("MONGO_URI");
  if (nodeEnv === "production") {
    if (String(process.env.JWT_SECRET || "").length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    if (process.env.JUDGE_PROVIDER === "local") {
      throw new Error("JUDGE_PROVIDER cannot be local in production");
    }
    if (process.env.LOCAL_CODE_EXECUTION_ENABLED !== "false") {
      throw new Error("LOCAL_CODE_EXECUTION_ENABLED must be false in production");
    }
    if (process.env.JUDGE_PROVIDER === "judge0") {
      requireEnv("JUDGE0_API_URL");
    }
  }
  return {
    nodeEnv,
    port: process.env.PORT || 3000
  };
}
module.exports = {
  validateEnv
};