const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register User
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create token
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (error) {
        console.error('Error in register:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email_or_username, password } = req.body;

        console.log('Login attempt with:', { email_or_username });

        // Find user by email or username (case-insensitive for username)
        const user = await User.findOne({
            $or: [
                { email: email_or_username.toLowerCase() },
                { username: { $regex: new RegExp('^' + email_or_username + '$', 'i') } }
            ]
        });

        console.log('User search result:', {
            id: user?._id,
            username: user?.username,
            email: user?.email,
            isAdmin: user?.isAdmin,
            status: user?.status
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is not active' });
        }

        // Check password
        console.log('Checking password...');
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isMatch);

        if (!isMatch) {
            console.log('Invalid password');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        isAdmin: user.isAdmin
                    }
                });
            }
        );
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get User Profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update User Profile
router.patch('/profile', auth, async (req, res) => {
    try {
        const { username, email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (username) user.username = username;
        if (email) user.email = email;

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Routes
// Create Admin
router.post('/admin-setup', async (req, res) => {
    try {
        const { email, password, adminSecret } = req.body;

        console.log('Admin creation request received:', {
            email,
            hasPassword: !!password,
            hasAdminSecret: !!adminSecret
        });

        // Verify admin secret
        console.log('Verifying admin secret...');
        if (adminSecret !== (process.env.ADMIN_SECRET || 'your-admin-secret-key')) {
            return res.status(403).json({ message: 'Invalid admin secret key' });
        }
        console.log('Admin secret verified');

        // Check if user exists
        console.log('Existing user check:', email);
        let user = await User.findOne({ email });

        if (user) {
            console.log('Existing user found');
            // If user exists, promote to admin
            user.isAdmin = true;
            await user.save();
            console.log('Existing user promoted to admin:', {
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin
            });
        } else {
            console.log('Creating new admin user');
            // Create new admin user
            user = new User({
                email,
                username: email.split('@')[0],
                password,
                isAdmin: true
            });

            // Hash password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            console.log('New admin user created');
        }

        res.json({ message: 'Admin setup successful' });
    } catch (error) {
        console.error('Error in admin setup:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 