const jwt = require('jsonwebtoken');

// IMPORTANT: In a real app, store this in an environment variable (.env file)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_and_long_key_for_dev';

const authMiddleware = (req, res, next) => {
    // Get the token from the 'Authorization' header
    // The header is usually in the format "Bearer TOKEN"
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1]; // Split "Bearer TOKEN" and get the token part

    if (!token) {
        return res.status(401).json({ message: 'Token format is invalid, authorization denied' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach the user payload from the token to the request object
        // We can now access this in our controllers via req.user
        req.user = decoded.user || decoded; 

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;