const allowedRoles = require('../Middleware/allowedRoles');
const logger = require('../Middleware/winstonLogger');
const express = require("express");
const router = express.Router();
const {Exam} = require("../model/Exam");
const mongoose = require("mongoose");
const AuthMiddleware = require("../Middleware/AuthMiddleware");
 const { ExamSubmission } = require('../model/ExamSubmission');
const { Question } = require("../model/Question");
const { Answer } = require("../model/Answer");
const { Result } = require("../model/Result");



// Create exam
router.post('/', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
    const examData = { ...req.body };
    try {
      if (!examData.course) return res.status(400).json({ error: 'course is required' });
      if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
        return res.status(400).json({ error: 'questions are required' });
      }
      const totalMarksIncoming = examData.questions.reduce((sum,q)=> sum + (Number(q && q.mark) || 0), 0);
      if (totalMarksIncoming <= 0) return res.status(400).json({ error: 'Total marks must be > 0' });
      examData.ExamMark= totalMarksIncoming;
      // Validate payload (course now required)
      const { error } = require('../model/Exam').ValidateJoiSchema(examData);
      if (error) return res.status(400).json({ error: error.details[0].message });
    
      const newExam = new Exam(examData);
  // attach creator
  newExam.createdBy = req.user._id;
  if (newExam.course) {
        if (!mongoose.Types.ObjectId.isValid(newExam.course)) return res.status(400).send('Invalid course id');
        const course = await require('../model/Courses').Course.findById(newExam.course).select('createdBy assignedTeacher');
        if (!course) return res.status(404).send('Course not found');
        const uid = req.user._id.toString();
        const isOwner = course.createdBy && course.createdBy.toString() === uid;
        const isAssigned = course.assignedTeacher && course.assignedTeacher.toString() === uid;
        if (!isOwner && !isAssigned) return res.status(403).send('Only course owner or assigned teacher can perform this action');
      }
      const questions = examData.questions.map(async (q) => {
        // Basic guards
        if (!q || !q.question || q.mark == null || !q.type) {
          throw new Error('Invalid question payload: question, mark, and type are required');
        }
        const isMCQ = q.type === 'multiple_choice';
        const isBlank = q.type === 'blank';
        if (!isMCQ && !isBlank) {
          throw new Error('Invalid question type: ' + q.type);
        }
        let answerIds = [];
        if (isMCQ) {
          if (!Array.isArray(q.answers) || q.answers.length === 0) {
            throw new Error('Multiple choice question requires answers');
          }
          answerIds = await Promise.all(q.answers.map(async (ans) => {
            const newAnswer = new (require('../model/Answer').Answer)(ans);
            await newAnswer.save();
            return newAnswer._id;
          }));
        }
        const newQuestion = new (require('../model/Question').Question)({
          question: q.question,
          mark: q.mark,
            type: q.type,
          answers: isMCQ ? answerIds : undefined,
          blankAnswer: isBlank ? q.blankAnswer : undefined,
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

// Update exam (metadata + full question replacement)
// Update exam
router.put('/:examId', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  const { examId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid exam id');
console.log('examId', examId);
console.log(req.body)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Exam.findById(examId).session(session);
    if (!existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send('Exam not found');
    }
    if (existing.createdBy?.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).send('Forbidden');
    }

    const payload = req.body || {};
    const Question = require('../model/Question').Question;
    const Answer = require('../model/Answer').Answer;
    const finalQuestionIds = [];

    if (Array.isArray(payload.questions)) {
      for (const q of payload.questions) {
        if (!q.question || q.mark == null || !q.type) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: 'Invalid question payload' });
        }

        const isMCQ = q.type === 'multiple_choice';
        const isBlank = q.type === 'blank';
        if (!isMCQ && !isBlank) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: 'Invalid question type' });
        }

        let answerIds = [];

        if (isMCQ) {
          if (!Array.isArray(q.answers) || q.answers.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'MCQ requires answers' });
          }

          for (const ans of q.answers) {
            if (ans._id && mongoose.Types.ObjectId.isValid(ans._id)) {
              const updatedAns = await Answer.findByIdAndUpdate(ans._id, ans, { new: true, session });
              answerIds.push(updatedAns._id);
            } else {
              const newAns = new Answer(ans);
              await newAns.save({ session });
              answerIds.push(newAns._id);
            }
          }
        }

        if (q._id && mongoose.Types.ObjectId.isValid(q._id)) {
          const updatedQ = await Question.findByIdAndUpdate(
            q._id,
            {
              question: q.question,
              mark: q.mark,
              type: q.type,
              answers: isMCQ ? answerIds : undefined,
              blankAnswer: isBlank ? q.blankAnswer : undefined,
            },
            { new: true, session }
          );
          finalQuestionIds.push(updatedQ._id);
        } else {
          const newQ = new Question({
            question: q.question,
            mark: q.mark,
            type: q.type,
            answers: isMCQ ? answerIds : undefined,
            blankAnswer: isBlank ? q.blankAnswer : undefined,
          });
          await newQ.save({ session });
          finalQuestionIds.push(newQ._id);
        }
      }
      existing.questions = finalQuestionIds;
    }

    const allQuestions = await Question.find({ _id: { $in: existing.questions } })
      .select('mark')
      .session(session)
      .lean();
    existing.ExamMark = allQuestions.reduce((sum, q) => sum + (Number(q.mark) || 0), 0);

    ['title', 'examDuration', 'examDate', 'startTime', 'endTime', 'status', 'course'].forEach(f => {
      if (payload[f] !== undefined) existing[f] = payload[f];
    });

    const { error } = require('../model/Exam').ValidateJoiSchema({
      title: existing.title,
      questions: existing.questions,
      course: existing.course?.toString(),
      createdBy: existing.createdBy?.toString(),
      ExamMark: existing.ExamMark,
      examDuration: existing.examDuration,
      examDate: existing.examDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      status: existing.status,
    });

    if (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: error.details[0].message });
    }

    await existing.save({ session });
    await session.commitTransaction();
    session.endSession();

    const updatedExam = await Exam.findById(existing._id).populate('questions').lean();
    res.json(updatedExam);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error in PUT /exams/:examId', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





