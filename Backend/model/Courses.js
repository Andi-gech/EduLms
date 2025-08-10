const mongoose=require('mongoose')
const joi=require('joi')
const CourseSchema=mongoose.Schema(
    {
        name:String,
        
        description:String,
        image:String,
        price:{
            type:Number,
            min:0,
            default:0
        },
        catagory:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"CourseCatagory",
            default:null
        },
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
        theme: { type: String, default: '' },
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
    catagory:joi.string().optional(),
  
    createdBy:joi.string().required(),
    price:joi.number().required(),
    department:joi.string().optional(),
    assignedTeacher:joi.string().optional(),
    startDate:joi.date().optional(),
    endDate:joi.date().min(joi.ref('startDate')).optional().messages({
        'date.min': 'endDate must be equal to or after startDate'
    }),
    theme:joi.string().allow('').optional(),
    
    
    
})
const Course=mongoose.model("Course",CourseSchema)
const validateCourse=(data)=>{
    return CourseJoi.validate(data)
}
module.exports.Course=Course
module.exports.validateCourse=validateCourse
