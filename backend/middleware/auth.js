const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        // Check if no token
        if (!token) {
            return res.status(401).json({ 
                message: 'No token, authorization denied',
                error: 'No token provided'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Set user data directly from decoded token
            req.user = {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                isAdmin: decoded.isAdmin
            };
            
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token has expired',
                    error: 'token_expired'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    message: 'Invalid token format',
                    error: 'invalid_token'
                });
            } else {
                return res.status(401).json({ 
                    message: 'Token verification failed',
                    error: error.message
                });
            }
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            message: 'Server error during authentication',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
