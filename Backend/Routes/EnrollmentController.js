const AuthMiddleware = require("../Middleware/AuthMiddleware");
const allowedRoles = require('../Middleware/allowedRoles');
const logger = require('../Middleware/winstonLogger');
const mongoose = require("mongoose");
const { EnrolledCourse } = require("../model/EnrolledCourse");
const { CourseModule } = require("../model/CourseModule");
const {Notification}=require("../model/Notification")
const { validateEnrolledCourse } = require("../model/EnrolledCourse");
const { Result } = require("../model/Result");
const {Exam}=require("../model/Exam")
const {Course}=require("../model/Courses")
const {User}=require("../model/User")
const express = require("express")
const router = express.Router();
const Chapa = require('chapa');
const isEnrolled = require("../Middleware/IsEnrolled");

let myChapa = new Chapa('CHASECK_TEST-gFVzUEvX8t2gMphMHXxf4v75KOnyHIPE')

router.post('/payinfo/verify', async (req, res) => {
  try {
    const jsonObj = JSON.parse(req.body.meta)
    const user=await User.findOne({email:req.body.email})
    const course=await Course.findById(jsonObj.reference)
    const enroll =await EnrolledCourse.create({
      user:user._id,
      course:jsonObj.reference,
      enrolledBy: user._id
    })
    await Notification.create({user:user._id,description:`Enrolled to ${course.name}`})
    return res.send(enroll)
  } catch (error) {
    logger.error('Error in POST /Enrollments/payinfo/verify: %o', error);
    return res.status(500).send(error.message);
  }
});

router.get('/with-progress', AuthMiddleware,allowedRoles('student'), async (req, res) => {
  try {

 
   const enrolledCourses = await EnrolledCourse.find({ user: req.user._id })
  .populate({
    path: "course",
    select: "coursemodules name description startDate endDate image assignedInstructor",
    populate: [
      { path: "coursemodules", select: "_id name title" },
      { path: "assignedTeacher", select: "fullName profilepic" }
    ]
  }).lean();
      console.log('Enrolled courses:', enrolledCourses);
     
    const result = enrolledCourses.map(enroll => {
      const totalModules = enroll.course && enroll.course.coursemodules ? enroll.course.coursemodules.length : 0;
      const completedModules = enroll.completedModules ? enroll.completedModules.length : 0;
      const progress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
      return {
        ...enroll,
        courseName: enroll.course ? enroll.course.name : undefined,
        progressPercent: progress
      };
    });
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /Enrollments/with-progress: %o', error);
    return res.status(500).send(error.message);
  }
});

