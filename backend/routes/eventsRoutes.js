// routes/eventsRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/eventsController');
const { verifyTokenMiddleware, requireRole } = require('../middleware/auth');

router.get('/', verifyTokenMiddleware, ctrl.getAll);
router.get('/:id', verifyTokenMiddleware, ctrl.getById);
router.post('/', verifyTokenMiddleware, requireRole(['editor', 'super_admin']), ctrl.create);
router.put('/:id', verifyTokenMiddleware, requireRole(['editor', 'super_admin']), ctrl.update);
router.delete('/:id', verifyTokenMiddleware, requireRole(['editor', 'super_admin']), ctrl.deleteEvent);
router.post('/:id/register', verifyTokenMiddleware, ctrl.register);
router.delete('/:id/register/:alumni_id', verifyTokenMiddleware, ctrl.unregister);

module.exports = router;
