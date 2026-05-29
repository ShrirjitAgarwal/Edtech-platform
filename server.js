const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.local";
require("dotenv").config({ path: envFile });
const {
  validateEnv
} = require("./config/validateEnv");
const envConfig = validateEnv();
console.log("ENV:", envConfig.nodeEnv);
const express = require("express");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./data/config/db");
const app = express();
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later."
  }
});
// REGISTER MODELS
require("./models/User");
require("./models/Student");
require("./models/Class");
require("./models/Test");
require("./models/Result");
require("./models/Assignment");
require("./models/ClassSubject");
require("./models/Question");
require("./models/School");
// ROUTES
const publicRoutes = require("./routes/publicRoutes");
const codeRoutes = require("./routes/codeRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const questionRoutes = require("./routes/questionRoutes");
const teacherTestRoutes = require("./routes/teacherTestRoutes");
const studentSubmissionRoutes = require("./routes/studentSubmissionRoutes");
const testAssignmentRoutes = require("./routes/testAssignmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const platformRoutes = require("./routes/platformRoutes");
app.use(compression());
app.use(cookieParser());
app.use(express.json({
  limit: "2mb"
}));
app.use(globalLimiter);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      "[" +
      new Date().toISOString() +
      "]",
      req.method,
      req.originalUrl,
      res.statusCode,
      duration + "ms"
    );
  });
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "local",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
// ---------- ROUTES ----------
app.use("/", publicRoutes);
app.use("/", codeRoutes);
app.use("/", libraryRoutes);
app.use("/", questionRoutes);
app.use("/", teacherTestRoutes);
app.use("/", studentSubmissionRoutes);
app.use("/", testAssignmentRoutes);
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", teacherRoutes);
app.use("/", adminRoutes);
app.use("/", studentRoutes);
app.use("/", reportRoutes);
app.use("/", platformRoutes);
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", {
    message: err.message,
    stack:
      process.env.NODE_ENV !== "production"
        ? err.stack
        : undefined,
    path: req.originalUrl,
    method: req.method
  });
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error"
  });
});
const startServer = async () => {
  await connectDB();
  const PORT = envConfig.port;
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
};
startServer();
