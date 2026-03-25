// middleware/auth.js
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'crma42_secret_key';

/**
 * Middleware: ตรวจสอบ JWT Token
 */
const verifyTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware Factory: ตรวจสอบ Role
 * @param {string[]} allowedRoles
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
  }
  next();
};

module.exports = { verifyTokenMiddleware, requireRole };
