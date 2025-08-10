const mongoose = require("mongoose");
const joi=require('joi')
const QuestionSchema = new mongoose.Schema({
    question: String,
    mark: Number,
    answers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Answer",
        },
    ],
    
 
})
const Question = mongoose.model("Question", QuestionSchema);
const JoiQuestion=joi.object({
    question:joi.string().required(),
    mark:joi.number().required(),
    answers:joi.array(),
})
const ValidateJoiSchema = (data) => {
    return JoiQuestion.validate(data);
};
module.exports.Question = Question;
module.exports.ValidateJoiSchema = ValidateJoiSchema