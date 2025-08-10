const { Notification } = require("../model/Notification");
const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../Middleware/AuthMiddleware");
const logger = require('../Middleware/winstonLogger');

router.get('/', AuthMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id }).lean();
        return res.send(notifications);
    } catch (error) {
        logger.error('Error in GET /notifications: %o', error);
        res.status(500).send(error.message);
    }
});
module.exports = router