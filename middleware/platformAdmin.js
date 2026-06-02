function platformAdminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "platform_admin") {
    return res.status(403).send("Platform admin only");
  }

  next();
}

module.exports = platformAdminMiddleware;