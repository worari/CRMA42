const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumniController');

router.get('/', alumniController.getAll);
router.post('/', alumniController.create);
router.get('/dictionary/:type', alumniController.getDictionary);
router.get('/:id', alumniController.getById);
router.put('/:id', alumniController.update);
router.delete('/:id', alumniController.deleteRecord);

module.exports = router;
