function platformAdminMiddleware(req, res, next) {
  const allowedEmail = "admin@test.com";

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send("Access denied");
  }

  const email = String(req.user.email || "").toLowerCase();

  if (email !== allowedEmail) {
    return res.status(403).send("Platform admin only");
  }

  next();
}

module.exports = platformAdminMiddleware;