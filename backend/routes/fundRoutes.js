// routes/fundRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fundController');
const { verifyTokenMiddleware, requireRole } = require('../middleware/auth');

router.get('/', verifyTokenMiddleware, ctrl.getSummary);
router.get('/purposes', verifyTokenMiddleware, ctrl.getPurposes);
router.post('/', verifyTokenMiddleware, ctrl.contribute);
router.put('/:id/approve', verifyTokenMiddleware, requireRole(['editor', 'super_admin']), ctrl.approve);
router.put('/:id/reject', verifyTokenMiddleware, requireRole(['editor', 'super_admin']), ctrl.reject);
router.delete('/:id', verifyTokenMiddleware, requireRole(['super_admin']), ctrl.deleteContribution);

module.exports = router;
