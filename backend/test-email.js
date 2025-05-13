const nodemailer = require('nodemailer');

// This script tests email delivery independently of the application
async function testEmailDelivery() {
    console.log('Starting email delivery test...');
    
    // Test different email configurations
    await testEtherealEmail();
    await testGmailSMTP();
    await testSendGrid();
}

async function testEtherealEmail() {
    console.log('\n--- Testing Ethereal Email (Fake SMTP Service) ---');
    try {
        // Create a test account
        const testAccount = await nodemailer.createTestAccount();
        console.log('Created Ethereal test account:', testAccount.user);
        
        // Create a transporter with SSL certificate verification disabled
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            },
            tls: {
                // Do not fail on invalid certificates
                rejectUnauthorized: false
            }
        });
        
        // Send a test email
        const info = await transporter.sendMail({
            from: '"Test Sender" <test@example.com>',
            to: 'recipient@example.com',
            subject: 'Test Email from Ethereal',
            text: 'This is a test email from Ethereal',
            html: '<b>This is a test email from Ethereal</b>'
        });
        
        console.log('Message sent:', info.messageId);
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        console.log('✅ Ethereal Email test successful');
        return true;
    } catch (error) {
        console.error('❌ Ethereal Email test failed:', error);
        return false;
    }
}

async function testGmailSMTP() {
    console.log('\n--- Testing Gmail SMTP ---');
    try {
        // Create a transporter with SSL certificate verification disabled
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'your-app-password'
            },
            tls: {
                // Do not fail on invalid certificates
                rejectUnauthorized: false
            }
        });
        
        // Send a test email
        const info = await transporter.sendMail({
            from: '"Test Sender" <your-email@gmail.com>',
            to: 'recipient@example.com', // Change to a real email for testing
            subject: 'Test Email from Gmail SMTP',
            text: 'This is a test email from Gmail SMTP',
            html: '<b>This is a test email from Gmail SMTP</b>'
        });
        
        console.log('Message sent:', info.messageId);
        console.log('✅ Gmail SMTP test successful');
        return true;
    } catch (error) {
        console.error('❌ Gmail SMTP test failed:', error);
        console.error('Note: For Gmail, you need to:');
        console.error('1. Enable "Less secure app access" or');
        console.error('2. Use an App Password if 2FA is enabled');
        console.error('3. Set EMAIL_USER and EMAIL_PASS environment variables');
        return false;
    }
}

async function testSendGrid() {
    console.log('\n--- Testing SendGrid ---');
    try {
        // Check if SendGrid API key is available
        if (!process.env.SENDGRID_API_KEY) {
            console.error('\u274c SendGrid API key not found. Set SENDGRID_API_KEY environment variable.');
            return false;
        }
        
        // Create a transporter with SSL certificate verification disabled
        const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            },
            tls: {
                // Do not fail on invalid certificates
                rejectUnauthorized: false
            }
        });
        
        // Send a test email
        const info = await transporter.sendMail({
            from: '"Test Sender" <from@example.com>',
            to: 'recipient@example.com', // Change to a real email for testing
            subject: 'Test Email from SendGrid',
            text: 'This is a test email from SendGrid',
            html: '<b>This is a test email from SendGrid</b>'
        });
        
        console.log('Message sent:', info.messageId);
        console.log('✅ SendGrid test successful');
        return true;
    } catch (error) {
        console.error('❌ SendGrid test failed:', error);
        console.error('Note: You need to:');
        console.error('1. Sign up for a SendGrid account');
        console.error('2. Create an API key');
        console.error('3. Set SENDGRID_API_KEY environment variable');
        return false;
    }
}

// Run the test
testEmailDelivery().catch(console.error);
