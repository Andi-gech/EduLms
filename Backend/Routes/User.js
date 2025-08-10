
const express = require('express');
const router = express.Router();
const { User, validateUserRegister, ValidateJoiAuth } = require('../model/User');
const allowedRoles = require('../Middleware/allowedRoles');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const { Notification } = require('../model/Notification');
const secretpassword = "mysecretpassword";
const multer = require("multer");
const path = require('path');
const logger = require('../Middleware/winstonLogger');
const mongoose = require('mongoose');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/catagory');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });


router.get('/', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
        const { department } = req.query;
        const filter = { role: { $ne: 'Registrar' } };
        if (department) {
            if (!mongoose.Types.ObjectId.isValid(department)) {
                return res.status(400).send('Invalid department id');
            }
            filter.department = department;
        }
        const result = await User.find(filter, { password: 0 }).lean();
        return res.send(result);
    } catch (error) {
        logger.error('Error in GET /users: %o', error);
        return res.status(500).send(error.message);
    }
});


router.get('/teachers', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
        const { department } = req.query;
        const filter = { role: 'teacher' };
        if (department) {
            if (!mongoose.Types.ObjectId.isValid(department)) {
                return res.status(400).send('Invalid department id');
            }
            filter.department = department;
        }
        const result = await User.find(filter).sort({ averageRating: -1 }).select('-password').lean();
        return res.send(result);
    } catch (error) {
        logger.error('Error in GET /users/teachers: %o', error);
        return res.status(500).send(error.message);
    }
});


router.get('/:id', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
        const result = await User.findById(req.params.id).select('-password').lean();
        return res.send(result);
    } catch (error) {
        logger.error('Error in GET /users/:id: %o', error);
        return res.status(500).send(error.message);
    }
});

router.put('/update/:id', AuthMiddleware, async (req, res) => {
    try {
        const result = await User.findByIdAndUpdate(req.params.id, req.body);
        return res.send(result);
    } catch (error) {
        logger.error('Error in PUT /users/:id: %o', error);
        return res.status(500).send(error.message);
    }
});



router.post('/login', async (req, res) => {
    try {
        const { error } = ValidateJoiAuth(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send('invalid email or password');
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).send('invalid email or password');
        }
        const token = jwt.sign({ _id: user._id, role: user.role, fullName: user.fullName, email: user.email, department: user.department }, secretpassword, { expiresIn: '7d' });
        res.send({
            token: token,
            role: user.role,
            name: user.fullName,
            id: user._id,
            department: user.department
        });
    } catch (error) {
        logger.error('Error in POST /users/login: %o', error);
        res.status(500).send(error.message);
    }
    


   
})

router.post('/register', async (req, res) => {
    try {
        const { error } = validateUserRegister(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).send('User with this email already exists');
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        req.body.password = hashedPassword;
        const user = await User.create(req.body);
        Notification.create({ user: user._id, description: `Welcome ${user.fullName}` });
        res.send(user);
    } catch (error) {
        logger.error('Error in POST /users/register: %o', error);
        res.status(500).send(error.message);
    }
 
})

router.put('/me', AuthMiddleware, upload.single("profilepic"), async (req, res) => {
    try {
        const image = req.file;
        if (image) {
            req.body.profilepic = `uploads/catagory/${image.filename}`;
        }
        console.log('Updating user profile:', req.body);
        console.log('User ID:', req.user._id);
        const result = await User.findByIdAndUpdate(req.user._id, req.body);
        return res.send(result);
    } catch (error) {
        logger.error('Error in PUT /users/me: %o', error);
        return res.status(500).send(error.message);
    }
});

router.delete('/:id',AuthMiddleware, async (req, res) => {
    try {
        const result = await User.findByIdAndDelete(req.params.id);
        return res.send(result);
    } catch (error) {
        logger.error('Error in DELETE /users/:id: %o', error);
        return res.status(500).send(error.message);
    }
});


router.put('/:id/rate', AuthMiddleware, async (req, res) => {
    try {
        const result = await User.findByIdAndUpdate(req.params.id, {
            $push: {
                rating: {
                    rate: req.body.rate,
                    user: req.user._id
                }
            },
        }, { new: true });
        return res.send(result);
    } catch (error) {
        logger.error('Error in PUT /users/:id/rate: %o', error);
        return res.status(500).send(error.message);
    }
});

module.exports=router