const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require('path');
const { CourseModule, validateCourseModule } = require('../model/CourseModule');
const allowedRoles = require('../Middleware/allowedRoles');
const CourseOwner = require('../Middleware/IsCourseOwner');
const IsAssignedTeacherOrOwner = require('../Middleware/IsAssignedTeacherOrOwner');

const AuthMiddleware = require("../Middleware/AuthMiddleware");
const logger = require('../Middleware/winstonLogger');


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


router.post('/:courseid/create', AuthMiddleware, allowedRoles('teacher'), IsAssignedTeacherOrOwner, upload.single("video"), async (req, res) => {
    try {
      req.body.course=req.params.courseid
      const { error } = validateCourseModule(req.body);
      const video = req.file;
      if(video){
        req.body.videolink=`uploads/catagory/${video.filename}`
      }
      if (error) {
          return res.status(400).send(error.details[0].message);
      }
      let desired = Number(req.body.order);
      if (Number.isNaN(desired)) desired = 1;
      // If conflict, shift down modules >= desired
      const conflict = await CourseModule.findOne({order:desired,course:req.params.courseid});
      if(conflict){
        // increment order of all modules with order >= desired
        await CourseModule.updateMany({ course: req.params.courseid, order: { $gte: desired } }, { $inc: { order: 1 } });
      }
      req.body.order = desired;
      const result = await CourseModule.create(req.body)
      res.send(result)
  }
    catch (error) {
        logger.error('Error in POST /coursemodule/:courseid/create: %o', error);
        res.status(500).send(error.message);
    }
});


router.delete('/:courseid/delete/:id', AuthMiddleware, allowedRoles('teacher'), IsAssignedTeacherOrOwner, async (req, res) => {
    try{
    const isvalid= require('mongoose').isValidObjectId(req.params.id)
    if (!isvalid) {
        return res.status(400).send("invalid id")
    }
    const result = await CourseModule.findByIdAndDelete(req.params.id);
    res.send(result)
}
    catch (error) {
        logger.error('Error in DELETE /coursemodule/:courseid/delete/:id: %o', error);
        res.status(500).send(error.message);
    }
});


// Update existing module
router.put('/:courseid/update/:id', AuthMiddleware, allowedRoles('teacher'), IsAssignedTeacherOrOwner, upload.single('video'), async (req, res) => {
  try {
    const isvalid = require('mongoose').isValidObjectId(req.params.id);
    if (!isvalid) return res.status(400).send('invalid id');

    const module = await CourseModule.findById(req.params.id);
    if (!module) return res.status(404).send('Module not found');

    // Apply incoming fields
    const { name, content, order } = req.body;
    if (name !== undefined) module.name = name;
    if (content !== undefined) module.content = content;
    if (order !== undefined) {
      const newOrder = Number(order);
      if (Number.isNaN(newOrder)) return res.status(400).send('Invalid order');
      if (module.order !== newOrder) {
        // Attempt swap if another module already has target order
        const conflicting = await CourseModule.findOne({ course: req.params.courseid, order: newOrder, _id: { $ne: module._id } });
        if (conflicting) {
          // swap orders (conflicting takes old order)
          const oldOrder = module.order;
          conflicting.order = oldOrder;
          await conflicting.save();
        }
        module.order = newOrder;
      }
    }
    if (req.file) {
      module.videolink = `uploads/catagory/${req.file.filename}`;
    }
    await module.save();
    res.send(module);
  } catch (error) {
    logger.error('Error in PUT /coursemodule/:courseid/update/:id: %o', error);
    res.status(500).send(error.message);
  }
});


// Department content approval listing (place before dynamic :moduleid route to avoid conflicts)
router.get('/approvals', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { status = 'pending', course } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (course) filter.course = course;
    const mods = await CourseModule.find(filter).sort({ order: 1 }).lean();
    res.json(mods);
  } catch (error) {
    logger.error('Error in GET /coursemodule/approvals: %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/course/:courseid', AuthMiddleware, allowedRoles('Registrar', 'teacher','department_head','department_admin'), async (req, res) => {
  try {
    const isvalid = require('mongoose').isValidObjectId(req.params.courseid);
    if (!isvalid) return res.status(400).send('Invalid id');
    const modules = await CourseModule.find({ course: req.params.courseid }).sort({ order: 1 }).lean();
    return res.send(modules);
  } catch (error) {
    logger.error('Error in GET /coursemodule/course/:courseid: %o', error);
    return res.status(500).send(error.message);
  }
});

router.get('/:moduleid', AuthMiddleware, allowedRoles('Registrar', 'teacher','department_head','department_admin'), async (req, res) => {
  try {
    const isvalid = require('mongoose').isValidObjectId(req.params.moduleid);
    if (!isvalid) return res.status(400).send('Invalid id');
    const module = await CourseModule.findById(req.params.moduleid).lean();
    if (!module) {
      return res.status(404).send('Module not found');
    }
    return res.send(module);
  } catch (error) {
    logger.error('Error in GET /coursemodule/:moduleid: %o', error);
    return res.status(500).send(error.message);
  }
});

router.post('/:id/approve', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').isValidObjectId(id)) return res.status(400).send('Invalid id');
    const mod = await CourseModule.findById(id);
    if (!mod) return res.status(404).send('Module not found');
    mod.status = 'approved';
    await mod.save();
    res.json({ _id: mod._id, status: mod.status });
  } catch (error) {
    logger.error('Error in POST /coursemodule/:id/approve: %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:id/reject', AuthMiddleware, allowedRoles('department_head','department_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').isValidObjectId(id)) return res.status(400).send('Invalid id');
    const mod = await CourseModule.findById(id);
    if (!mod) return res.status(404).send('Module not found');
    mod.status = 'rejected';
    await mod.save();
    res.json({ _id: mod._id, status: mod.status });
  } catch (error) {
    logger.error('Error in POST /coursemodule/:id/reject: %o', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;

