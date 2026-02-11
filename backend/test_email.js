const { Resend } = require('resend');
require('dotenv').config();

async function testEmail() {
    console.log('Testing Resend Email Configuration...\n');

    // Check if API key is loaded
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY not found in .env file');
        process.exit(1);
    }

    console.log('✅ API Key found:', process.env.RESEND_API_KEY.substring(0, 10) + '...');

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Test email
    try {
        console.log('\nSending test email...');
        const result = await resend.emails.send({
            from: 'HTU QA Unit <onboarding@resend.dev>', // Resend's test domain
            to: ['delivered@resend.dev'], // Resend's test inbox
            subject: 'Test Email from HTU Accreditation System',
            html: '<p>This is a test email to verify Resend integration is working correctly.</p>',
        });

        console.log('\n✅ Email sent successfully!');
        console.log('Message ID:', result.id);
        console.log('\nNote: This was sent to Resend\'s test inbox (delivered@resend.dev)');
        console.log('To send to real emails, you need to:');
        console.log('1. Verify your domain in Resend dashboard');
        console.log('2. Update the "from" address to use your verified domain');

    } catch (error) {
        console.error('\n❌ Error sending email:');
        console.error('Error message:', error.message);
        console.error('\nCommon issues:');
        console.error('- Invalid API key');
        console.error('- API key doesn\'t have permission to send emails');
        console.error('- Rate limit exceeded');
        process.exit(1);
    }
}

testEmail();
