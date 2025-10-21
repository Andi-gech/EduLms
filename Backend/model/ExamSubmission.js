const mongoose = require('mongoose');

// Stores a student's raw exam answers to enable manual grading when auto-scoring is disabled.
// For exams without a CourseModule reference, we only create ExamSubmission (no Result yet)
// and a teacher later grades it via a dedicated endpoint.
// For exams with a CourseModule we still create a submission (with autoScore) in addition to Result
// so that a manual adjustment step could be added later if needed.

const AnswerEntrySchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }, // chosen MCQ answer
  text: { type: String }, // free text / blank answer
}, { _id: false });

const ExamSubmissionSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: { type: [AnswerEntrySchema], default: [] },
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'graded'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

ExamSubmissionSchema.index({ exam: 1, user: 1 }, { unique: true });

const ExamSubmission = mongoose.model('ExamSubmission', ExamSubmissionSchema);

module.exports = { ExamSubmission };
