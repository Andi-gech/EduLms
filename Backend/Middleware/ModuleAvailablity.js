
const mongoose = require('mongoose');
const { CourseModule } = require('../model/CourseModule');
const { EnrolledCourse } = require('../model/EnrolledCourse');
const logger = require('./winstonLogger');

const isModuleAvailable = async (req, res, next) => {
  try {
    const { moduleid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(moduleid)) {
      return res.status(400).json({ error: 'Invalid module id' });
    }

    const module = await CourseModule.findById(moduleid).select('order course');
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (module.order === 0) {
      return next();
    }

    const previousModuleOrder = Number(module.order) - 1;
    const previousModule = await CourseModule.findOne({
      course: module.course,
      order: previousModuleOrder.toString()
    }).select('_id');

    if (!previousModule) {
      return next();
    }

    const enrolledCourse = await EnrolledCourse.findOne({
      course: module.course,
      user: req.user._id
    }).select('completedModules');

    if (!enrolledCourse) {
      return res.status(403).json({ error: 'User is not enrolled in this course' });
    }

    const isModuleCompleted = enrolledCourse.completedModules.some(
      ({ id }) => id.equals(previousModule._id)
    );

    if (isModuleCompleted) {
      return next();
    }

    return res.status(403).json({ error: 'Previous module not completed' });
  } catch (error) {
    logger.error('isModuleAvailable middleware error: %o', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = isModuleAvailable;
