function safeValue(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return String(value);
}
function log(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || "local",
    ...meta
  };
  const output = JSON.stringify(logEntry);
  if (level === "error") {
    console.error(output);
    return;
  }
  if (level === "warn") {
    console.warn(output);
    return;
  }
  console.log(output);
}
function info(message, meta = {}) {
  log("info", message, meta);
}
function warn(message, meta = {}) {
  log("warn", message, meta);
}
function error(message, meta = {}) {
  log("error", message, meta);
}
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    info("request completed", {
      requestId: safeValue(req.requestId),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: safeValue(req.user && req.user.id),
      role: safeValue(req.user && req.user.role)
    });
  });
  next();
}
function errorLogger(err, req) {
  error("server error", {
    requestId: safeValue(req.requestId),
    message: err.message,
    stack:
      process.env.NODE_ENV !== "production"
        ? err.stack
        : undefined,
    method: req.method,
    path: req.originalUrl,
    userId: safeValue(req.user && req.user.id),
    role: safeValue(req.user && req.user.role)
  });
}
module.exports = {
  info,
  warn,
  error,
  requestLogger,
  errorLogger
};