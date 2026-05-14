const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "staging"
    ? ".env.staging"
    : ".env.local";
require("dotenv").config({ path: envFile });
console.log("ENV:", process.env.NODE_ENV || "local");
const express = require("express");
const path = require("path");
const connectDB = require("./data/config/db");
const app = express();
// REGISTER MODELS
require("./models/User");
require("./models/Student");
require("./models/Class");
require("./models/Test");
require("./models/Result");
require("./models/Assignment");
require("./models/ClassSubject");
require("./models/Question");
// ROUTES
const publicRoutes = require("./routes/publicRoutes");
const testRoutes = require("./routes/testRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const reportRoutes = require("./routes/reportRoutes");
app.use(express.json());
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
app.use("/", testRoutes);
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", teacherRoutes);
app.use("/", adminRoutes);
app.use("/", studentRoutes);
app.use("/", reportRoutes);
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    error: "Internal server error"
  });
});
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
};
startServer();
