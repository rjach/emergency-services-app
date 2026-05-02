const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'Server auth is not configured',
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid authorization header',
    });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this resource',
      });
    }
    next();
  };
}

/**
 * Attach req.user when a valid Bearer token is present; otherwise continue
 * without authentication (for public endpoints that optionally record the reporter).
 */
function optionalAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Invalid or expired token: treat as anonymous for this public action.
  }
  next();
}

module.exports = {
  getBearerToken,
  requireAuth,
  requireRole,
  optionalAuth,
};
