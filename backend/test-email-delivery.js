const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailDelivery() {
    console.log('=== TESTING EMAIL DELIVERY TO ACTUAL EMAIL ===');
    console.log(`Target email: ${process.env.EMAIL_USER}`);
    
    // Create a test email with a unique timestamp
    const timestamp = new Date().toISOString();
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try multiple configurations to ensure delivery
    const configurations = [
        {
            name: 'Configuration 1: Gmail SSL with TLS options',
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
            name: 'Configuration 2: Gmail TLS',
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
            name: 'Configuration 3: Gmail Service',
            config: {
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: {
                    rejectUnauthorized: false
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
            
            // Send test email
            const info = await transporter.sendMail({
                from: `\"EchoWrites Test\" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, // Send to yourself
                subject: `Test OTP Email - ${timestamp}`,
                text: `This is a test OTP email sent at ${timestamp}.\n\nTest OTP: ${testOTP}\n\nIf you receive this email, please let me know which configuration worked.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h1 style="color: #f44336;">Test OTP Email</h1>
                        <p>This is a test OTP email sent at <strong>${timestamp}</strong>.</p>
                        <p>Your test OTP code is:</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">${testOTP}</div>
                        <p>If you receive this email, please let me know which configuration worked.</p>
                        <p>Configuration: <strong>${config.name}</strong></p>
                    </div>
                `
            });
            
            console.log('Email sent successfully!');
            console.log('Message ID:', info.messageId);
            console.log(`\u2705 ${config.name} WORKS!`);
            console.log('\nPlease check your email inbox for the test message.');
            console.log(`The test OTP is: ${testOTP}`);
            
            // If we get here, email was sent successfully
            return {
                success: true,
                configuration: config.name,
                messageId: info.messageId,
                testOTP: testOTP
            };
        } catch (error) {
            console.error(`\u274c ${config.name} failed:`, error.message);
            if (error.code) console.error('Error code:', error.code);
            if (error.command) console.error('Failed command:', error.command);
        }
    }
    
    console.error('\n\u274c All email configurations failed!');
    return { success: false };
}

// Run the test
testEmailDelivery()
    .then(result => {
        if (result.success) {
            console.log('\n=== EMAIL DELIVERY TEST SUCCESSFUL ===');
            console.log(`Working configuration: ${result.configuration}`);
            console.log(`Test OTP: ${result.testOTP}`);
            console.log('Please check your email inbox for the test message.');
        } else {
            console.log('\n=== EMAIL DELIVERY TEST FAILED ===');
            console.log('All configurations failed. Please check your Gmail settings:');
            console.log('1. Make sure 2FA is enabled on your Google account');
            console.log('2. Generate a new App Password specifically for this application');
            console.log('3. Update your .env file with the new app password');
        }
    })
    .catch(error => {
        console.error('Unexpected error during testing:', error);
    });
