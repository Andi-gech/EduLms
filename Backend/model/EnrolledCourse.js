const mongoose = require("mongoose");
const joi=require('joi')
const EnrolledCourseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
    },
    enrolledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    enrolledAt: { type: Date, default: Date.now },
    completedModules: [
        {
            result: Number,
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "CourseModule",
            }
        }
    ],
    status: {
        type: String,
        enum: ['in-progress', 'completed'],
        default: 'in-progress',
    },
    completedAt: {
        type: Date,
    },
});
const EnrolledCourse = mongoose.model("EnrolledCourse", EnrolledCourseSchema);
const JoiEnrolledCourse=joi.object({
 
    course:joi.string().required(),
    enrolledBy: joi.string().optional(),
 
})
const validateEnrolledCourse=(data)=>{
    return JoiEnrolledCourse.validate(data)
}

module.exports.EnrolledCourse=EnrolledCourse
module.exports.validateEnrolledCourse=validateEnrolledCourse