const jwt = require("jsonwebtoken");
const {
  logAuditEvent
} = require("../services/auditLogger");

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

  if (!token && req.query.token) {
    token = req.query.token;
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    req.token = token;

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