const pool = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const secretKey = process.env.JWT_SECRET || 'crma42_secret_key';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { email, password, military_id, first_name, last_name } = req.body;
        
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if user already exists
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const id = crypto.randomUUID();
        const role = 'user'; // Default role
        const status = 'pending'; // Default status

        const newUser = await pool.query(
            `INSERT INTO users (id, email, password_hash, military_id, first_name, last_name, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, first_name, last_name, role, status`,
            [id, email, hashedPassword, military_id, first_name, last_name, role, status]
        );

        res.status(201).json({
            message: 'Registration successful! Please wait for admin approval.',
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check status
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Your account is pending admin approval' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Your account has been rejected' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            secretKey,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, military_id, first_name, last_name, role, status, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user status (admin only)
// @route   PUT /api/auth/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'
        
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: `User status updated to ${status}`, user: result.rows[0] });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    register,
    login,
    getUsers,
    updateUserStatus
};
