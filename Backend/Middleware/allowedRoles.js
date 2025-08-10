
module.exports = (...roles) => (req, res, next) => {
    try {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(401).json({ error: `User does not have required role(s): ${roles.join(', ')}` });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
