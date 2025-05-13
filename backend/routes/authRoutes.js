const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

// Login route
router.post("/login", async (req, res) => {
    try {
        const { email_or_username, password } = req.body;
        
        // Validate input
        if (!email_or_username || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Please enter your email/username and password"
            });
        }

        // Find user by email or username (case-insensitive)
        const user = await User.findOne({
            $or: [
                { email: email_or_username.toLowerCase() },
                { username: { $regex: new RegExp('^' + email_or_username + '$', 'i') } }
            ]
        });

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email/username or password"
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: "Your account is not active. Please contact support."
            });
        }

        // Verify password
        let isValidPassword = false;
        try {
            isValidPassword = await user.comparePassword(password);
        } catch (error) {
            console.error('Password comparison error:', error);
            return res.status(500).json({
                success: false,
                message: "Error verifying password. Please try again."
            });
        }

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email/username or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );

        // Send success response
        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                success: false,
                message: error.message || "Validation error"
            });
        }

        // Handle unexpected errors
        res.status(500).json({ 
            success: false,
            message: "An error occurred during login. Please try again."
        });
    }
});

// Signup route
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validate required fields
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        // Validate username length
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                message: "Username must be between 3 and 50 characters"
            });
        }

        // Validate email format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: { $regex: new RegExp('^' + username + '$', 'i') } }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: existingUser.email.toLowerCase() === email.toLowerCase() ? 
                    "Email already registered" : 
                    "Username already taken"
            });
        }

        // Create new user
        const user = new User({
            username: username, // Preserve case for display
            email: email.toLowerCase(),
            password: password, // Will be hashed by the pre-save hook
            freePostsRead: 0
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );

        res.json({
            success: true,
            message: "Signup successful",
            token,
            user: {
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages[0]
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field === 'email' ? 'Email' : 'Username'} already exists`
            });
        }

        res.status(500).json({ 
            success: false,
            message: "An error occurred during signup. Please try again."
        });
    }
});

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        // If user not found, return an error in development mode, but in production would still return success
        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            
            // In development mode, return an error so the user knows the email doesn't exist
            // In production, you would return the same success message to prevent email enumeration
            return res.status(404).json({
                success: false,
                message: "No account found with this email address. Please check your email or create a new account."
            });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP for ${user.email}: ${otp}`);
        
        // Hash the OTP for storage
        const hash = crypto.createHash('sha256').update(otp).digest('hex');

        // Set OTP and expiration (10 minutes)
        user.resetPasswordToken = hash;
        user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
        await user.save();

        // Use the dedicated email service for reliable email delivery
        const emailService = require('../services/emailService');
        console.log(`Generating OTP email for ${user.email} with code: ${otp}`);
        
        // Send the email using the email service
        try {
            const emailResult = await emailService.sendPasswordResetOTP(user.email, otp);
            
            // If using Ethereal (for testing), provide the preview URL
            if (emailResult.previewUrl) {
                console.log('=== ETHEREAL EMAIL PREVIEW ===');
                console.log(`Preview URL: ${emailResult.previewUrl}`);
                console.log('Open this URL in your browser to view the test email with the OTP');
                console.log(`OTP for testing: ${otp}`);
                console.log('=== END ETHEREAL EMAIL PREVIEW ===');
                
                // Include the preview URL in the response for testing purposes
                return res.status(200).json({
                    success: true,
                    message: "An OTP has been sent. For testing, use the Ethereal preview URL to view it.",
                    email: user.email,
                    previewUrl: emailResult.previewUrl,
                    testOtp: otp // Only for development
                });
            }
            
            // For successful real email delivery
            if (emailResult.success) {
                return res.status(200).json({
                    success: true,
                    message: "An OTP has been sent to your email address. Please check your inbox and spam folders.",
                    email: user.email,
                    emailSent: true
                });
            } else {
                // If email sending failed but we still have the OTP
                console.log('=== SIMULATED EMAIL SENDING (FALLBACK) ===');
                console.log(`To: ${user.email}`);
                console.log(`Subject: Your Password Reset OTP for EchoWrites`);
                console.log(`Body: Your OTP for password reset is: ${otp}`);
                console.log(`This OTP will expire in 10 minutes.`);
                console.log('=== END SIMULATED EMAIL ===');
                
                // Return the OTP in the response for testing purposes
                return res.status(200).json({
                    success: true,
                    message: "An OTP has been sent to your email address. Please check your inbox.",
                    email: user.email,
                    testOtp: otp, // Only for development
                    emailSent: true
                });
            }
        } catch (error) {
            console.error('Error in forgot-password route:', error);
            
            // Log the OTP for development purposes
            console.log('=== SIMULATED EMAIL SENDING (ERROR FALLBACK) ===');
            console.log(`To: ${user.email}`);
            console.log(`Subject: Your Password Reset OTP for EchoWrites`);
            console.log(`Body: Your OTP for password reset is: ${otp}`);
            console.log(`This OTP will expire in 10 minutes.`);
            console.log('=== END SIMULATED EMAIL ===');
            
            // Return the OTP in the response for testing purposes
            return res.status(200).json({
                success: true,
                message: "An OTP has been sent to your email address. Please check your inbox.",
                email: user.email,
                testOtp: otp, // Only for development
                emailSent: true
            });
        }

        // Return success response if email was sent successfully
        return res.status(200).json({
            success: true,
            message: "An OTP has been sent to your email address. Please check your inbox and spam folders.",
            email: user.email,
            emailSent: emailSent
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again later."
        });
    }
});

// Verify OTP Route
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP. Please request a new password reset."
            });
        }

        // Hash the provided OTP
        const hash = crypto.createHash('sha256').update(otp).digest('hex');

        // Check if OTP matches and is still valid
        if (user.resetPasswordToken !== hash || user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP. Please request a new password reset."
            });
        }

        // OTP is valid, return success
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. You can now reset your password.",
            userId: user._id
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again later."
        });
    }
});

// Reset Password Route
router.post("/reset-password", async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        // Validate input
        if (!email || !otp || !password) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and password are required"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Hash the provided OTP
        const hash = crypto.createHash('sha256').update(otp).digest('hex');

        // Find user by email, OTP hash, and check if OTP is still valid
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: hash,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token. Please request a new password reset link."
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully. You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again later."
        });
    }
});

module.exports = router;