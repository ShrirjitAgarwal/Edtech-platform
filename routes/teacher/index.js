const router = require("express").Router();
const dashboardRoutes = require("./dashboardRoutes");
const classRoutes = require("./classRoutes");
const settingsRoutes = require("./settingsRoutes");
const testListRoutes = require("./testListRoutes");
const testCreateRoutes = require("./testCreateRoutes");
const testSettingsRoutes = require("./testSettingsRoutes");

router.use("/", dashboardRoutes);
router.use("/", classRoutes);
router.use("/", settingsRoutes);
router.use("/", testListRoutes);
router.use("/", testCreateRoutes);
router.use("/", testSettingsRoutes);

module.exports = router;
