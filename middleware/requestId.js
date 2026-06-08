const crypto = require("crypto");
function requestIdMiddleware(req, res, next) {
  const existingRequestId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"];
  const requestId =
    existingRequestId ||
    crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
module.exports = requestIdMiddleware;