
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


// List teachers (Registrar + department heads/admins for their department)
router.get('/teachers', AuthMiddleware, allowedRoles('Registrar','department_head','department_admin'), async (req, res) => {
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

// List students (Registrar, short training office, department head/admin) optionally filtered by department
router.get('/students', AuthMiddleware, allowedRoles('Registrar','short_training_office','department_head','department_admin'), async (req, res) => {
    try {
        const { department } = req.query;
        const filter = { role: 'student' };
        if (department) {
            if (!mongoose.Types.ObjectId.isValid(department)) {
                return res.status(400).send('Invalid department id');
            }
            filter.department = department;
        }
        const result = await User.find(filter).select('-password').lean();
        return res.send(result);
    } catch (error) {
        logger.error('Error in GET /users/students: %o', error);
        return res.status(500).send(error.message);
    }
});


// Current authenticated user (define before /:id to prevent '/me' being captured by param route)
router.get('/me', AuthMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').lean();
        if (!user) return res.status(404).send('User not found');
        return res.send(user);
    } catch (error) {
        logger.error('Error in GET /users/me: %o', error);
        return res.status(500).send(error.message);
    }
});

router.get('/:id', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send('Invalid id');
        const result = await User.findById(id).select('-password').lean();
        if (!result) return res.status(404).send('User not found');
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
            department: user.department,
            pic: user.profilepic,
            email: user.email
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

// Change password (authenticated user)
router.put('/me/password', AuthMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).send('User not found');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
        // Basic strength check fallback (backend already enforces on register)
        if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'New password too short' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ changed: true });
    } catch (error) {
        logger.error('Error in PUT /users/me/password: %o', error);
        res.status(500).json({ error: 'Internal Server Error' });
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