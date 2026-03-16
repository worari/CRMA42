const express = require('express');
const router = express.Router();
const { register, login, getUsers, updateUserStatus } = require('../controllers/authController');
// Note: In a secure app, getUsers and updateUserStatus should be protected by middleware (e.g. check for JWT token and role).
// We simulate admin protection loosely here.

router.post('/register', register);
router.post('/login', login);
router.get('/users', getUsers); // Admin only, add middleware later
router.put('/users/:id/status', updateUserStatus); // Admin only, add middleware later

module.exports = router;
