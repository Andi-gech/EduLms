const mongoose=require('mongoose')
const joi=require('joi')

const ExamSchema=mongoose.Schema(
    {
        title:String,
        questions:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"Question"
            }
        ],
        CourseModule:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"CourseModule"
        },
        
        

    passingMarks:Number,
    examDuration:Number,
    examDate: { type: Date, default: null },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null }
    }
)
const Exam=mongoose.model("Exam",ExamSchema)
const JoiExam=joi.object({
    title:joi.string().required(),
    questions:joi.array().required(),
    CourseModule:joi.string().required(),
  
    passingMarks:joi.number().required(),
    examDuration:joi.number().required(),
    examDate:joi.date().optional(),
    startTime:joi.date().optional(),
    endTime:joi.date().min(joi.ref('startTime')).optional().messages({
        'date.min': 'endTime must be equal to or after startTime'
    })
})
const ValidateJoiSchema=(data)=>{
    return JoiExam.validate(data)
}
module.exports.Exam=Exam
module.exports.ValidateJoiSchema=ValidateJoiSchema