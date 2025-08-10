const mongoose = require('mongoose');
const Joi = require('joi');

const termSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) { return v >= this.startDate; },
        message: 'Term endDate must be equal to or after startDate'
      }
    },
    active: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Term = mongoose.model('Term', termSchema);

const termJoi = Joi.object({
  name: Joi.string().min(2).required(),
  code: Joi.string().alphanum().min(2).max(12).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required()
    .messages({ 'date.min': 'endDate must be equal to or after startDate' }),
  active: Joi.boolean().optional()
});

const validateTerm = (data) => termJoi.validate(data);

module.exports = { Term, validateTerm };
