const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const { Department, validateDepartment } = require('../model/Department');
const { User } = require('../model/User');
const logger = require('../Middleware/winstonLogger');


router.post('/', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    const { error } = validateDepartment(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const dep = await Department.create(req.body);
    return res.send(dep);
  } catch (e) {
    logger.error('Error creating department: %o', e);
    return res.status(500).send(e.message);
  }
});


router.get('/', AuthMiddleware, allowedRoles('Registrar','department_head','department_admin','teacher'), async (req, res) => {
  try {
    const deps = await Department.find().lean();
    return res.send(deps);
  } catch (e) {
    logger.error('Error listing departments: %o', e);
    return res.status(500).send(e.message);
  }
});

router.put('/:deptId/assign-head/:userId', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    const dep = await Department.findById(req.params.deptId);
    if (!dep) return res.status(404).send('Department not found');
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found');
    user.role = 'department_head';
    user.department = dep._id;
    await user.save();
    dep.head = user._id;
    await dep.save();
    return res.send(dep);
  } catch (e) {
    logger.error('Error assigning department head: %o', e);
    return res.status(500).send(e.message);
  }
});

module.exports = router;