router.get('/:courseid/modules/progress', AuthMiddleware, isEnrolled, async (req, res) => {
  try {

    const course = await Course.findById(req.params.courseid).select('startDate endDate');
    if (!course) return res.status(404).send('Course not found');
    const now = new Date();
    if (course.startDate && now < new Date(course.startDate)) {
      return res.status(403).send('Course not started yet');
    }
    if (course.endDate && now > new Date(course.endDate)) {
      return res.status(403).send('Course has ended');
    }
 
    const enrolled = await EnrolledCourse.findOne({
      user: req.user._id,
      course: req.params.courseid
    }).lean();
    if (!enrolled) {
      return res.status(403).send('You are not enrolled in this course');
    }
    
    let modules = await CourseModule.find({ course: req.params.courseid }).sort({ order: 1 }).lean();
    // Hide unapproved modules from students
    if (req.user.role === 'student') {
      modules = modules.filter(m => m.status === 'approved');
    }
 
    const completedSet = new Set((enrolled.completedModules || []).map(m => m.id.toString()));
    
    const result = modules.map(m => ({
      _id: m._id,
      name: m.name,
      order: m.order,
      completed: completedSet.has(m._id.toString())
    }));
    return res.send(result);
  } catch (error) {
    logger.error('Error in GET /Enrollments/:courseid/modules/progress: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/:courseid/module/:moduleid', AuthMiddleware, isEnrolled, async (req, res) => {
  try {

    const course = await Course.findById(req.params.courseid).select('startDate endDate');
    if (!course) return res.status(404).send('Course not found');
    const now = new Date();
    if (course.startDate && now < new Date(course.startDate)) {
      return res.status(403).send('Course not started yet');
    }
    if (course.endDate && now > new Date(course.endDate)) {
      return res.status(403).send('Course has ended');
    }
  
    const enrolled = await EnrolledCourse.findOne({
      user: req.user._id,
      course: req.params.courseid
    }).lean();
    if (!enrolled) {
      return res.status(403).send('You are not enrolled in this course');
    }
  
    const module = await CourseModule.findOne({
      _id: req.params.moduleid,
      course: req.params.courseid
    }).lean();
    if (!module) {
      return res.status(404).send('Module not found');
    }
    if (req.user.role === 'student' && module.status !== 'approved') {
      return res.status(404).send('Module not found');
    }
    
    const completedSet = new Set((enrolled.completedModules || []).map(m => m.id.toString()));
    const completed = completedSet.has(module._id.toString());
   
    return res.send({
      _id: module._id,
      name: module.name,
      order: module.order,
      type: module.type,
      content: module.content,
      videolink: module.videolink,
      linkUrl: module.linkUrl,
      completed
    });
  } catch (error) {
    logger.error('Error in GET /Enrollments/:courseid/module/:moduleid: %o', error);
    return res.status(500).send(error.message);
  }
});



router.post('/pay/:id', AuthMiddleware, async (req, res) => {
  try{
const user=await User.findById(req.user._id)
const course=await Course.findById(req.params.id)
const enroll =await EnrolledCourse.findOne({user:user._id,course:course._id})
if(enroll){
  return res.status(400).send("Already enrolled")
}

if (course.startDate && new Date() < new Date(course.startDate)) {
  return res.status(400).send('Enrollment not open yet');
}
if (course.endDate && new Date() > new Date(course.endDate)) {
  return res.status(400).send('Enrollment closed');
}

const customerInfo =  {
  amount: 0,
  currency: 'ETB',
  email: user.email,
  first_name: user.fullName,
  last_name: user.fullName,
  return_url: 'http://www.google.com',
  

 
  
 

  


  customization: {
    title: 'Test Title',
    description: 'Test Description',
  },

  
  meta: {
      reference: req.params.id
  }
  
}
  myChapa.initialize(customerInfo, { autoRef: true }).then(response => {
    return res.send(response)
    // saveReference(response.tx_ref)
  }).catch(e => logger.error('Chapa payment error: %o', e)) 

  }catch(error){
    logger.error('Error in POST /Enrollments/pay/:id: %o', error);
    return res.status(500).send(error.message);
  }
})


router.post('/assign/:courseId/:studentId', AuthMiddleware, allowedRoles('short_training_office'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).send('Course not found');
   
    if (course.startDate && new Date() < new Date(course.startDate)) {
      return res.status(400).send('Enrollment not open yet');
    }
    if (course.endDate && new Date() > new Date(course.endDate)) {
      return res.status(400).send('Enrollment closed');
    }
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') return res.status(400).send('Invalid student');
    const existing = await EnrolledCourse.findOne({ user: student._id, course: course._id });
    if (existing) return res.status(400).send('Already enrolled');
    const enroll = await EnrolledCourse.create({ user: student._id, course: course._id, enrolledBy: req.user._id });
    await Notification.create({ user: student._id, description: `Assigned to ${course.name}` });
    return res.send(enroll);
  } catch (error) {
    logger.error('Error in POST /Enrollments/assign/:courseId/:studentId: %o', error);
    return res.status(500).send(error.message);
  }
});

// Unassign / remove enrollment (short training office)
router.delete('/assign/:courseId/:studentId', AuthMiddleware, allowedRoles('short_training_office'), async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).send('Invalid id');
    const enrollment = await EnrolledCourse.findOneAndDelete({ course: courseId, user: studentId });
    if (!enrollment) return res.status(404).send('Enrollment not found');
    return res.json({ removed: true });
  } catch (error) {
    logger.error('Error in DELETE /Enrollments/assign/:courseId/:studentId: %o', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.put('/:courseid/completemodule', AuthMiddleware, async (req, res) => {
  try {
    const { courseid } = req.params;
    const { moduleid } = req.body;
    if (!mongoose.Types.ObjectId.isValid(courseid) || !mongoose.Types.ObjectId.isValid(moduleid)) {
      return res.status(400).send('Invalid id');
    }
    const courseInfo = await Course.findById(courseid).select('startDate endDate').populate('coursemodules');
    if (!courseInfo) return res.status(404).send('Course not found');
    const now = new Date();
    if (courseInfo.startDate && now < new Date(courseInfo.startDate)) return res.status(403).send('Course not started yet');
    if (courseInfo.endDate && now > new Date(courseInfo.endDate)) return res.status(403).send('Course has ended');

    const courseModule = await CourseModule.findById(moduleid);
    if (!courseModule) return res.status(404).send('Module not found');

    // Sequential unlock: ensure all previous ordered modules are already completed
    const ordered = [...courseInfo.coursemodules].sort((a, b) => a.order - b.order);
    const targetIndex = ordered.findIndex(m => m._id.equals(courseModule._id));
    if (targetIndex === -1) return res.status(400).send('Module not part of course');

    let enrollment = await EnrolledCourse.findOne({ course: courseid, user: req.user._id });
    if (!enrollment) return res.status(404).send('User not enrolled to this course');

    const completedSet = new Set((enrollment.completedModules || []).map(cm => cm.id.toString()));
    for (let i = 0; i < targetIndex; i++) {
      if (!completedSet.has(ordered[i]._id.toString())) {
        return res.status(400).send('Previous module not completed');
      }
    }

    // Remove prior exam pass requirement (exam optional now)
    if (completedSet.has(moduleid)) {
      return res.json({ alreadyCompleted: true, enrollment });
    }

    enrollment.completedModules.push({ id: moduleid });

    if (enrollment.completedModules.length === courseInfo.coursemodules.length) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }

    await enrollment.save();
    return res.json(enrollment);
  } catch (error) {
    logger.error('Error in PUT /Enrollments/:courseid/completemodule %o', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/exam/:examid/evaluate', AuthMiddleware, async (req, res) => {
  try {
    const { examid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examid)) {
      return res.status(400).send("Invalid exam id");
    }

    const exam = await Exam.findById(examid)
      .populate({
        path: "questions",
        populate: { path: "answers", model: "Answer" }
      })
      .populate('CourseModule');
    if (!exam) {
      return res.status(404).send("Exam not found");
    }
    if (!exam.CourseModule || !exam.CourseModule.course) {
      return res.status(400).send("Exam is not linked to a module or course");
    }
    const courseid = exam.CourseModule.course.toString();

    const enrolled = await EnrolledCourse.findOne({
      user: req.user._id,
      course: courseid
    });
    if (!enrolled) {
      return res.status(403).send("You are not enrolled in this course");
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).send("Answers are required");
    }

    let totalMarks = 0;
    for (const answerData of answers) {
      const { Answerid, Questionid } = answerData;
      const question = exam.questions.find(q => q._id.toString() === Questionid);
      if (!question) {
        return res.status(400).send(`Question with ID ${Questionid} not found in the exam`);
      }
      const selectedAnswer = question.answers.find(a => a._id.toString() === Answerid);
      if (!selectedAnswer) {
        return res.status(400).send(`Answer with ID ${Answerid} not found in question ${Questionid}`);
      }
      if (selectedAnswer.isCorrect) {
        totalMarks += 1;
      }
    }

    const now = new Date();
    if (exam.startTime && now < new Date(exam.startTime)) {
      return res.status(403).send('Exam has not opened yet');
    }
    if (exam.endTime && now > new Date(exam.endTime)) {
      return res.status(403).send('Exam is closed');
    }
    if (exam.examDate) {
      const sameDay = new Date(exam.examDate).toDateString() === now.toDateString();
      if (!sameDay) return res.status(403).send('Exam is not scheduled for today');
    }
    const isPassed = totalMarks / exam.questions.length > 0.5;

    const result = await Result.create({
      user: req.user._id,
      exam: examid,
      history: answers,
      marks: totalMarks,
      ispassed: isPassed,
    });

    return res.send({ result });
  } catch (error) {
    logger.error('Error in POST /Enrollments/exam/:examid/evaluate: %o', error);
    res.status(500).send(error.message);
  }
});


module.exports = router