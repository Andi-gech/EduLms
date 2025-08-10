const mongoose = require("mongoose");
const { Answer } = require("./Answer");
const { Question } = require("./Question");

const ResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
    },
    history: [
        {
            Questionid: {
                type: mongoose.Schema.Types.ObjectId,
                
                ref: "Question",
            },
            Answerid:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Answer"
            }
        }
    ],
    marks: Number,
    ispassed: Boolean,
  
    date: {
        type: Date,
        default: Date.now,
    },

    
 
})
const Result = mongoose.model("Result", ResultSchema);

module.exports.Result = Result;
