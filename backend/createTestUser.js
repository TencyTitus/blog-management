const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('./db');

async function createTestUser() {
    try {
        // Check if test user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: 'test@example.com' },
                { username: 'testuser' }
            ]
        });
        
        if (existingUser) {
            console.log('Test user already exists');
            process.exit(0);
        }

        // Create test user
        const hashedPassword = await bcrypt.hash('Test123!', 10);
        const user = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: hashedPassword,
            fullname: 'Test User',
            status: 'active',
            isAdmin: false
        });

        await user.save();
        console.log('Test user created successfully');
        console.log('Login credentials:');
        console.log('Username: testuser');
        console.log('Email: test@example.com');
        console.log('Password: Test123!');
    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        process.exit(0);
    }
}

createTestUser(); 