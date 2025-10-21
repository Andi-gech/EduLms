const mongoose=require('mongoose')
const joi=require('joi')
const CourseModuleSchema=mongoose.Schema(
    {
        name:String,
        content:String,
        videolink:String,
        linkUrl:String,
        type:{ type:String, enum:['text','video','link','file'], default:'text' },
        status:{ type:String, enum:['pending','approved','rejected'], default:'pending' },
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
    content:joi.string().allow('').optional(),
    order:joi.number().required(),
    course:joi.string().required(),
    videolink:joi.string().allow('').optional(),
    linkUrl:joi.string().allow('').optional(),
    type:joi.string().valid('text','video','link','file').optional(),
    status:joi.string().valid('pending','approved','rejected').optional(),
})
const validateCourseModule=(data)=>{
    return CourseModuleJoi.validate(data)
}
module.exports.CourseModule=CourseModule
module.exports.validateCourseModule=validateCourseModule
