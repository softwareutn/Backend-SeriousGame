const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Auth failed: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Auth failed: Invalid token" });
      }
      req.userId = decoded.userId;
      req.userRole = decoded.rol;
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: "Auth failed" });
  }
};

module.exports = authenticateToken;