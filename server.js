require("dotenv").config();
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
app.use(express.static(path.join(__dirname, "public")));
// ---------- ROUTES ----------
app.use("/", publicRoutes);
app.use("/", testRoutes);
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", teacherRoutes);
app.use("/", adminRoutes);
app.use("/", studentRoutes);
app.use("/", reportRoutes);
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
};
startServer();
