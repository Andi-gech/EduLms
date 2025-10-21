const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const logger = require('../Middleware/winstonLogger');
const mongoose = require('mongoose');
const { Result, validateResult } = require('../model/Result');
const allowedRoles = require('../Middleware/allowedRoles');
const { Exam } = require('../model/Exam');
// CourseModule removed from exam context; no longer required here

// Teacher grade (enter marks for an exam in a result)
router.put('/:id/grade', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const { examId, mark } = req.body;
    if (!mongoose.Types.ObjectId.isValid(examId) || typeof mark !== 'number') {
      return res.status(400).json({ error: 'examId (ObjectId) and mark (number) required' });
    }
    const result = await Result.findById(id).populate({ path: 'exams.exam', select: 'createdBy ExamMark' });
    if (!result) return res.status(404).send('Not found');
    // Ensure the exam belongs to this teacher
    const examObj = result.exams.find(e => e.exam && e.exam._id.toString() === examId);
    if (!examObj || examObj.exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send('Forbidden');
    }
    if (result.approved) {
      return res.status(400).json({ error: 'Result already approved; cannot modify marks' });
    }
    examObj.mark = mark;
    // Update isPassed if all exams are passed
    let allPassed = true;
    for (const e of result.exams) {
      if (typeof e.exam.ExamMark === 'number' && e.mark < e.exam.ExamMark) {
        allPassed = false;
        break;
      }
    }
    result.isPassed = allPassed;
    // Recalculate totalMark
    result.totalMark = result.exams.reduce((sum, e) => sum + (e.mark || 0), 0);
    await result.save();
    res.json({ _id: result._id, exams: result.exams, isPassed: result.isPassed, totalMark: result.totalMark });
  } catch (err) {
    logger.error('Error PUT /results/:id/grade %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Aggregated submissions overview (teacher): counts per exam
router.get('/overview/exams', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const exams = await Exam.find({ createdBy: teacherId }).select('title').lean();
    if (exams.length === 0) return res.json([]);
    const examIds = exams.map(e => e._id);

    // Pull submissions (includes pending + graded manual + auto graded) and results (legacy auto graded score storage)
    const { ExamSubmission } = require('../model/ExamSubmission');
    const submissions = await ExamSubmission.find({ exam: { $in: examIds } }).select('exam status autoScore manualScore totalMarks').lean();
    const results = await Result.find({ exam: { $in: examIds } }).select('exam marks').lean();

    const map = new Map();
    for (const ex of exams) {
      map.set(ex._id.toString(), {
        examId: ex._id,
        title: ex.title,
        total: 0,
        graded: 0,
        pending: 0,
        inProgress: 0,
        totalMarks: 0, // per exam max marks (from a submission's totalMarks if available)
        marksSum: 0,
      });
    }

    // Aggregate submissions: this provides authoritative total & pending/graded counts
    for (const s of submissions) {
      const rec = map.get(s.exam.toString());
      if (!rec) continue;
      rec.total += 1;
      if (s.status === 'pending') rec.pending += 1; else rec.graded += 1;
      if (s.totalMarks && rec.totalMarks === 0) rec.totalMarks = s.totalMarks; // capture once
      const earned = (s.autoScore || 0) + (s.manualScore || 0);
      rec.marksSum += earned;
    }

    // For legacy auto‑graded results that might exist without matching ExamSubmission (unlikely but safe):
    for (const r of results) {
      const rec = map.get(r.exam.toString());
      if (!rec) continue;
      // If there's already a submission record count for this result, skip double counting
      // Detect by checking if rec.total already >= number of submissions for that exam (cannot know per exam quickly here).
      // Conservative: only add if rec.total == 0 (no submission docs found)
      if (rec.total === 0) {
        rec.total += 1;
        rec.graded += 1;
        rec.marksSum += (r.marks || 0);
      }
    }

    const items = Array.from(map.values()).map(rec => {
      const avgPercent = rec.total && rec.totalMarks ? (rec.marksSum / (rec.total * rec.totalMarks)) * 100 : 0;
      const gradedPercent = rec.total ? (rec.graded / rec.total) * 100 : 0;
      return { ...rec, avgPercent, gradedPercent };
    });
    res.json(items);
  } catch (err) {
    logger.error('Error GET /results/overview/exams %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List results (filter by course or user)
router.get('/', AuthMiddleware, async (req, res) => {
  try {
    const { courseId, user } = req.query;
    const filter = {};
    console.log('get Result', req.query)
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) filter.course = courseId;
    if (user && mongoose.Types.ObjectId.isValid(user)) filter.user = user;
    // Students can only see their own results
    if (req.user.role === 'student') {
      filter.user = req.user._id;
    }
    const docs = await Result.find(filter)
      .populate({ path: 'course', select: 'name department', populate: { path: 'department', select: 'name' } })
      .populate({ path: 'exams.exam', select: 'title ExamMark course' })
      .populate({ path: 'assignments.assignment', select: 'title points' })
      .populate({ path: 'user', select: 'fullName email' })
      .lean();

    // For each course, get all exams
    const courseIds = docs.map(r => r.course._id);
    const { Exam } = require('../model/Exam');
    const examsByCourse = {};
    const allExams = await Exam.find({ course: { $in: courseIds }, status: 'approved' }).select('title ExamMark course').lean();
    for (const exam of allExams) {
      const cid = exam.course.toString();
      if (!examsByCourse[cid]) examsByCourse[cid] = [];
      examsByCourse[cid].push(exam);
    }

    const shaped = docs.map(r => {
      // Exams: include all exams for the course, set mark to 0 if not present in result
      const courseExams = examsByCourse[r.course._id.toString()] || [];
      const resultExamMap = new Map((r.exams || []).map(e => [e.exam._id.toString(), e]));
      const exams = courseExams.map(exam => {
        const e = resultExamMap.get(exam._id.toString());
        return {
          exam: exam,
          mark: e ? e.mark : 0
        };
      });
      return {
        _id: r._id,
        user: r.user ? { _id: r.user._id, name: r.user.fullName, email: r.user.email } : r.user,
        course: r.course ? { _id: r.course._id, name: r.course.name } : r.course,
        exams,
        assignments: r.assignments,
        totalMark: r.totalMark,
        isPassed: r.isPassed,
        date: r.date,
        approved: r.approved
      };
    });
    res.json(shaped);
  } catch (err) {
    logger.error('Error GET /results %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Student transcript aggregation (assignments + exams per course using new Result schema)
router.get('/transcript', AuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).send('Forbidden');
    const studentId = req.user._id;
    const { Assignment } = require('../model/Assignment');
    const { AssignmentSubmission } = require('../model/Assignment');
    const { Result } = require('../model/Result');
    const { Course } = require('../model/Courses');
    const { Exam } = require('../model/Exam');

    // Get all results for this user (one per course)
    const resultsRaw = await Result.find({ user: studentId })
      .populate({ path: 'course', select: 'name' })
      .populate({ path: 'exams.exam', select: 'title ExamMark' })
      .populate({ path: 'assignments.assignment', select: 'title points' })
      .lean();

    // For assignment grades, get all submissions for this user
    const submissions = await AssignmentSubmission.find({ student: studentId }).select('assignment grade').lean();
    const submissionMap = submissions.reduce((m, s) => { m[s.assignment.toString()] = s; return m; }, {});

    // For each course, get all exams
    const courseIds = resultsRaw.map(r => r.course._id);
    const examsByCourse = {};
    const allExams = await Exam.find({ course: { $in: courseIds }, status: 'approved' }).select('title ExamMark course').lean();
    for (const exam of allExams) {
      const cid = exam.course.toString();
      if (!examsByCourse[cid]) examsByCourse[cid] = [];
      examsByCourse[cid].push(exam);
    }

    // Aggregate transcript per course
    const transcript = resultsRaw.map(r => {
      // Assignments: get earned/total from populated assignments
      let assignmentEarned = 0, assignmentTotal = 0;
      const assignments = (r.assignments || []).map(a => {
        const sub = submissionMap[a.assignment._id.toString()];
        const earned = sub && typeof sub.grade === 'number' ? sub.grade : 0;
        const total = a.assignment.points || 0;
        assignmentEarned += earned;
        assignmentTotal += total;
        return {
          id: a.assignment._id,
          title: a.assignment.title,
          earned,
          total
        };
      });

      // Exams: include all exams for the course, set mark to 0 if not present in result
      let examEarned = 0, examTotal = 0;
      const courseExams = examsByCourse[r.course._id.toString()] || [];
      const resultExamMap = new Map((r.exams || []).map(e => [e.exam._id.toString(), e]));
      const exams = courseExams.map(exam => {
        const e = resultExamMap.get(exam._id.toString());
        const earned = e ? e.mark : 0;
        const total = typeof exam.ExamMark === 'number' ? exam.ExamMark : 0;
        examEarned += earned;
        examTotal += total;
        return {
          id: exam._id,
          title: exam.title,
          earned,
          total
        };
      });

      const combinedEarned = assignmentEarned + examEarned;
      const combinedTotal = assignmentTotal + examTotal;
      const combinedPct = combinedTotal ? (combinedEarned / combinedTotal) * 100 : 0;
      return {
        courseId: r.course._id,
        courseName: r.course.name,
        assignmentEarned,
        assignmentTotal,
        examEarned,
        examTotal,
        combinedEarned,
        combinedTotal,
        combinedPct: Number(combinedPct.toFixed(2)),
        assignments,
        exams,
        totalMark: r.totalMark
      };
    });
    res.json(transcript);
  } catch (err) {
    logger.error('Error GET /results/transcript %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Department grade approvals listing (unapproved results within department via exam -> module -> course.department)
router.get('/approvals', AuthMiddleware, allowedRoles('department_head','department_admin','Registrar'), async (req, res) => {
  try {
    const { course, exam, approved } = req.query;
    const filter = {};
    if (approved === 'true') filter.approved = true; else if (approved === 'false') filter.approved = false;
    if (exam && mongoose.Types.ObjectId.isValid(exam)) filter.exam = exam;
    let results = await Result.find(filter)
      .populate({ path: 'course', select: 'name department', populate: { path: 'department', select: 'name' } })
      .populate({ path: 'exams.exam', select: 'title ExamMark questions course', populate: [
        { path: 'questions', select: 'mark' },
        { path: 'course', select: 'department name', populate: { path: 'department', select: 'name' } }
      ] })
      .populate({ path: 'user', select: 'fullName email department' })
  .lean();
console.log('Fetched results count:', results);
    const deptId = req.user.department ? req.user.department.toString() : null;
    // Defensive: only log if results[0] and nested exist
    if (results.length > 0 && results[0].exam && results[0].exam.course && results[0].exam.course.department) {
      console.log(deptId, results[0].exam.course.department._id);
    }
    if (deptId) {
      results = results.filter(r =>  r.course && r.course.department && r.course.department._id && r.course.department._id.toString() === deptId);
    }
    if (course) {
      results = results.filter(r =>  r.course && (r.course._id || r.course).toString() === course.toString());
    }
    // Defensive: filter out results with missing exam
    results = results.filter(r => r.course);
    res.json(results.map(r => {
      const courseDoc = r.course ? r.course : null;
      const courseId = courseDoc ? (courseDoc._id || courseDoc) : null;
      const courseName = courseDoc && courseDoc.name ? courseDoc.name : null;
      const departmentId = courseDoc && courseDoc.department ? (courseDoc.department._id || courseDoc.department) : null;
      const departmentName = courseDoc && courseDoc.department && courseDoc.department.name ? courseDoc.department.name : null;
      // Compute totalMarks from populated exam.questions (sum of mark)
      let totalMarks = 0;
      if (r.course && Array.isArray(r.exams)) {
        for (const q of r.exams) {
          if (q && typeof q.mark === 'number') totalMarks += q.mark;
        }
      }
      return {
        _id: r._id,
        user: r.user && r.user.fullName ? { _id: r.user._id, name: r.user.fullName, email: r.user.email } : r.user,
        marks: r.marks,
        
        approved: r.approved || false,
        exams:r.exams,
        assignment:r.assignments,
    
       course:r.course.name,
        departmentId,
        departmentName,
        totalMarks,
        approvedAt: r.approvedAt,
        approvedBy: r.approvedBy,
        date: r.date,
      };
    }));
  } catch (err) {
    logger.error('Error GET /results/approvals %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Approve a grade/result
router.post('/:id/approve', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
  const result = await Result.findById(id)
    .populate({ path: 'course', select: 'name department', populate: { path: 'department', select: 'name' } })
    .populate({ path: 'exams.exam', select: 'title ExamMark course', populate: { path: 'course', select: 'department name', populate: { path: 'department', select: 'name' } } });
    if (!result) return res.status(404).send('Not found');
    if (result.approved) return res.json({ _id: result._id, approved: true });
    const deptId = req.user.department ? req.user.department.toString() : null;
  if (deptId && result.exam && result.exam.course && result.exam.course.department && result.exam.course.department.toString() !== deptId) {
      return res.status(403).send('Cross-department approval forbidden');
    }
    result.approved = true;
    result.approvedAt = new Date();
    result.approvedBy = req.user._id;
    await result.save();
    res.json({ _id: result._id, approved: result.approved, approvedAt: result.approvedAt });
  } catch (err) {
    logger.error('Error POST /results/:id/approve %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single result
router.get('/:id', AuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const result = await Result.findById(id)
      .populate({ path: 'course', select: 'name department', populate: { path: 'department', select: 'name' } })
      .populate({ path: 'exams.exam', select: 'title ExamMark' })
      .populate({ path: 'assignments.assignment', select: 'title points' })
      .populate({ path: 'user', select: 'fullName email' })
      .lean();
    if (!result) return res.status(404).send('Not found');
    if (req.user.role === 'student' && result.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).send('Forbidden');
    }
    res.json(result);
  } catch (err) {
    logger.error('Error GET /results/:id %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;