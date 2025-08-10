
const { Course } = require('../model/Courses');
const mongoose = require("mongoose");
const logger = require('./winstonLogger');

const CourseOwner = async (req, res, next) => {
    try {
        const courseid = req.params.courseid;
        const isValid = mongoose.Types.ObjectId.isValid(courseid);
        if (!isValid) {
            return res.status(400).json({ error: "Invalid id" });
        }
        const result = await Course.findOne({
            createdBy: req.user._id,
            _id: courseid
        });
        if (!result) {
            return res.status(403).json({ error: 'Only owner can perform this action' });
        }
        next();
    } catch (error) {
        logger.error('CourseOwner middleware error: %o', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = CourseOwner;
