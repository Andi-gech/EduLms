const express = require('express');
const router = express.Router();
const { Course, validateCourse } = require('../model/Courses');
const { Department } = require('../model/Department');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const multer = require('multer');
const path = require('path');
const logger = require('../Middleware/winstonLogger');
const mongoose = require('mongoose');


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
   
  const { startDate, endDate } = req.body;
    if (startDate) course.startDate = new Date(startDate);
    if (endDate) course.endDate = new Date(endDate);
    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).send('Invalid schedule: endDate must be after startDate');
    }
    await course.save();
    return res.send(course);
  } catch (error) {
    logger.error('Error in PUT /courses/:courseid/schedule: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/:courseid/details', AuthMiddleware, allowedRoles('Registrar', 'teacher','department_head','department_admin','short_training_office'), async (req, res) => {
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


// Generic list (all roles) with optional search / pagination
router.get('/', AuthMiddleware, async (req, res) => {
  try {
    const query = req.query.q || '';
  const categoryId = req.query.category || '';
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 0; // if 0 return all (legacy behavior)

    let searchCriteria = {
 };

    if (query) {
      const regex = new RegExp(query, 'i');
      searchCriteria.$or = [{ name: regex }, { description: regex }];
    }

  // catagory removed

    let cursor = Course.find(searchCriteria).select('-__v');
    const total = await Course.countDocuments(searchCriteria);
    if (pageSize > 0) {
      cursor = cursor.skip((page - 1) * pageSize).limit(pageSize);
    }
    let result = await cursor.lean();
    // For students, only show currently active (in time window) courses
    if (req.user.role === 'student') {
      const now = new Date();
      result = result.filter(c => {
        if (c.startDate && now < new Date(c.startDate)) return false;
        if (c.endDate && now > new Date(c.endDate)) return false;
        return true;
      });
    }
    if (pageSize > 0) {
      return res.json({ data: result, total, page, pageSize });
    }
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /courses: %o', error);
    res.status(500).send(error.message);
  }
});

// Department-scoped courses for department head/admin to manage (assignment etc.)
router.get('/department/mine', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const filter = { }; // status independent; show all in department
    if (req.user.department) filter.department = req.user.department;
    const courses = await Course.find(filter).select('-__v').lean();
    return res.json(courses);
  } catch (error) {
    logger.error('Error in GET /courses/department/mine: %o', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Department overview aggregate
router.get('/department/overview/stats', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    if (!req.user.department) return res.json({ courses: 0, enrollments: [], exams: [], upcoming: [] });
    const deptId = req.user.department;

    // Courses in department
    const courses = await Course.find({ department: deptId }).select('name _id assignedTeacher').lean();
    const courseIds = courses.map(c => c._id);

    // Enrollment counts per course
    const EnrolledCourse = require('../model/EnrolledCourse').EnrolledCourse;
    const enrollmentsRaw = await EnrolledCourse.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);
    const enrollmentMap = Object.fromEntries(enrollmentsRaw.map(e => [e._id.toString(), e.count]));

    // Exams whose course belongs to this department (populate course + assignedTeacher + createdBy)
    const Exam = require('../model/Exam').Exam;
    const examDocs = await Exam.find({})
      .populate({
        path: 'course',
        select: 'department assignedTeacher name',
        populate: { path: 'assignedTeacher', select: 'fullName' }
      })
      .populate({ path: 'createdBy', select: 'fullName' })
      .select('title course startTime endTime examDate status createdBy')
      .lean();

    const deptExams = examDocs.filter(e => e.course && e.course.department && e.course.department.toString() === deptId.toString());
    const deptExamIds = deptExams.map(e => e._id);

    // Aggregate approved results for pass statistics
    const Result = require('../model/Result').Result;
    const resultAgg = await Result.aggregate([
      { $match: { exam: { $in: deptExamIds }, approved: true } },
      { $group: { _id: '$exam', total: { $sum: 1 }, passed: { $sum: { $cond: ['$ispassed', 1, 0] } } } }
    ]);
    const resultMap = Object.fromEntries(resultAgg.map(r => [r._id.toString(), { total: r.total, passed: r.passed }]));

    const now = new Date();
    const upcomingRaw = deptExams.filter(e => {
      const start = e.startTime ? new Date(e.startTime) : (e.examDate ? new Date(e.examDate) : null);
      return start && start > now;
    }).slice(0, 10);

    const examsSummary = deptExams.map(e => ({
      _id: e._id,
      title: e.title,
      status: e.status,
      total: resultMap[e._id.toString()]?.total || 0,
      passed: resultMap[e._id.toString()]?.passed || 0
    }));

    res.json({
      courses: courses.length,
      enrollments: courses.map(c => ({ courseId: c._id, name: c.name, users: enrollmentMap[c._id.toString()] || 0 })),
      exams: examsSummary,
      upcoming: upcomingRaw.map(u => ({
        _id: u._id,
        title: u.title,
        when: u.startTime || u.examDate,
        courseId: u.course._id || u.course,
        courseName: u.course.name,
        instructorName: (u.course.assignedTeacher && u.course.assignedTeacher.fullName) || (u.createdBy && u.createdBy.fullName) || ''
      }))
    });
  } catch (error) {
    logger.error('Error in GET /courses/department/overview/stats: %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});






// Teacher own / assigned courses (must be BEFORE dynamic :courseid route to avoid conflicts)
router.get('/courses', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const result = await Course.find({
      $or: [
        { createdBy: req.user._id },
        { assignedTeacher: req.user._id }
      ]
    }).lean();
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /courses/courses: %o', error);
    res.status(500).send(error.message);
  }
});

router.get('/:courseid', AuthMiddleware, async (req, res) => {
  try {
    const { courseid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseid)) return res.status(400).send('Invalid id');
  const result = await Course.findById(courseid)
      .populate({ path: 'createdBy', select: 'fullName email' })
      .populate({
        path: 'coursemodules',
        select: 'name order',
        options: { sort: { order: 1 } }
      })
      .lean();
    if (!result) return res.status(404).send('Course not found');
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /courses/:courseid: %o', error);
    return res.status(500).send(error.message);
  }
});

// Generic create (JSON body). Image upload still supported via /registrar
router.post('/', AuthMiddleware, allowedRoles('Registrar','teacher'), async (req, res) => {
  try {
    // Reuse validator; if image omitted that's fine (multer path only on /registrar)
    const body = { ...req.body, createdBy: req.user._id };
    const { error } = validateCourse(body);
    if (error) return res.status(400).send(error.details[0].message);
    const course = await Course.create(body);
    return res.status(201).json(course);
  } catch (error) {
    logger.error('Error in POST /courses: %o', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Generic update of editable fields
router.put('/:courseid', AuthMiddleware, allowedRoles('Registrar','teacher','department_head','department_admin'), async (req, res) => {
  try {
    const { courseid } = req.params;
    const course = await Course.findById(courseid);
    if (!course) return res.status(404).send('Course not found');
  const editable = ['name','description','department','assignedTeacher','startDate','endDate','status'];
    for (const f of editable) if (f in req.body) course[f] = req.body[f];
    // schedule validation similar to schedule route
    if (course.startDate && course.endDate && new Date(course.endDate) < new Date(course.startDate)) {
      return res.status(400).send('Invalid schedule: endDate must be after startDate');
    }
    await course.save();
    return res.json(course);
  } catch (error) {
    logger.error('Error in PUT /courses/:courseid: %o', error);
    return res.status(500).json({ error: 'Internal Server Error' });
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
// (moved teacher route above :courseid to prevent CastError when path segment is 'courses')

module.exports=router
