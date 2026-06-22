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
console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    message: "environment loaded",
    environment: envConfig.nodeEnv
  })
);
const express = require("express");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const connectDB = require("./data/config/db");
const logger = require("./utils/logger");
const requestIdMiddleware = require("./middleware/requestId");
const {
  getJudgeProvider
} = require("./services/config/judgeProvider");
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com",
      "img-src 'self' data:",
      "font-src 'self' data: cdn.jsdelivr.net cdnjs.cloudflare.com",
      "connect-src 'self'",
      "worker-src 'self' blob:"
    ].join("; ")
  );
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
require("./models/Subject");
require("./models/Question");
require("./models/ImportBatch");
require("./models/AdminActionLog");
require("./models/AuditLog");
require("./models/School");
require("./models/UsageEvent");
require("./models/SchoolComplianceAcceptance");
require("./models/RevokedToken");
// ROUTES
const publicRoutes = require("./routes/publicRoutes");
const codeRoutes = require("./routes/codeRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const questionRoutes = require("./routes/questionRoutes");

const studentSubmissionRoutes = require("./routes/studentSubmissionRoutes");
const testAssignmentRoutes = require("./routes/testAssignmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacher");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/student");
const reportRoutes = require("./routes/reportRoutes");
const platformRoutes = require("./routes/platformRoutes");
const platformAuthRoutes = require("./routes/platformAuthRoutes");
app.use(requestIdMiddleware);
app.use(compression());
app.use(cookieParser());
app.use(express.json({
  limit: "2mb"
}));
app.use(express.urlencoded({
  extended: true,
  limit: "2mb"
}));
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body, {
      replaceWith: "_"
    });
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params, {
      replaceWith: "_"
    });
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query, {
      replaceWith: "_"
    });
  }
  next();
});
app.use(globalLimiter);
app.use(logger.requestLogger);
const staticDir = path.join(__dirname, "public");
if (fs.existsSync(staticDir)) {
  app.use(
    express.static(staticDir, {
      maxAge:
        process.env.NODE_ENV === "production"
          ? "7d"
          : 0,
      etag: true,
      lastModified: true
    })
  );
} else {
  logger.info("static directory not found, skipping static middleware", {
    staticDir
  });
}
function getMongoHealth() {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  return {
    status: states[readyState] || "unknown",
    readyState,
    databaseName: mongoose.connection.name || null,
    host: mongoose.connection.host || null
  };
}
app.get("/health", (req, res) => {
  const mongo = getMongoHealth();
  const isHealthy = mongo.readyState === 1;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    environment: process.env.NODE_ENV || "local",
    uptime: process.uptime(),
    mongo,
    judgeProvider: getJudgeProvider(),
    localCodeExecutionEnabled:
      String(process.env.LOCAL_CODE_EXECUTION_ENABLED || "").toLowerCase() === "true",
    requestId: req.requestId || null,
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
app.use("/", platformAuthRoutes);
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", teacherRoutes);
app.use("/", adminRoutes);
app.use("/", studentRoutes);
app.use("/", reportRoutes);
app.use("/", platformRoutes);
app.use((err, req, res, next) => {
  logger.errorLogger(err, req);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
    requestId: req.requestId || null
  });
});
function getEnvStatus(name) {
  const value = String(process.env[name] || "").trim();
  return {
    name,
    present: Boolean(value),
    length: value.length || 0
  };
}
function getStartupRouteReport() {
  return [
    "publicRoutes",
    "codeRoutes",
    "libraryRoutes",
    "questionRoutes",
    "studentSubmissionRoutes",
    "testAssignmentRoutes",
    "platformAuthRoutes",
    "authRoutes",
    "dashboardRoutes",
    "teacherRoutes (routes/teacher/)",
    "adminRoutes",
    "studentRoutes (routes/student/)",
    "reportRoutes",
    "platformRoutes"
  ];
}
function logStartupHealthReport(port) {
  const mongo = getMongoHealth();
  const requiredEnv = [
    "JWT_SECRET",
    "MONGO_URI",
    "JUDGE_PROVIDER",
    "LOCAL_CODE_EXECUTION_ENABLED",
    "PLATFORM_ADMIN_EMAIL"
  ];
  logger.info("startup health report", {
    status: mongo.readyState === 1 ? "healthy" : "degraded",
    port,
    environment: process.env.NODE_ENV || "local",
    mongo,
    judgeProvider: getJudgeProvider(),
    localCodeExecutionEnabled:
      String(process.env.LOCAL_CODE_EXECUTION_ENABLED || "").toLowerCase() === "true",
    requiredEnv: requiredEnv.map(getEnvStatus),
    routesMounted: getStartupRouteReport()
  });
}
const startServer = async () => {
  try {
    await connectDB();
    const PORT = envConfig.port;
    app.listen(PORT, "0.0.0.0", () => {
      logger.info("server started", {
        port: PORT
      });
      logStartupHealthReport(PORT);
    });
  } catch (err) {
    logger.error("server startup failed", {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
};
startServer();
