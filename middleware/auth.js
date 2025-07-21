const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Set the user ID from the decoded token
      req.user = { id: decoded.userId };
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired, please log in again',
          error: 'TokenExpiredError' 
        });
      }
      res.status(401).json({ 
        message: 'Token verification failed, authorization denied',
        error: process.env.NODE_ENV === 'development' ? verifyError.message : undefined
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error in auth middleware' });
  }
};

module.exports = auth; 