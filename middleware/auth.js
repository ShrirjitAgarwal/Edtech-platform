const jwt = require("jsonwebtoken");
function authMiddleware(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).send("No token");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
}
module.exports = authMiddleware;