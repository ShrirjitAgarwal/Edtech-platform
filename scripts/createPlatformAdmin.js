const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const {
  validatePasswordPolicy
} = require("../utils/passwordPolicy");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.local";
require("dotenv").config({
  path: envFile
});
async function createPlatformAdmin() {
  const name = process.env.PLATFORM_ADMIN_NAME;
  const email = String(process.env.PLATFORM_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  if (!name || !email || !password) {
    throw new Error(
      "PLATFORM_ADMIN_NAME, PLATFORM_ADMIN_EMAIL, and PLATFORM_ADMIN_PASSWORD are required"
    );
  }
  const passwordPolicyError = validatePasswordPolicy(password);
if (passwordPolicyError) {
  throw new Error(passwordPolicyError);
}
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({
    email
  });
  const hashedPassword = await bcrypt.hash(password, 10);
  if (existing) {
    existing.name = name;
    existing.password = hashedPassword;
    existing.role = "platform_admin";
    existing.schoolId = null;
    existing.schoolCode = null;
    await existing.save();
    console.log("Platform admin updated:", email);
  } else {
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "platform_admin",
      schoolId: null,
      schoolCode: null,
      createdBy: "system",
      createdByName: "System"
    });
    console.log("Platform admin created:", email);
  }
  await mongoose.disconnect();
}
createPlatformAdmin().catch(async (err) => {
  console.error("CREATE PLATFORM ADMIN ERROR:", err.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectErr) {
    // ignore
  }
  process.exit(1);
});