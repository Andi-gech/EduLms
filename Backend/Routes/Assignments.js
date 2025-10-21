const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const logger = require('../Middleware/winstonLogger');
const { Assignment, AssignmentSubmission, validateAssignment, validateAssignmentSubmission } = require('../model/Assignment');
const IsAssignedTeacherOrOwner = require('../Middleware/IsAssignedTeacherOrOwner');
const IsEnrolled = require('../Middleware/IsEnrolled');

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/assignments');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


const fs = require('fs');
if (!fs.existsSync('public/uploads/assignments')) {
  fs.mkdirSync('public/uploads/assignments', { recursive: true });
}


router.post('/', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
  if (req.body && (req.body.module === '' || req.body.module === null)) delete req.body.module;
  const { error } = validateAssignment(req.body);
    if (error) return res.status(400).send(error.details[0].message);

   
    if (!mongoose.Types.ObjectId.isValid(req.body.course)) return res.status(400).send('Invalid course id');
    if (req.body.module && !mongoose.Types.ObjectId.isValid(req.body.module)) return res.status(400).send('Invalid module id');

    const assignment = await Assignment.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(assignment);
  } catch (err) {
    logger.error('Error POST /assignments %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Generic list (supports course or module filters). For students returns assignments for enrolled courses only if needed.
router.get('/', AuthMiddleware, async (req, res) => {
  try {
    const { course, module } = req.query;
    const filter = {};

    // If the requester is a student, restrict to courses they are enrolled in
    if (req.user.role === 'student') {
      const { EnrolledCourse } = require('../model/EnrolledCourse');
      const enrolled = await EnrolledCourse.find({ user: req.user._id }).select('course').lean();
      const enrolledCourseIds = enrolled.map(e => e.course.toString());

      // If a specific course was requested, ensure the student is enrolled in it
      if (course) {
        if (!enrolledCourseIds.includes(String(course))) {
          // Student not enrolled in requested course -> return empty
          return res.json([]);
        }
        filter.course = course;
      } else {
        // No course filter provided: limit to enrolled courses
        if (enrolledCourseIds.length === 0) return res.json([]);
        filter.course = { $in: enrolledCourseIds };
      }
    } else {
      if (course) filter.course = course;
    }

    if (module) filter.module = module;

    const assignments = await Assignment.find(filter).sort({ dueDate: 1 }).lean();
    const now = new Date();
    let enriched = assignments;

    if (req.user.role === 'student' && assignments.length) {
      const ids = assignments.map(a => a._id);
      const subs = await AssignmentSubmission.find({
        assignment: { $in: ids },
        student: req.user._id
      }).lean();

      const subMap = subs.reduce((m, s) => {
        m[s.assignment.toString()] = s;
        return m;
      }, {});

      enriched = assignments.map(a => ({
        ...a,
        status:
          subMap[a._id.toString()]?.grade != null
            ? 'graded'
            : subMap[a._id.toString()]
            ? 'submitted'
            : now > a.dueDate
            ? 'overdue'
            : 'pending',
        submission: subMap[a._id.toString()] || null
      }));
    }

    res.json(enriched);
  } catch (err) {
    logger.error('Error GET /assignments %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// List assignments created by current teacher
router.get('/my', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const now = new Date();
    const assignments = await Assignment.find({ createdBy: req.user._id }).sort({ dueDate: 1 }).lean();
    const ids = assignments.map(a => a._id);
    const submissionCounts = await AssignmentSubmission.aggregate([
      { $match: { assignment: { $in: ids } } },
      { $group: { _id: '$assignment', total: { $sum: 1 }, graded: { $sum: { $cond: [{ $ifNull: ['$grade', false] }, 1, 0] } } } }
    ]);
    const countMap = submissionCounts.reduce((m, r) => { m[r._id.toString()] = r; return m; }, {});
    const result = assignments.map(a => {
      const c = countMap[a._id.toString()] || { total: 0, graded: 0 };
      return {
        ...a,
        status: now > a.dueDate ? 'overdue' : 'pending',
        submissions: c.total,
        gradedSubmissions: c.graded
      };
    });
    res.json(result);
  } catch (err) {
    logger.error('Error GET /assignments/my %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update assignment (basic fields)
router.put('/:id', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const fields = ['title','description','points','dueDate'];
    const update = {};
    for (const f of fields) if (f in req.body) update[f] = req.body[f];
    if (Object.keys(update).length === 0) return res.status(400).send('No valid fields');
    if ('points' in update && update.points < 0) return res.status(400).send('points must be >=0');
    if ('dueDate' in update && isNaN(Date.parse(update.dueDate))) return res.status(400).send('Invalid dueDate');
    const assignment = await Assignment.findOneAndUpdate({ _id: id, createdBy: req.user._id }, update, { new: true });
    if (!assignment) return res.status(404).send('Not found');
    res.json(assignment);
  } catch (err) {
    logger.error('Error PUT /assignments/:id %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete assignment
router.delete('/:id', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const deleted = await Assignment.findOneAndDelete({ _id: id, createdBy: req.user._id });
    if (!deleted) return res.status(404).send('Not found');
    await AssignmentSubmission.deleteMany({ assignment: id });
    res.json({ deleted: true });
  } catch (err) {
    logger.error('Error DELETE /assignments/:id %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List submissions for an assignment (teacher)
router.get('/:id/submissions', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const assignment = await Assignment.findById(id).lean();
    if (!assignment) return res.status(404).send('Not found');
    if (assignment.createdBy.toString() !== req.user._id.toString()) return res.status(403).send('Forbidden');
    const subs = await AssignmentSubmission.find({ assignment: id })
      .populate({ path: 'student', select: 'firstName lastName email' })
      .lean();
    res.json(subs.map(s => ({
      _id: s._id,
      student: s.student,
      submittedAt: s.submittedAt,
      grade: s.grade,
      filePath: s.filePath
    })));
  } catch (err) {
    logger.error('Error GET /assignments/:id/submissions %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/course/:courseId', AuthMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) return res.status(400).send('Invalid course id');
    const assignments = await Assignment.find({ course: req.params.courseId }).sort({ dueDate: 1 }).lean();

    const now = new Date();
    const enriched = assignments.map(a => ({
      ...a,
      status: now > a.dueDate ? 'overdue' : 'pending'
    }));
    res.json(enriched);
  } catch (err) {
    logger.error('Error GET /assignments/course/:courseId %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/:id', AuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const assignment = await Assignment.findById(id).lean();
    if (!assignment) return res.status(404).send('Not found');

    let submission = null;
    if (req.user && req.user.role === 'student') {
      submission = await AssignmentSubmission.findOne({ assignment: id, student: req.user._id }).lean();
    }

    const now = new Date();
    const status = submission?.grade != null ? 'graded' : submission ? 'submitted' : (now > assignment.dueDate ? 'overdue' : 'pending');

    res.json({ ...assignment, status, submission });
  } catch (err) {
    logger.error('Error GET /assignments/:id %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/:id/submit', AuthMiddleware, allowedRoles('student'), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    if (!req.file) return res.status(400).send('File required');
    const { error } = validateAssignmentSubmission(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).send('Not found');

    if (new Date() > assignment.dueDate) return res.status(400).send('Submission window closed');

    const submission = await AssignmentSubmission.create({
      assignment: id,
      student: req.user._id,
      filePath: `uploads/assignments/${req.file.filename}`,
      notes: req.body.notes || ''
    });
    res.status(201).json(submission);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).send('Already submitted');
    }
    logger.error('Error POST /assignments/:id/submit %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/:id/grade/:studentId', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { id, studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).send('Invalid id');
    const grade = Number(req.body.grade);
    if (isNaN(grade)) return res.status(400).send('grade required');

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).send('Assignment not found');

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment: id, student: studentId },
      { grade, gradedAt: new Date(), gradedBy: req.user._id },
      { new: true }
    );
    if (!submission) return res.status(404).send('Submission not found');

    // Update Result for this user and course
    const { Result } = require('../model/Result');
    let result = await Result.findOne({ user: studentId, course: assignment.course });
    const assignmentEntry = { assignment: assignment._id, mark: grade };
    console.log(assignmentEntry)
    if (!result) {
      result = new Result({
        user: studentId,
        course: assignment.course,
        exams: [],
        assignments: [assignmentEntry],
        totalMark: grade,
        isPassed: false,
        date: new Date()
      });
    } else {
      // Add assignment if not present
      const idx = result.assignments.findIndex(a => a.assignment.toString() === id);
      if (idx === -1) {
        result.assignments.push(assignmentEntry);

      }
     
    }
    await result.save();
    res.json(submission);
  } catch (err) {
    logger.error('Error POST /assignments/:id/grade/:studentId %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
