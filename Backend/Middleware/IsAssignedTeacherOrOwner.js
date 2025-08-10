const { Course } = require('../model/Courses');
const mongoose = require('mongoose');

module.exports = async (req, res, next) => {
  try {
    const courseid = req.params.courseid || req.body.course || (req.course && req.course._id);
    if (!courseid || !mongoose.Types.ObjectId.isValid(courseid)) {
      return res.status(400).send('Invalid course id');
    }
    const course = await Course.findById(courseid).select('createdBy assignedTeacher');
    console.log('Course found:', course);
    if (!course) return res.status(404).send('Course not found');
    const uid = req.user._id.toString();
    const isOwner = course.createdBy && course.createdBy.toString() === uid;
    const isAssigned = course.assignedTeacher && course.assignedTeacher.toString() === uid;
    if (!isOwner && !isAssigned) {
      return res.status(403).send('Only course owner or assigned teacher can perform this action');
    }
    next();
  } catch (e) {
    return res.status(500).send(e.message);
  }
}
