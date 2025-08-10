const mongoose=require('mongoose')
const joi=require('joi')
const CourseModuleSchema=mongoose.Schema(
    {
        name:String,
        content:String,
        videolink:String,
        order:{
            type:Number,
            
          
            min:0
        },
        course:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Course"
        },
       
       
    }
)
const CourseModule=mongoose.model("CourseModule",CourseModuleSchema)
const CourseModuleJoi=joi.object({
    name:joi.string().required(),
    content:joi.string().required(),
    order:joi.number().required(),
    course:joi.string().required(),
    video:joi.string().optional(),
})
const validateCourseModule=(data)=>{
    return CourseModuleJoi.validate(data)
}
module.exports.CourseModule=CourseModule
module.exports.validateCourseModule=validateCourseModule