// Department exam approval listing
router.get('/approvals', AuthMiddleware, allowedRoles('department_head','department_admin','teacher'), async (req, res) => {
  try {
    const { status = 'pending', course } = req.query;
    const baseFilter = {};
    if (status && status !== 'all') baseFilter.status = status;
    if (course) {
      if (!mongoose.Types.ObjectId.isValid(course)) return res.status(400).send('Invalid course id');
      baseFilter.course = course;
    }
    const exams = await Exam.find(baseFilter)
      .populate({
        path: 'questions',
        select: 'question mark answers type blankAnswer',
        populate: { path: 'answers', model: 'Answer', select: 'answer isCorrect' }
      })
      .populate({
        path: 'course',
        select: 'name',
      }).populate({
        path: 'createdBy',
        select: 'fullName',
      })
      .lean();
    const items = exams.map(e => ({
      _id: e._id,
      title: e.title,
      moduleName: null,
      courseId: e.course?._id || e.course || null,
      course: e.course?.name || (typeof e.course === 'string' ? e.course : null),
      durationMin: e.examDuration,
      totalQuestions: (e.questions || []).length,
      status: e.status || 'pending',
      createdBy: e.createdBy,
      startTime: e.startTime,
      endTime: e.endTime,
      createdAt: e.createdAt,
      questions: (e.questions || []).map(q => ({
        _id: q._id,
        question: q.question,
        mark: q.mark,
        type: q.type,
        blankAnswer: q.blankAnswer,
        answers: Array.isArray(q.answers) ? q.answers.map(a => ({ _id: a._id, answer: a.answer, isCorrect: a.isCorrect })) : undefined
      }))
    }));
    res.json(items);
  } catch (error) {
    logger.error('Error in GET /exams/approvals %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:examId/approve', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid id');
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).send('Exam not found');
    exam.status = 'approved';
    await exam.save();
    res.json({ _id: exam._id, status: exam.status });
  } catch (error) {
    logger.error('Error in POST /exams/:examId/approve %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:examId/reject', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid id');
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).send('Exam not found');
    exam.status = 'rejected';
    await exam.save();
    res.json({ _id: exam._id, status: exam.status });
  } catch (error) {
    logger.error('Error in POST /exams/:examId/reject %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Student exam submission (conditional auto grade)
router.post('/:examId/submit', AuthMiddleware, allowedRoles('student'), async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid id');
    const exam = await Exam.findById(examId)
      .populate({
        path: 'questions',
        select: 'question mark type answers blankAnswer',
        populate: { path: 'answers', model: 'Answer', select: 'answer isCorrect' }
      });
    if (!exam) return res.status(404).send('Exam not found');
    if (exam.status !== 'approved') return res.status(403).json({ error: 'Exam not approved' });
    const answersPayload = Array.isArray(req.body.answers) ? req.body.answers : [];
   
      const existingSubmission = await ExamSubmission.findOne({ exam: exam._id, user: req.user._id }).lean();
      if (existingSubmission) return res.json({ submissionId: existingSubmission._id, pendingManual: true, alreadySubmitted: true });
    const answerMap = new Map();
    for (const a of answersPayload) {
      if (a && a.questionId && mongoose.Types.ObjectId.isValid(a.questionId)) answerMap.set(a.questionId.toString(), a);
    }
    let totalMarks = 0;
    for (const q of exam.questions) {
      if (!q || typeof q.mark !== 'number') continue; totalMarks += q.mark;
    }
    const submissionAnswers = exam.questions.map(q => {
      const payload = answerMap.get(q._id.toString());
      return { question: q._id, answerId: payload?.answerId, text: payload?.text };
    });
    let submissionDoc;
    try {
      // Only store answers, set status to pending for manual review
      submissionDoc = await ExamSubmission.create({ exam: exam._id, user: req.user._id, answers: submissionAnswers, autoScore: null, manualScore: null, totalMarks, status: 'pending' });
    } catch (e) {
      if (e && e.code === 11000) {
        const existing = await ExamSubmission.findOne({ exam: exam._id, user: req.user._id }).lean();
        if (existing) return res.json({ submissionId: existing._id, pendingManual: true, alreadySubmitted: true });
      }
      throw e;
    }
    // Do not create or update Result; only allow manual evaluation
    return res.json({ submissionId: submissionDoc._id, pendingManual: true });
  } catch (error) {
    logger.error('Error in POST /exams/:examId/submit %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List submissions (teacher)
router.get('/:examId/submissions', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid id');
    const { ExamSubmission } = require('../model/ExamSubmission');
    const submissions = await ExamSubmission.find({ exam: examId })
      .populate({ path: 'user', select: 'fullName email' })
      .lean();
      console.log(submissions);
    res.json(submissions.map(s => ({
      _id: s._id,
      user: s.user ? { _id: s.user._id, name: s.user.fullName, email: s.user.email } : null,
      autoScore: s.autoScore,
      manualScore: s.manualScore,
      totalMarks: s.totalMarks,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })));
  } catch (error) {
    logger.error('Error in GET /exams/:examId/submissions %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single submission detail (teacher)
router.get('/:examId/submissions/:submissionId', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { examId, submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(submissionId)) return res.status(400).send('Invalid id');
    const { ExamSubmission } = require('../model/ExamSubmission');
    const submission = await ExamSubmission.findOne({ _id: submissionId, exam: examId })
      .populate({ path: 'user', select: 'fullName email' })
      .populate({
        path: 'answers.question',
        select: 'question type mark answers blankAnswer',
        populate: { path: 'answers', model: 'Answer', select: 'answer isCorrect' }
      })
      .populate({ path: 'answers.answerId', select: 'answer isCorrect' })
      .lean();
    if (!submission) return res.status(404).send('Submission not found');
    res.json({
      _id: submission._id,
      exam: submission.exam,
      user: submission.user ? { _id: submission.user._id, name: submission.user.name, email: submission.user.email } : null,
      autoScore: submission.autoScore,
      manualScore: submission.manualScore,
      totalMarks: submission.totalMarks,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      answers: submission.answers.map(a => ({
        question: a.question ? {
          _id: a.question._id,
          question: a.question.question,
          type: a.question.type,
          mark: a.question.mark,
          blankAnswer: a.question.blankAnswer || null,
          answers: Array.isArray(a.question.answers) ? a.question.answers.map(ans => ({ _id: ans._id, answer: ans.answer, isCorrect: ans.isCorrect })) : []
        } : null,
        answerId: a.answerId ? a.answerId._id : null,
        answerText: a.answerId ? a.answerId.answer : null,
        text: a.text || null
      }))
    });
  } catch (error) {
    logger.error('Error in GET /exams/:examId/submissions/:submissionId %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Manual grade submission
router.post('/:examId/submissions/:submissionId/grade', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { examId, submissionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(submissionId)) return res.status(400).send('Invalid id');
    const manualScore = typeof req.body.manualScore === 'number' ? req.body.manualScore : null;
    if (manualScore == null || manualScore < 0) return res.status(400).json({ error: 'manualScore required' });
    const { ExamSubmission } = require('../model/ExamSubmission');
    const submission = await ExamSubmission.findOne({ _id: submissionId, exam: examId });
    if (!submission) return res.status(404).send('Submission not found');
    submission.manualScore = manualScore;
    submission.status = 'graded';
    await submission.save();
    const totalEarned = submission.autoScore + submission.manualScore;
  // Find result for this user and course, then update exams array
  const examDoc = await Exam.findById(examId).lean();
  if (!examDoc) return res.status(404).send('Exam not found');
  let result = await Result.findOne({ course: examDoc.course, user: submission.user });
    
    const ExamMark = examDoc && typeof examDoc.ExamMark === 'number' ? examDoc.ExamMark : Math.ceil(submission.totalMarks * 0.5);
    // Prepare exam entry for exams array
    const examEntry = { exam: examId, mark: totalEarned };
    if (!result) {
      result = new Result({
        user: submission.user,
        course: examDoc.course,
        exams: [examEntry],
        assignments: [],
        totalMark: totalEarned,
        isPassed: totalEarned >= ExamMark,
        date: new Date()
      });
    } else {
      // Update or add exam mark in exams array
      const idx = result.exams.findIndex(e => e.exam.toString() === examId);
      if (idx >= 0) {
        result.exams[idx].mark = totalEarned;
      } else {
        result.exams.push(examEntry);
      }
     
     
    }
    await result.save();
  res.json({ graded: true, resultId: result._id, totalMarks: submission.totalMarks, marks: totalEarned, isPassed: result.isPassed });
  } catch (error) {
    logger.error('Error in POST /exams/:examId/submissions/:submissionId/grade %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// (Removed /module/* endpoints as exams are course-level only)


// List upcoming/active exams created by current teacher (moved before catch-all :examId)
router.get('/my/upcoming', AuthMiddleware, allowedRoles('teacher','Registrar'), async (req, res) => {
  try {
    const now = new Date();
  const exams = await Exam.find({ createdBy: req.user._id }).lean();

    const withStatus = exams.map(e => {
      const startTime = e.startTime ? new Date(e.startTime) : null;
      const endTime = e.endTime ? new Date(e.endTime) : null;
      const examDate = e.examDate ? new Date(e.examDate) : null;
      let status = 'upcoming';
      if (startTime && endTime) {
        if (now < startTime) status = 'upcoming';
        else if (now >= startTime && now <= endTime) status = 'active';
        else if (now > endTime) status = 'ended';
      } else if (startTime && !endTime) {
        status = now < startTime ? 'upcoming' : 'active';
      } else if (!startTime && endTime) {
        status = now <= endTime ? 'active' : 'ended';
      } else if (examDate) {
        const todayStr = now.toDateString();
        const examDayStr = examDate.toDateString();
        if (examDayStr === todayStr) status = 'active';
        else if (examDate > now) status = 'upcoming';
        else status = 'ended';
      } else {
        status = 'active';
      }
      return {
        _id: e._id,
        title: e.title,
        moduleName: null,
        courseId: e.course || null,
        examDate: e.examDate,
        startTime: e.startTime,
        endTime: e.endTime,
        status
      };
    }).sort((a,b) => {
      const at = a.startTime || a.examDate || 0;
      const bt = b.startTime || b.examDate || 0;
      return new Date(at) - new Date(bt);
    });

    res.json({ exams: withStatus });
  } catch (error) {
    logger.error('Error in GET /exams/my/upcoming: %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List exams for all courses the current student is enrolled in
router.get('/my/enrolled', AuthMiddleware, allowedRoles('student'), async (req, res) => {
  try {
    const { EnrolledCourse } = require('../model/EnrolledCourse');
    const enrollments = await EnrolledCourse.find({ user: req.user._id })
      .select('course')
      .lean();

    const courseIds = enrollments.map(e => e.course).filter(Boolean);
    if (courseIds.length === 0) return res.json({ exams: [] });

    const rawExams = await Exam.find({
      course: { $in: courseIds },
      status: 'approved'
    })
      .select('title course examDate startTime endTime status examDuration ExamMark')
      .populate({ path: 'course', select: 'name' })
      .lean();

    const now = new Date();

    const examSubs = await ExamSubmission.find({
      user: req.user._id,
      exam: { $in: rawExams.map(e => e._id) }
    }).lean();

    const subMap = examSubs.reduce((m, s) => {
      m[s.exam.toString()] = s;
      return m;
    }, {});

    const items = rawExams.map(e => {
      let availability = 'active';
      const start = e.startTime ? new Date(e.startTime) : null;
      const end = e.endTime ? new Date(e.endTime) : null;

      if (start || end) {
        if (start && now < start) availability = 'upcoming';
        else if (end && now > end) availability = 'ended';
        else availability = 'active';
      } else if (e.examDate) {
        const examDay = new Date(e.examDate);
        if (examDay.toDateString() === now.toDateString()) availability = 'active';
        else if (examDay > now) availability = 'upcoming';
        else availability = 'ended';
      }

      const submission = subMap[e._id.toString()] || null;
      let submissionStatus = 'not_submitted';
      if (submission) {
        submissionStatus = submission.status;
      }

      return {
        _id: e._id,
        title: e.title,
        courseId: e.course?._id || e.course,
        courseName: e.course?.name || (typeof e.course === 'string' ? e.course : null),
        examDate: e.examDate,
        startTime: e.startTime,
        endTime: e.endTime,
        durationMin: e.examDuration,
        ExamMark: e.ExamMark,
        availability,
        submissionStatus
      };
    });

    res.json({ exams: items });
  } catch (error) {
    logger.error('Error in GET /exams/my/enrolled %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Get single exam (validate ObjectId early)
router.get('/:examId', AuthMiddleware, async (req, res) => {
  try {
    const { examId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(examId)) return res.status(400).send('Invalid id');
    const exam = await Exam.findById(examId)
      .populate({
        path: "questions",
  select: 'question mark answers type blankAnswer',
  populate: { path: "answers", model: "Answer", select: 'answer isCorrect' },
      })
      .lean();
    if (!exam) {
      return res.status(404).send("Exam not found");
    }
    if (req.user.role === 'student' && exam.status !== 'approved') {
      return res.status(403).json({ error: 'Exam not approved yet' });
    }
    if (req.user.role === 'student') {
      try {
        const { ExamSubmission } = require('../model/ExamSubmission');
        const sub = await ExamSubmission.findOne({ exam: exam._id, user: req.user._id }).select('status autoScore manualScore totalMarks').lean();
        if (sub) {
         
            exam.mySubmission = {
              status: sub.status,
              autoScore: sub.autoScore,
              manualScore: sub.manualScore,
              totalMarks: sub.totalMarks,
              alreadySubmitted: true,
              // Flag indicates there was a previous attempt (useful for showing last score on module retry UI)
              hasPreviousAttempt: true
            };
          // For non-module exams keep locking behavior (hide questions). For module-linked exams allow retry so keep questions visible.
          exam.questions = [];
        }
      } catch (e) {
        logger.warn('Could not load student submission for exam %s: %s', exam._id, e.message);
      }
    }
    return res.send(exam);
  } catch (error) {
    logger.error('Error in GET /exams/:examId: %o', error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
