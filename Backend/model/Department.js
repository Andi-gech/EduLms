const mongoose = require('mongoose');
const Joi = require('joi');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);

const departmentJoi = Joi.object({
  name: Joi.string().min(2).required(),
  code: Joi.string().alphanum().min(2).max(12).required(),
  description: Joi.string().allow(''),
  head: Joi.string().optional(),
});

const validateDepartment = (data) => departmentJoi.validate(data);

module.exports = { Department, validateDepartment };
