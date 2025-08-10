
const express = require('express');
const router = express.Router();
const { CourseCatagory } = require('../model/CourseCatagory');
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const logger = require('../Middleware/winstonLogger');
const multer = require("multer");
const path = require('path');
const { ValidateJoiSchema } = require('../model/CourseCatagory');
const allowedRoles = require('../Middleware/allowedRoles');

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


router.post('/', AuthMiddleware, allowedRoles('Registrar'), upload.single("image"), async (req, res) => {
    try {
        const {error}=ValidateJoiSchema(req.body);
        const image = req.file;
        if(!image){
            return res.status(400).send("image is required");
        }
        req.body.image=`uploads/catagory/${image.filename}`;
        if(error){
            return res.status(400).send(error.details[0].message);
        }
        const result=await CourseCatagory.create(req.body);
        res.send(result);
    } catch (error) {
        logger.error('Error in POST /coursecatagory: %o', error);
        res.status(500).send(error.message);
    }
});


router.get('/', AuthMiddleware, async (req, res) => {
    try {
        const result=await CourseCatagory.find().lean();
        res.send(result);
    } catch (error) {
        logger.error('Error in GET /coursecatagory: %o', error);
        return res.status(500).send(error.message);
    }
});

router.get('/:id', AuthMiddleware, async (req, res) => {
    try {
        const result=await CourseCatagory.findById(req.params.id).lean();
        res.send(result);
    } catch (error) {
        logger.error('Error in GET /coursecatagory/:id: %o', error);
        return res.status(500).send(error.message);
    }
});

module.exports=router