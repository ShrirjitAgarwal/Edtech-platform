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
router.get("/pricing", publicController.pricingPage);
router.get("/forgot-password", publicController.forgotPasswordPage);
router.get("/reset-password/:token", publicController.resetPasswordPage);
router.get("/robots.txt", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /school-dashboard\n" +
    "Disallow: /teacher\n" +
    "Disallow: /my-tests\n" +
    "Disallow: /platform/\n\n" +
    "Sitemap: https://wzdm.in/sitemap.xml\n"
  );
});
router.get("/sitemap.xml", (req, res) => {
  res.set("Content-Type", "application/xml");
  res.send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url><loc>https://wzdm.in/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n' +
    '  <url><loc>https://wzdm.in/book-demo</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n' +
    '  <url><loc>https://wzdm.in/pricing</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>\n' +
    '  <url><loc>https://wzdm.in/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n' +
    '</urlset>\n'
  );
});
module.exports = router;