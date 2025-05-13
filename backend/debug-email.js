const nodemailer = require('nodemailer');
require('dotenv').config();

async function debugEmailDelivery() {
    console.log('=== EMAIL DELIVERY DEBUGGING ===');
    console.log('Current environment variables:');
    console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '******** (set)' : '(not set)'}`);
    
    // Test recipient (same as sender for testing)
    const recipient = process.env.EMAIL_USER;
    
    // Create a test email with detailed debugging information
    const mailOptions = {
        from: `\"EchoWrites Debug\" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: 'EchoWrites Password Reset Email Debug Test',
        text: `This is a debug test email sent at ${new Date().toISOString()}\n\nIf you're receiving this email, it means the email delivery system is working correctly.\n\nTest OTP: 123456`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h1 style="color: #f44336;">Email Delivery Debug Test</h1>
                <p>This is a debug test email sent at <strong>${new Date().toISOString()}</strong></p>
                <p>If you're receiving this email, it means the email delivery system is working correctly.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">123456</div>
                <p style="margin-top: 20px; font-size: 12px; color: #777;">This is an automated debug email. Please do not reply to this message.</p>
            </div>
        `
    };
    
    console.log('\nAttempting to send debug email with different configurations:');
    
    // Try multiple configurations to determine which one works
    const configurations = [
        {
            name: 'Gmail Direct SSL',
            config: {
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
            }
        },
        {
            name: 'Gmail Direct TLS',
            config: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            }
        },
        {
            name: 'Gmail Service',
            config: {
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            }
        }
    ];
    
    // Try each configuration
    for (const config of configurations) {
        console.log(`\n--- Testing ${config.name} ---`);
        try {
            const transporter = nodemailer.createTransport(config.config);
            
            console.log('Verifying transporter...');
            await transporter.verify();
            console.log('Transporter verification successful!');
            
            console.log('Sending test email...');
            const info = await transporter.sendMail(mailOptions);
            
            console.log('Email sent successfully!');
            console.log('Message ID:', info.messageId);
            console.log('Response:', info.response);
            console.log(`✅ ${config.name} WORKS!`);
            
            // If we get here, email was sent successfully
            return {
                success: true,
                configuration: config.name,
                messageId: info.messageId
            };
        } catch (error) {
            console.error(`❌ ${config.name} failed:`, error.message);
            if (error.code) console.error('Error code:', error.code);
            if (error.command) console.error('Failed command:', error.command);
            if (error.response) console.error('Server response:', error.response);
        }
    }
    
    // If we get here, all configurations failed
    console.error('\n❌ All email configurations failed!');
    console.error('Please check your Gmail account settings:');
    console.error('1. Make sure 2FA is enabled on your Google account');
    console.error('2. Generate a new App Password specifically for this application');
    console.error('3. Update your .env file with the new app password');
    console.error('4. Make sure your Gmail account doesn\'t have additional security restrictions');
    
    return {
        success: false,
        message: 'All email configurations failed'
    };
}

// Run the debug function
debugEmailDelivery()
    .then(result => {
        if (result.success) {
            console.log('\n=== EMAIL DELIVERY DEBUG SUCCESSFUL ===');
            console.log(`Working configuration: ${result.configuration}`);
            console.log('Please check your email inbox for the test message');
            console.log('Update the authRoutes.js file to use this configuration');
        } else {
            console.log('\n=== EMAIL DELIVERY DEBUG FAILED ===');
            console.log('Please review the error messages above for troubleshooting');
        }
    })
    .catch(error => {
        console.error('Unexpected error during debugging:', error);
    });
