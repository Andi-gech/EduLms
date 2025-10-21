const mongoose=require('mongoose')
const joi=require('joi')
const CourseSchema=mongoose.Schema(
    {
        name:String,
        
    description:String,
    image:String,
        createdBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            default: null
        },
        assignedTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        status:{
            type:Boolean,
            default:false
        }
        
        
       
    }, { toJSON: { virtuals: true }, toObject: { virtuals: true } }
)
CourseSchema.virtual('coursemodules', {
    ref: 'CourseModule',
    localField: '_id',
    foreignField: 'course'
});


const CourseJoi=joi.object({
    name:joi.string().required(),
    description:joi.string().required(),
    image:joi.string().required(),
    createdBy:joi.string().required(),
    department:joi.string().optional(),
    assignedTeacher:joi.string().optional(),
    startDate:joi.date().optional(),
    endDate:joi.date().min(joi.ref('startDate')).optional().messages({
        'date.min': 'endDate must be equal to or after startDate'
    }),
    
    
    
})
const Course=mongoose.model("Course",CourseSchema)
const validateCourse=(data)=>{
    return CourseJoi.validate(data)
}
module.exports.Course=Course
module.exports.validateCourse=validateCourse
