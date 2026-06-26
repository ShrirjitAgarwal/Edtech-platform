const express = require("express");
const path = require("path");
const router = express.Router();
const publicController = require("../controllers/publicController");
router.get("/", publicController.home);
router.get("/login", publicController.loginPage);
router.get("/register", publicController.registerPage);
router.get("/admin-login", publicController.adminLoginPage);
router.get("/book-demo", publicController.bookDemo);
router.get("/privacy", publicController.privacyPolicy);
router.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.sendFile(path.join(__dirname, "..", "public", "robots.txt"));
});
router.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  res.sendFile(path.join(__dirname, "..", "public", "sitemap.xml"));
});
module.exports = router;