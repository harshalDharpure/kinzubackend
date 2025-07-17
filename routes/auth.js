const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { createUser, getUserByEmail } = require('../middleware/dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Load environment variables
dotenv.config();

// Verify JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
  process.exit(1);
}

// Health check endpoint for DynamoDB
router.get('/health', async (req, res) => {
  try {
    const REGION = process.env.AWS_REGION || 'us-east-1';
    const USERS_TABLE = 'Users';
    const ddbClient = new DynamoDBClient({ region: REGION });
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
    // Try to get a non-existent item (should not error if table exists and permissions are correct)
    await ddbDocClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { user_uuid: 'health-check' } }));
    res.json({ status: 'ok', message: 'DynamoDB connection successful' });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', message: 'DynamoDB connection failed', error: error.message });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup route hit');
    console.log('Signup request body:', req.body);
    const { name, email, password, address, birthday } = req.body;
    if (!name || !email || !password || !address || !birthday) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log('Email already in use:', email);
      return res.status(400).json({ message: 'Email already in use' });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);
    // Create user in DynamoDB
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      address,
      birthday,
      createdAt: new Date().toISOString(),
    });
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_uuid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('User created successfully:', user.user_uuid);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.user_uuid,
        name: user.name,
        email: user.email,
        address: user.address,
        birthday: user.birthday
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    // Always return a JSON response, even on error
    res.status(500).json({ message: 'Error creating user', error: error.message || String(error) });
  }
});

// Catch-all error handler for uncaught exceptions in this file
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user by email in DynamoDB
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_uuid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_uuid,
        name: user.name,
        email: user.email,
        address: user.address,
        birthday: user.birthday
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

module.exports = router; 