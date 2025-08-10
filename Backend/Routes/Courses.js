const express = require('express');
const router = express.Router();
const { Course, validateCourse } = require('../model/Courses');
const { Department } = require('../model/Department');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const multer = require('multer');
const path = require('path');
const logger = require('../Middleware/winstonLogger');


router.get('/inactive', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
      const result = await Course.find({ status: false }).lean();
      return res.send(result);
    } catch (error) {
      logger.error('Error in GET /courses/inactive: %o', error);
      res.status(500).send(error.message);
    }
});

router.put('/approve/:id', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
      const result = await Course.findByIdAndUpdate(req.params.id, { status: true });
      return res.send(result);
    } catch (error) {
      logger.error('Error in PUT /courses/approve/:id: %o', error);
      res.status(500).send(error.message);
    }
});


router.put('/:courseid/schedule', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseid);
    if (!course) return res.status(404).send('Course not found');
   
    const { startDate, endDate, theme } = req.body;
    if (startDate) course.startDate = new Date(startDate);
    if (endDate) course.endDate = new Date(endDate);
    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).send('Invalid schedule: endDate must be after startDate');
    }
    if (theme !== undefined) course.theme = theme;
    await course.save();
    return res.send(course);
  } catch (error) {
    logger.error('Error in PUT /courses/:courseid/schedule: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/:courseid/details', AuthMiddleware, allowedRoles('Registrar', 'teacher'), async (req, res) => {
  try {
    const coursePromise = Course.findById(req.params.courseid).lean();
    const modulesPromise = require('../model/CourseModule').CourseModule.find({ course: req.params.courseid }).sort({ order: 1 }).lean();
    const studentsPromise = require('../model/EnrolledCourse').EnrolledCourse.find({ course: req.params.courseid })
      .populate({ path: 'user', select: ' fullName email' })
      .lean();
    const [result, courseModules, enrolledStudents] = await Promise.all([
      coursePromise,
      modulesPromise,
      studentsPromise
    ]);
    if (!result) {
      return res.status(404).send("Course not found");
    }
    return res.send({ result, courseModules, enrolledStudents });
  } catch (error) {
    logger.error('Error in GET /courses/:courseid/details: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/', AuthMiddleware, async (req, res) => {
  try {
    const query = req.query.q || '';
    const categoryId = req.query.category || '';

    let searchCriteria = {
 };

    if (query) {
      const regex = new RegExp(query, 'i');
      searchCriteria.$or = [{ name: regex }, { description: regex }];
    }

    if (categoryId) {
      searchCriteria.catagory = categoryId;
    }

    let result = await Course.find(searchCriteria).select('-__v').lean();
    // For students, only show currently active (in time window) courses
    if (req.user.role === 'student') {
      const now = new Date();
      result = result.filter(c => {
        if (c.startDate && now < new Date(c.startDate)) return false;
        if (c.endDate && now > new Date(c.endDate)) return false;
        return true;
      });
    }
    res.send(result);
  } catch (error) {
    logger.error('Error in GET /courses: %o', error);
    res.status(500).send(error.message);
  }
});






router.get('/:courseid', AuthMiddleware, async (req, res) => {
  try {
    const result = await Course.findById(req.params.courseid)
      .populate({ path: 'catagory', select: 'name' })
      .populate({ path: 'createdBy', select: 'fullName email' })
      .populate({
        path: 'coursemodules',
        select: 'name order',
        options: { sort: { order: 1 } }
      })
      .lean();
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /courses/:courseid: %o', error);
    return res.status(500).send(error.message);
  }
});

 
  
  

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/catagory');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });



router.post('/registrar', AuthMiddleware, allowedRoles('Registrar'), upload.single("image"), async (req, res) => {
    try {
      const image = req.file;
      if(!image){
          return res.status(400).send("image is required")
      }
      req.body.image=`uploads/catagory/${image.filename}`
      req.body.createdBy=req.user._id
   
      if (req.body.department) {
        const dep = await Department.findById(req.body.department).lean();
        if (!dep) return res.status(400).send('Invalid department');
      }
      const {error}=validateCourse(req.body)
      if(error){
          return res.status(400).send(error.details[0].message)
      }
      const result=await Course.create(req.body)
      return res.send(result)
    } catch (error) {
      logger.error('Error in POST /courses: %o', error);
      return res.status(500).send(error.message);
    }
});


router.put('/:courseid/assign-teacher/:teacherid', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseid);
    if (!course) return res.status(404).send('Course not found');
  
    if (course.department && (!req.user.department || course.department.toString() !== req.user.department.toString())) {
      return res.status(403).send('Not allowed: cross-department assignment');
    }
    const teacher = await require('../model/User').User.findById(req.params.teacherid);
    if (!teacher || teacher.role !== 'teacher') return res.status(400).send('Invalid teacher');
   
    if (course.department && teacher.department && teacher.department.toString() !== course.department.toString()) {
      return res.status(400).send('Teacher not in this department');
    }
    course.assignedTeacher = teacher._id;
    await course.save();
    return res.send(course);
  } catch (error) {
    logger.error('Error in PUT /courses/:courseid/assign-teacher/:teacherid: %o', error);
    return res.status(500).send(error.message);
  }
});
router.get('/courses', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
    try {
      const result = await Course.find({
        $or: [
          { createdBy: req.user._id },
          { assignedTeacher: req.user._id }
        ]
      }).lean();
      res.send(result);
    } catch (error) {
      res.status(500).send(error.message);
    }
  
    
  })

module.exports=router
