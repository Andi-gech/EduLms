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
      const alreadyexist=await CourseModule.findOne({order:req.body.order,course:req.params.courseid})
      if(alreadyexist){
          return res.status(400).send("order already exist")
      }
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



router.get('/:moduleid', AuthMiddleware, allowedRoles('Registrar', 'teacher'), async (req, res) => {
  try {
    const module = await CourseModule.findById(req.params.moduleid).lean();
    if (!module) {
      return res.status(404).send("Module not found");
    }
    return res.send(module);
  } catch (error) {
    logger.error('Error in GET /coursemodule/:moduleid: %o', error);
    return res.status(500).send(error.message);
  }
});


router.get('/course/:courseid', AuthMiddleware, allowedRoles('Registrar', 'teacher'), async (req, res) => {
  try {
    const modules = await CourseModule.find({ course: req.params.courseid }).sort({ order: 1 }).lean();
    return res.send(modules);
  } catch (error) {
    logger.error('Error in GET /coursemodule/course/:courseid: %o', error);
    return res.status(500).send(error.message);
  }
});


module.exports = router;

