

const jwt = require('jsonwebtoken');
const logger = require('./winstonLogger');

module.exports = (req, res, next) => {
    
    const authHeader = req.headers['authorization']
  
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (!token) {
        logger.error('No token provided', { method: req.method, url: req.originalUrl });
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, 'mysecretpassword', (err, user) => {
        if (err) {
            logger.error('Invalid or expired token', { method: req.method, url: req.originalUrl });
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.log('Decoded user from token:', user);
        req.user = user; // Attach user info to request object
        next();
    });
}

