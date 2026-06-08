function validatePasswordPolicy(password) {
  const value = String(password || "");
  if (value.length < 10) {
    return "Password must be at least 10 characters long";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must include at least one number";
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one special character";
  }
  return null;
}
module.exports = {
  validatePasswordPolicy
};