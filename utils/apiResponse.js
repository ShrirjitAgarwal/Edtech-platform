function ok(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
}
function fail(
  res,
  message,
  statusCode = 500,
  code = "API_ERROR",
  details = null
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}
module.exports = {
  ok,
  fail
};