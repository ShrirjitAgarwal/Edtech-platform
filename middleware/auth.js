const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/RevokedToken");
const {
  logAuditEvent
} = require("../services/auditLogger");
function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}
async function logPermissionDenied(req, reason, errorMessage) {
  await logAuditEvent(req, {
    event: "permission_denied",
    status: "failed",
    metadata: {
      reason,
      method: req.method,
      path: req.originalUrl
    },
    error: errorMessage
  });
}
async function authMiddleware(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }
  const header = req.headers.authorization;
  if (!token && header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }
  if (!token) {
    await logPermissionDenied(
      req,
      "missing_token",
      "No token"
    );
    return res.status(401).send("No token");
  }
  try {
    const tokenHash = hashToken(token);
    const revokedToken = await RevokedToken.findOne({
      tokenHash
    })
      .select("_id")
      .lean();
    if (revokedToken) {
      await logPermissionDenied(
        req,
        "revoked_token",
        "Token has been revoked"
      );
      return res.status(401).send("Token has been revoked");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    req.tokenHash = tokenHash;
    next();
  } catch (err) {
    await logPermissionDenied(
      req,
      "invalid_token",
      "Invalid token"
    );
    return res.status(401).send("Invalid token");
  }
}
module.exports = authMiddleware;