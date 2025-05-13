const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailSMTP() {
    console.log('--- Testing Gmail SMTP ---');
    console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_PASS is ${process.env.EMAIL_PASS ? 'set' : 'not set'}`);
    
    try {
        // Create a transporter
        // Try with direct SMTP settings instead of 'service: gmail'
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true, // Enable debug output
            tls: {
                rejectUnauthorized: false // Bypass certificate verification (only for testing)
            }
        });
        
        console.log('Verifying transporter configuration...');
        await transporter.verify();
        console.log('Transporter verification successful!');
        
        // Send a test email
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: `"EchoWrites Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself for testing
            subject: 'Test Email for Password Reset',
            text: 'This is a test email for the password reset functionality',
            html: '<b>This is a test email for the password reset functionality</b>'
        });
        
        console.log('Message sent:', info.messageId);
        console.log('Response:', info.response);
        console.log('✅ Gmail SMTP test successful');
        return true;
    } catch (error) {
        console.error('❌ Gmail SMTP test failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('\nCommon Gmail issues:');
        console.error('1. If using a regular Gmail account:');
        console.error('   - Make sure you have enabled "Less secure app access" in your Google account settings');
        console.error('   - OR (recommended) use an App Password if 2FA is enabled');
        console.error('2. App Password issues:');
        console.error('   - Ensure there are no extra spaces in your app password');
        console.error('   - Make sure you\'re using the correct app password');
        console.error('3. Check that your Gmail account doesn\'t have additional security restrictions');
        return false;
    }
}

// Run the test
testGmailSMTP().catch(console.error);
