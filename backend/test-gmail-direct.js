const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailDirectSMTP() {
    console.log('--- Testing Gmail Direct SMTP ---');
    console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_PASS is ${process.env.EMAIL_PASS ? 'set' : 'not set'}`);
    
    try {
        // Create a transporter with the most reliable Gmail settings
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // For development environments with certificate issues
            }
        });
        
        console.log('Verifying transporter configuration...');
        await transporter.verify();
        console.log('Transporter verification successful!');
        
        // Send a test email
        console.log(`Sending test email to: ${process.env.EMAIL_USER}`);
        const info = await transporter.sendMail({
            from: `\"EchoWrites Test\" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself for testing
            subject: 'Test Email for Password Reset',
            text: 'This is a test email for the password reset functionality',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h1 style="color: #f44336;">Test Email</h1>
                    <p>This is a test email for the EchoWrites password reset functionality.</p>
                    <p>If you're seeing this, your email configuration is working correctly!</p>
                    <p>Test OTP: <strong>123456</strong></p>
                </div>
            `
        });
        
        console.log('Message sent:', info.messageId);
        console.log('Response:', info.response);
        console.log('✅ Gmail SMTP test successful');
        return true;
    } catch (error) {
        console.error('❌ Gmail SMTP test failed:', error);
        console.error('\nTroubleshooting tips:');
        console.error('1. Check your Gmail account settings:');
        console.error('   - Make sure 2FA is enabled on your Google account');
        console.error('   - Generate a new App Password specifically for this application');
        console.error('   - Copy the new password exactly as shown (no extra spaces)');
        console.error('2. Update your .env file with the new app password');
        console.error('3. If Gmail still doesn\'t work, consider using SendGrid:');
        console.error('   - Run the setup-sendgrid.js script for instructions');
        return false;
    }
}

// Run the test
testGmailDirectSMTP().catch(console.error);
