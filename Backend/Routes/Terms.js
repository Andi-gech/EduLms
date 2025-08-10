const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../Middleware/AuthMiddleware');
const allowedRoles = require('../Middleware/allowedRoles');
const { Term, validateTerm } = require('../model/Term');
const logger = require('../Middleware/winstonLogger');

router.post('/', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    const { error } = validateTerm(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    const term = await Term.create(req.body);
    return res.send(term);
  } catch (e) {
    logger.error('Create term error: %o', e);
    return res.status(500).send(e.message);
  }
});


router.get('/', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    const terms = await Term.find().lean();
    return res.send(terms);
  } catch (e) {
    logger.error('List terms error: %o', e);
    return res.status(500).send(e.message);
  }
});

router.put('/:id/active', AuthMiddleware, allowedRoles('Registrar'), async (req, res) => {
  try {
    await Term.updateMany({}, { $set: { active: false } });
    const term = await Term.findByIdAndUpdate(req.params.id, { active: true }, { new: true });
    if (!term) return res.status(404).send('Term not found');
    return res.send(term);
  } catch (e) {
    logger.error('Set active term error: %o', e);
    return res.status(500).send(e.message);
  }
});

module.exports = router;
