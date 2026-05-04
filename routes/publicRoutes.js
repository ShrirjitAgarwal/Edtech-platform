const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
router.get("/", publicController.home);
router.get("/login", publicController.loginPage);
router.get("/register", publicController.registerPage);
router.get("/admin-login", publicController.adminLoginPage);
module.exports = router;