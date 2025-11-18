import express from 'express';
import jwt from 'jsonwebtoken';
import { databases, config } from '../config/appwrite.js';
import { Query, ID } from 'node-appwrite';

const router = express.Router();

// Mock admin credentials (in production, store securely in Appwrite)
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123'; // Change this!

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if admin credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { 
          userId: 'admin',
          email: ADMIN_EMAIL,
          role: 'admin' 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          userId: 'admin',
          email: ADMIN_EMAIL,
          role: 'admin'
        }
      });
    }

    // Check regular users in Appwrite
    try {
      const usersList = await databases.listDocuments(
        config.databaseId,
        config.usersCollectionId,
        [Query.equal('email', email)]
      );

      if (usersList.documents.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = usersList.documents[0];

      // In production, use proper password hashing (bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { 
          userId: user.$id,
          email: user.email,
          role: user.role || 'user'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          userId: user.$id,
          email: user.email,
          role: user.role || 'user',
          name: user.name
        }
      });

    } catch (error) {
      console.error('Database error:', error);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    // Check if user already exists
    const existingUsers = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('email', email)]
    );

    if (existingUsers.documents.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    // WARNING: In production, hash passwords with bcrypt!
    const newUser = await databases.createDocument(
      config.databaseId,
      config.usersCollectionId,
      ID.unique(),
      {
        email,
        password, // Store hashed in production!
        name,
        role: 'user'
      }
    );

    const token = jwt.sign(
      { 
        userId: newUser.$id,
        email: newUser.email,
        role: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
      user: {
        userId: newUser.$id,
        email: newUser.email,
        role: 'user',
        name: newUser.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;

