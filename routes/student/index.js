const router = require("express").Router();
const entryRoutes = require("./entryRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const testRoutes = require("./testRoutes");

router.use("/", entryRoutes);
router.use("/", dashboardRoutes);
router.use("/", testRoutes);

module.exports = router;
