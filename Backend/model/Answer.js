const mongoose = require("mongoose");
const joi=require('joi')
const AnswerSchema = new mongoose.Schema({
    answer: String,
    isCorrect: Boolean
})
const Answer = mongoose.model("Answer", AnswerSchema);
const JoiAnswer=joi.object({
    answer:joi.string().required(),
    isCorrect:joi.boolean().required()
})
const ValidateJoiSchema=(data)=>{
    return JoiAnswer.validate(data)
}
module.exports.Answer = Answer;
module.exports.ValidateJoiSchema=ValidateJoiSchema