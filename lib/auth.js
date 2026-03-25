import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || 'crma42_secret_key';

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    return null;
  }
};

export const generateToken = (payload, expiresIn = '30d') => {
  return jwt.sign(payload, secretKey, { expiresIn });
};

export const getTokenFromRequest = (req) => {
  const authHeader = typeof req.headers?.get === 'function'
    ? req.headers.get('authorization')
    : req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

export const withAuth = async (handler) => {
  return async (req, res) => {
    try {
      const token = getTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
      }

      req.user = decoded;
      return handler(req, res);
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};
