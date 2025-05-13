const nodemailer = require('nodemailer');
require('dotenv').config();

// This script helps set up SendGrid for email delivery
console.log('SendGrid Setup Helper');
console.log('====================');
console.log('\nTo use SendGrid for reliable email delivery, follow these steps:\n');
console.log('1. Sign up for a free SendGrid account at https://sendgrid.com/');
console.log('2. Create an API key in your SendGrid dashboard');
console.log('3. Add the following to your .env file:\n');
console.log('   SENDGRID_API_KEY=your_api_key_here');
console.log('   EMAIL_FROM=your_verified_sender_email@example.com');
console.log('\nNote: You must verify your sender email in SendGrid before using it');
console.log('\nAfter adding these values to your .env file, run this script again to test the configuration.');

// Check if SendGrid API key is configured
if (process.env.SENDGRID_API_KEY) {
    console.log('\nSendGrid API key found! Testing configuration...');
    testSendGrid();
} else {
    console.log('\nNo SendGrid API key found in .env file. Please add it and run this script again.');
}

async function testSendGrid() {
    try {
        // Create a transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
        
        // Verify configuration
        console.log('Verifying SendGrid configuration...');
        await transporter.verify();
        console.log('SendGrid configuration verified successfully!');
        
        // Ask for test recipient
        const testRecipient = process.env.EMAIL_USER || 'tencytitus1@gmail.com';
        console.log(`\nSending a test email to: ${testRecipient}`);
        
        // Send test email
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"EchoWrites Test" <noreply@echowrites.com>`,
            to: testRecipient,
            subject: 'SendGrid Test Email',
            text: 'This is a test email from SendGrid to verify your configuration.',
            html: '<h1>SendGrid Test</h1><p>This is a test email from SendGrid to verify your configuration.</p>'
        });
        
        console.log('Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\nYour SendGrid configuration is working correctly.');
        console.log('Now update your authRoutes.js file to prioritize SendGrid for email delivery.');
        
    } catch (error) {
        console.error('SendGrid test failed:', error);
        console.error('\nPlease check your SendGrid API key and try again.');
    }
}
