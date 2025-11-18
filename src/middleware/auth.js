import jwt from 'jsonwebtoken';
import { databases, config } from '../config/appwrite.js';
import { Query } from 'node-appwrite';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const authenticateUser = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
    
    if (req.user.role === 'user' || req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'User access required' });
    }
  } catch (error) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
};



