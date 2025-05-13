const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email Service - Handles all email sending functionality
 * This service provides reliable email delivery with multiple fallback options
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.testAccount = null;
        this.initializeTransporter();
    }

    /**
     * Initialize the email transporter with the most reliable configuration
     */
    async initializeTransporter() {
        // Try to create a real email transporter with Gmail
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                // Use the exact configuration that was verified to work in test-email-delivery.js
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: {
                        // This is critical for environments with certificate issues
                        rejectUnauthorized: false
                    }
                });
                
                console.log('Email service initialized with Gmail');
                return;
            } catch (error) {
                console.error('Failed to initialize Gmail transporter:', error.message);
            }
        }

        // Fallback to Ethereal for testing
        try {
            this.testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: this.testAccount.user,
                    pass: this.testAccount.pass
                }
            });
            console.log('Email service initialized with Ethereal test account');
        } catch (error) {
            console.error('Failed to initialize Ethereal test account:', error.message);
            this.transporter = null;
        }
    }

    /**
     * Send an email
     * @param {Object} options - Email options
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendEmail(options) {
        const result = {
            success: false,
            messageId: null,
            previewUrl: null,
            error: null
        };

        // If no transporter is available, try to initialize it again
        if (!this.transporter) {
            await this.initializeTransporter();
            if (!this.transporter) {
                result.error = 'No email transporter available';
                return result;
            }
        }

        try {
            // Send the email
            const info = await this.transporter.sendMail(options);
            result.success = true;
            result.messageId = info.messageId;
            
            // If using Ethereal, provide the preview URL
            if (this.testAccount) {
                result.previewUrl = nodemailer.getTestMessageUrl(info);
                console.log('Ethereal preview URL:', result.previewUrl);
            }
            
            return result;
        } catch (error) {
            console.error('Email sending error:', error.message);
            result.error = error.message;
            
            // Try one more time with a different configuration
            try {
                console.log('Attempting alternative email configuration...');
                const alternativeTransporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
                
                const info = await alternativeTransporter.sendMail(options);
                result.success = true;
                result.messageId = info.messageId;
                return result;
            } catch (fallbackError) {
                console.error('Alternative email configuration also failed:', fallbackError.message);
                result.error = `${error.message} (Fallback also failed: ${fallbackError.message})`;
                return result;
            }
        }
    }

    /**
     * Send a password reset OTP email
     * @param {string} email - Recipient email address
     * @param {string} otp - One-time password
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendPasswordResetOTP(email, otp) {
        // Validate the email format
        if (!this.isValidEmail(email)) {
            console.error(`Invalid email format: ${email}`);
            return { success: false, error: 'Invalid email format' };
        }

        // Create mail options with proper formatting
        const mailOptions = {
            from: `\"EchoWrites Password Reset\" <${process.env.EMAIL_USER || 'noreply@echowrites.com'}>`,
            to: email,
            subject: 'Your Password Reset OTP for EchoWrites',
            text: `Your OTP for password reset is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this password reset, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h1 style="color: #f44336;">Password Reset OTP</h1>
                    <p>You are receiving this email because you (or someone else) has requested a password reset for your EchoWrites account.</p>
                    <p>Your One-Time Password (OTP) for password reset is:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${otp}</div>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">This is an automated email. Please do not reply to this message.</p>
                </div>
            `
        };

        console.log(`Sending password reset OTP to ${email}: ${otp}`);
        
        // Try to send the email
        try {
            // First try with the main transporter
            const result = await this.sendEmail(mailOptions);
            
            // Log the result for debugging
            if (result.success) {
                console.log(`Password reset OTP email sent successfully to ${email}`);
                return result;
            } 
            
            // If the main transporter failed, try direct Gmail configuration
            console.log(`Main transporter failed, trying direct Gmail configuration for ${email}`);
            
            const directGmailTransporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            const directInfo = await directGmailTransporter.sendMail(mailOptions);
            console.log(`Direct Gmail email sent successfully to ${email}`);
            return { 
                success: true, 
                messageId: directInfo.messageId,
                directMethod: true
            };
        } catch (error) {
            console.error(`All attempts to send email to ${email} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Whether the email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = new EmailService();
