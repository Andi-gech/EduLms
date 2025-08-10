const mongoose = require("mongoose");
const joi=require('joi')
const CourseCatagorySchema = new mongoose.Schema({
    name: String,
    description: String,
    image: String
})
const CourseCatagory=mongoose.model("CourseCatagory", CourseCatagorySchema)
const CourseCatagoryJoi = joi.object({
    name: joi.string().required(),
    description: joi.string().required(),
  
})
const ValidateJoiSchema = (data) => {
    return CourseCatagoryJoi.validate(data);
};
module.exports.CourseCatagory=CourseCatagory
module.exports.ValidateJoiSchema = ValidateJoiSchema