const express = require('express');
const mongoose = require('mongoose');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const logger = require('../Middleware/winstonLogger');

// Models
const { Course } = require('../model/Courses');
const { Exam } = require('../model/Exam');
const { Assignment, AssignmentSubmission } = require('../model/Assignment');
const { Notification } = require('../model/Notification');
const { CourseModule } = require('../model/CourseModule');
const { Result } = require('../model/Result');

const router = express.Router();

// Helper to classify timing status (upcoming/active/ended) for an exam instance
function classifyExamRuntime(e, now = new Date()) {
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
  return status;
}

// GET /api/teacher/overview
// Returns aggregated dashboard data for a teacher.
router.get('/overview', AuthMiddleware, allowedRoles('teacher'), async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Fetch courses (owned or assigned)
    const courses = await Course.find({ $or: [{ createdBy: userId }, { assignedTeacher: userId }] })
      .select('_id name')
      .lean();
    const courseIds = courses.map(c => c._id);

    // Exams created by teacher (course-level only now)
    const exams = await Exam.find({ createdBy: userId })
      .select('_id course status examDate startTime endTime title')
      .lean();

    const runtimeStatus = exams.map(e => ({
      _id: e._id,
      status: classifyExamRuntime(e, now),
      approvalStatus: e.status,
      course: e.course ? e.course.toString() : null,
      title: e.title
    }));
    const upcomingCount = runtimeStatus.filter(e => e.status === 'upcoming').length;
    const activeCount = runtimeStatus.filter(e => e.status === 'active').length; // not used in summary but can be returned later
    const approvedCount = runtimeStatus.filter(e => e.approvalStatus === 'approved').length;
    const pendingExamApprovals = runtimeStatus.filter(e => e.approvalStatus === 'pending').length;
    const rejectedExams = runtimeStatus.filter(e => e.approvalStatus === 'rejected').length;

    // Assignments created by teacher
    const assignments = await Assignment.find({ createdBy: userId }).select('_id dueDate points course').lean();
    const assignmentIds = assignments.map(a => a._id);

    // Assignment submissions counts (pending grading vs graded)
    let gradingBreakdown = [];
    let pendingGrading = 0;
    if (assignmentIds.length) {
      const submissionAgg = await AssignmentSubmission.aggregate([
        { $match: { assignment: { $in: assignmentIds } } },
        { $group: { _id: { graded: { $cond: [{ $ifNull: ['$grade', false] }, 1, 0] } }, count: { $sum: 1 } } }
      ]);
      const gradedCount = submissionAgg.find(r => r._id.graded === 1)?.count || 0;
      const ungradedCount = submissionAgg.find(r => r._id.graded === 0)?.count || 0;
      pendingGrading = ungradedCount;
      gradingBreakdown = [
        { name: 'Pending', value: ungradedCount },
        { name: 'Graded', value: gradedCount },
      ];
    }

    // Notifications unread
    const unreadNotifications = await Notification.countDocuments({ user: userId, isRead: false });

    // Module content approval distribution (modules in teacher courses)
    let contentApproval = [];
    if (courseIds.length) {
      const modules = await CourseModule.aggregate([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const map = modules.reduce((m, r) => { m[r._id || 'pending'] = r.count; return m; }, {});
      contentApproval = ['approved','pending','rejected'].map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: map[s] || 0 }));
    }

    // Exam approval status distribution
    const examStatusCounts = runtimeStatus.reduce((m, e) => { m[e.approvalStatus || 'pending'] = (m[e.approvalStatus || 'pending'] || 0) + 1; return m; }, {});
    const examStatus = ['approved','pending','rejected'].map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: examStatusCounts[s] || 0 }));

    // Recent activity (simple latest items)
    const recentActivity = [];
    assignments.slice(0, 5).forEach(a => recentActivity.push({ id: a._id, type: 'assignment', text: `Assignment due ${new Date(a.dueDate).toLocaleDateString()}`, time: a.dueDate }));
    runtimeStatus.slice(0, 5).forEach(e => recentActivity.push({ id: e._id, type: 'exam', text: `Exam ${e.status}`, time: now.toISOString() }));

    // Build submission series (last 5 days) from exam results
    const examIds = exams.map(e => e._id);
    let submissionSeries = {};
    if (examIds.length) {
      const windowStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const results = await Result.find({ exam: { $in: examIds }, date: { $gte: windowStart } }).select('exam marks ispassed date').lean();
      // Map exam->course direct
      const examCourseMap = exams.reduce((m, e) => { const c = e.course ? e.course.toString() : null; if (c) m[e._id.toString()] = c; return m; }, {});
      // Initialize per-course buckets
      courseIds.forEach(cid => { submissionSeries[cid.toString()] = {}; });
      results.forEach(r => {
        const examId = r.exam.toString();
        const courseId = examCourseMap[examId];
        if (!courseId) return;
        const dayKey = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
        submissionSeries[courseId] = submissionSeries[courseId] || {};
        submissionSeries[courseId][dayKey] = submissionSeries[courseId][dayKey] || { name: dayKey, attempts: 0, graded: 0 };
        submissionSeries[courseId][dayKey].attempts += 1;
        if (typeof r.marks === 'number') submissionSeries[courseId][dayKey].graded += 1;
      });
      // Convert inner maps to arrays ordered by a fixed weekday order (Mon..Sun) with whatever exists
      const weekdayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      Object.keys(submissionSeries).forEach(cid => {
        const map = submissionSeries[cid];
        submissionSeries[cid] = weekdayOrder.filter(d => map[d]).map(d => map[d]);
      });
    }

    // Exam outcomes (latest 50 results)
    let examOutcomesLatest = [];
    if (examIds.length) {
      const latest = await Result.find({ exam: { $in: examIds } })
        .sort({ date: -1 })
        .limit(50)
        .select('ispassed marks')
        .lean();
      const counters = { passed: 0, failed: 0, review: 0 };
      latest.forEach(r => {
        if (typeof r.ispassed === 'boolean') {
          if (r.ispassed) counters.passed++; else counters.failed++;
        } else {
          counters.review++;
        }
      });
      examOutcomesLatest = [
        { name: 'Passed', value: counters.passed },
        { name: 'Failed', value: counters.failed },
        { name: 'In Review', value: counters.review },
      ];
    }

    const summary = {
      assignedCourses: courses.length,
      upcomingExams: upcomingCount,
      pendingGrading,
      assignments: assignments.length,
      unreadNotifications,
      approvedExams: approvedCount,
      pendingExamApprovals,
      rejectedExams,
    };

    res.json({
      summary,
      recentActivity: recentActivity.slice(0, 10),
      courses: courses.map(c => ({ id: c._id, name: c.name })),
      submissionSeries,
      contentApproval,
      examStatus,
      gradingBreakdown,
      examOutcomesLatest,
      exams: runtimeStatus // optionally expose exam list with runtime + approval statuses
    });
  } catch (err) {
    logger.error('Error GET /teacher/overview %o', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
