const mongoose = require("mongoose");
const joi = require("joi");

const ResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    exams: [
        {
            exam: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Exam",
                required: true
            },
            mark: {
                type: Number,
                required: true
            }
        }
    ],
    assignments: [
        {
            assignment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Assignment",
                required: true
            },
            mark:{
                type: Number,
                required: true
            }
        }
    ],
    totalMark: {
        type: Number
        // Not required, will be calculated
    },
    isPassed: Boolean,
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: {
        type: Date,
        default: Date.now,
    }
});

// Ensure one result per user per course
ResultSchema.index({ user: 1, course: 1 }, { unique: true });

// Pre-save hook to calculate totalMark
ResultSchema.pre('save', function(next) {
    const examTotal = this.exams.reduce((sum, e) => sum + (e.mark || 0), 0);
    const assignmentTotal = this.assignments.reduce((sum, a) => sum + (a.mark || 0), 0);
    this.totalMark = examTotal + assignmentTotal;
    this.isPassed = this.totalMark > 45;
    next();
});

const ResultJoi = joi.object({
    user: joi.string().required(),
    course: joi.string().required(),
    exams: joi.array().items(
        joi.object({
            exam: joi.string().required(),
            mark: joi.number().required()
        })
    ).required(),
    assignments: joi.array().items(
        joi.object({
            assignment: joi.string().required(),
            mark: joi.number().required()
        })
    ).required(),
    // totalMark removed from required, will be calculated
    isPassed: joi.boolean().optional(),
    approved: joi.boolean().optional(),
    approvedAt: joi.date().optional(),
    approvedBy: joi.string().optional(),
    date: joi.date().optional()
});

const Result = mongoose.model("Result", ResultSchema);
const validateResult = (data) => ResultJoi.validate(data);

module.exports.Result = Result;
module.exports.validateResult = validateResult;
