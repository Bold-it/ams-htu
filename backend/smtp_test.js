const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function tryConfig(name, config) {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`Config: ${config.host}:${config.port} (SSL: ${config.secure})`);
    
    const transporter = nodemailer.createTransport({
        ...config,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000, // 10s
        greetingTimeout: 10000,
        socketTimeout: 10000
    });

    try {
        console.log('Verification attempt...');
        await transporter.verify();
        console.log('SUCCESS: SMTP Connection Verified!');
        
        console.log('Sending test email to self...');
        const info = await transporter.sendMail({
            from: `"HTU TEST" <${config.auth.user}>`,
            to: config.auth.user,
            subject: `SMTP Diagnostic Test - ${name}`,
            text: `This is a diagnostic test for ${name} from the HTU Accreditation System server.`,
        });
        console.log('SUCCESS: Test email sent!', info.messageId);
        return true;
    } catch (err) {
        console.error(`FAILED: ${name}`);
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.response) console.error('Server Response:', err.response);
        return false;
    }
}

async function runDiagnostics() {
    console.log('=========================================');
    console.log('   HTU SMTP UNIVERSAL DIAGNOSTIC V2     ');
    console.log('=========================================');
    
    const user = (process.env.EMAIL_USER || "").trim();
    const pass = (process.env.EMAIL_PASS || "").trim();
    const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();

    if (!user || !pass) {
        console.error('CRITICAL: EMAIL_USER or EMAIL_PASS not found in .env');
        return;
    }

    console.log(`Testing account: ${user}`);

    // Test 1: Port 465 (SSL) - Gmail standard
    const success1 = await tryConfig('GMAIL-SSL-465', {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass }
    });

    if (success1) {
        console.log('\nCONCLUSION: Port 465 is working perfectly.');
        return;
    }

    // Test 2: Port 587 (STARTTLS) - Common fallback
    const success2 = await tryConfig('GMAIL-STARTTLS-587', {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Port 587 must use secure: false for STARTTLS
        auth: { user, pass }
    });

    if (success2) {
        console.log('\nCONCLUSION: Port 465 is BLOCKED, but Port 587 is WORKING.');
        console.log('ACTION: Update your .env to use EMAIL_PORT=587 and EMAIL_SECURE=false');
        return;
    }

    // Test 3: Common Gmail Workspace host variation
    const success3 = await tryConfig('GMAIL-SSL-WORK-SSL', {
        host: 'smtp-relay.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass }
    });

    console.log('\n=========================================');
    console.log('   DIAGNOSTIC COMPLETE                  ');
    console.log('=========================================');
    
    if (!success1 && !success2 && !success3) {
        console.log('CRITICAL: All standard Gmail connection methods failed.');
        console.log('POSSIBLE CAUSES:');
        console.log('1. Your App Password is incorrect or revoked.');
        console.log('2. Your hosting provider (cPanel) is blocking ALL outgoing SMTP ports.');
        console.log('3. Your Google Workspace has SMTP relay restricted.');
    }
}

runDiagnostics();
