const { sendEmail } = require('./email-service.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runTest() {
    console.log('--- Triggering Deliverability Test Email ---');
    const targetEmail = process.env.EMAIL_USER; // Send to self
    
    const result = await sendEmail(
        targetEmail,
        'VERIFICATION: Email Deliverability Fix',
        `
        <h2>Deliverability Handshake Verified</h2>
        <p>This is a test email from the <strong>HTU Accreditation System</strong>.</p>
        <p>I have added the following improvements:</p>
        <ul>
            <li><strong>Plain-Text Fallback:</strong> This email includes a text-only version.</li>
            <li><strong>Priority Headers:</strong> Marked as High Priority for better intake.</li>
            <li><strong>DNS Alignment:</strong> Verifying the new Reverse DNS record.</li>
        </ul>
        <p>Please check your inbox (and spam) to confirm where this landed.</p>
        `,
        `VERIFICATION: Email Deliverability Fix. This is a test email verifying the new plain-text fallback and headers. Please check where this landed.`
    );

    if (result.success) {
        console.log('SUCCESS: Email sent successfully. MessageID:', result.messageId);
    } else {
        console.error('FAILED: Email trigger failed:', result.error);
    }
}

runTest();
