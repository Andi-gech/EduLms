const allowedRoles = require('../Middleware/allowedRoles');
const logger = require('../Middleware/winstonLogger');
const express = require("express");
const router = express.Router();
const {Exam} = require("../model/Exam");
const mongoose = require("mongoose");
const AuthMiddleware = require("../Middleware/AuthMiddleware");
const { Result } = require("../model/Result");



router.post('/', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
    const examData = req.body; 
    try {
      const newExam = new Exam(examData);
      const isvalid=require('mongoose').Types.ObjectId.isValid(newExam.CourseModule)
      if(!isvalid){
        return res.status(400).send("invalid id")
      }
      const coursemodule=await require('../model/CourseModule').CourseModule.findById(newExam.CourseModule)
      if(!coursemodule){
          return res.status(404).send("course not found")
      }
      
      const course = await require('../model/Courses').Course.findById(coursemodule.course).select('createdBy assignedTeacher');
      if (!course) return res.status(404).send('Course not found');
      const uid = req.user._id.toString();
      const isOwner = course.createdBy && course.createdBy.toString() === uid;
      const isAssigned = course.assignedTeacher && course.assignedTeacher.toString() === uid;
      if (!isOwner && !isAssigned) {
        return res.status(403).send('Only course owner or assigned teacher can perform this action');
      }
      const questions = examData.questions.map(async (question) => {
          const answers = await Promise.all(question.answers.map(async (answer) => {
              const newAnswer = new (require('../model/Answer').Answer)(answer);
              await newAnswer.save();
              return newAnswer._id;
          }));
          const newQuestion = new (require('../model/Question').Question)({
              question: question.question,
              mark: question.mark,
              answers: answers, 
          });
          await newQuestion.save();
          return newQuestion._id;
      });
      const createdQuestions = await Promise.all(questions);
      newExam.questions = createdQuestions;
      await newExam.save();
      res.json(newExam);
    } catch (error) {
        logger.error('Error in POST /exams: %o', error);
        res.status(500).json({ message: 'Error creating exam' });
    }
});


router.get('/module/:moduleId', AuthMiddleware, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const isValid = mongoose.Types.ObjectId.isValid(moduleId);

    if (!isValid) {
      return res.status(400).send("Invalid module id");
    }

    const exams = await Exam.find({ CourseModule: moduleId }).lean();
    
    const now = new Date();
    const visibleExams = exams.filter(e => {
      if (!e.startTime && !e.endTime && !e.examDate) return true;
      if (e.startTime && now < new Date(e.startTime)) return false;
      if (e.endTime && now > new Date(e.endTime)) return false;
      if (e.examDate) {
        const sameDay = new Date(e.examDate).toDateString() === now.toDateString();
        if (!sameDay) return false;
      }
      return true;
    });
    let passed = false;
    if (visibleExams.length > 0) {
      const result = await Result.find({
        exam: visibleExams[0]._id,
        user: req.user._id,
        ispassed: true
      }).lean();
      passed = result.length > 0;
    }
    return res.send({
      exams: visibleExams,
      passed: passed
    });
  } catch (error) {
    logger.error('Error in GET /exams/module/:moduleId: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate({
        path: "questions",
        select: 'question mark answers',
        populate: { path: "answers", model: "Answer", select: 'text isCorrect' },
      })
      .lean();
    if (!exam) {
      return res.status(404).send("Exam not found");
    }
    return res.send(exam);
  } catch (error) {
    logger.error('Error in GET /exams/:examId: %o', error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
