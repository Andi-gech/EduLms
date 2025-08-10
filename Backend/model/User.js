

const mongoose = require('mongoose');
const Joi = require('joi');


const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    minlength: 2,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  
  },
  role: {
    type: String,
    enum: ['Registrar', 'student', 'teacher', 'short_training_office', 'short_training_department', 'department_head', 'department_admin'],
    default: 'student',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  profilepic: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: false
  },
  rating: [
    {
      rate: {
        type: Number,
        min: 0,
        max: 5
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for average rating
userSchema.virtual('averageRating').get(function () {
  if (!this.rating || this.rating.length === 0) return 0;
  const total = this.rating.reduce((acc, rating) => acc + rating.rate, 0);
  return total / this.rating.length;
});

const User = mongoose.model('User', userSchema);

// Joi validation schemas
const userRegisterSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      'string.empty': 'Password cannot be empty.',
      'any.required': 'Password is required.'
    }),
  role: Joi.valid('Registrar', 'student', 'teacher', 'short_training_office', 'short_training_department', 'department_head', 'department_admin').required(),
  department: Joi.string().optional().allow(null, ''),
  confirmpassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match'
  }),
  profilepic: Joi.string().allow(''),
  status: Joi.boolean()
});

const userAuthSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      'string.empty': 'Password cannot be empty.',
      'any.required': 'Password is required.'
    })
});

// Validation functions
const validateUserRegister = (data) => userRegisterSchema.validate(data);
const ValidateJoiAuth = (data) => userAuthSchema.validate(data);

module.exports = {
  User,
  validateUserRegister,
  ValidateJoiAuth
};