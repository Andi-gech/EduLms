
const mongoose = require("mongoose");
const {EnrolledCourse} = require("../model/EnrolledCourse");
const logger = require("./winstonLogger");

const isEnrolled = async (req, res, next) => {
    try {
        const courseId = req.params.courseid;
        const userId = req.user._id;

        const isValid = mongoose.Types.ObjectId.isValid(courseId);
        if (!isValid) {
            return res.status(400).json({ error: "Invalid id" });
        }

        const result = await EnrolledCourse.findOne({ user: userId, course: courseId });
        if (!result) {
            return res.status(401).json({ error: 'User is not enrolled in this course' });
        }

        next();
    } catch (error) {
        logger.error('Error in isEnrolled middleware: %o', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = isEnrolled;
