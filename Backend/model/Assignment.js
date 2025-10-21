const mongoose = require('mongoose');
const joi = require('joi');

// Assignment (created by teacher, belongs to CourseModule or Course)
const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  points: { type: Number, default: 0 },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule' },
  dueDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Student submission for an assignment
const AssignmentSubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filePath: { type: String, required: true },
  notes: { type: String },
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number },
  gradedAt: { type: Date },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

AssignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const AssignmentJoi = joi.object({
  title: joi.string().required(),
  description: joi.string().allow('').optional(),
  points: joi.number().min(0).required(),
  course: joi.string().required(),
  module: joi.string().allow('', null).optional(),
  dueDate: joi.date().required()
});

const AssignmentSubmissionJoi = joi.object({
  notes: joi.string().allow('').optional()
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
const AssignmentSubmission = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);

module.exports.Assignment = Assignment;
module.exports.AssignmentSubmission = AssignmentSubmission;
module.exports.validateAssignment = (data) => AssignmentJoi.validate(data);
module.exports.validateAssignmentSubmission = (data) => AssignmentSubmissionJoi.validate(data);
