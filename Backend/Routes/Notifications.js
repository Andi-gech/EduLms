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

// Mark notification as read
router.post('/:id/read', AuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        if (!require('mongoose').Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
        const updated = await Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { isRead: true }, { new: true }).lean();
        if (!updated) return res.status(404).send('Not found');
        return res.json(updated);
    } catch (error) {
        logger.error('Error in POST /notifications/:id/read: %o', error);
        res.status(500).send(error.message);
    }
});
module.exports = router