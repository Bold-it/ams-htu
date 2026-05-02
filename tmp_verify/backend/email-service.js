const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const OAuth2 = google.auth.OAuth2;

let cachedTransporter = null;

const withTimeout = (promise, ms, timeoutName) => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: ${timeoutName} took longer than ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
};

let lastFailureTime = 0;
const FAILURE_CACHE_MS = 60000; // Skip verification for 1 minute if it failed

const getTransporter = async () => {
    if (cachedTransporter) return cachedTransporter;

    if (Date.now() - lastFailureTime < FAILURE_CACHE_MS) {
        throw new Error('SMTP is in a temporary cooling-off period after recent failure/timeout.');
    }

    // TRIM and STRIP SPACES for safety!
    const user = (process.env.EMAIL_USER || "").replace(/\s/g, "");
    const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");
    const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
    const port = parseInt(process.env.EMAIL_PORT) || 465;
    const secure = process.env.EMAIL_SECURE !== 'false';

    const config = {
        host,
        port,
        secure,
        auth: { user, pass },
        authMethod: 'LOGIN',
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000, // Socket timeout
        greetingTimeout: 5000,   // Greeting timeout
        socketTimeout: 5000     // Data transfer timeout
    };

    try {
        console.log(`SMTP Connection: ${host}:${port} (SSL: ${secure})`);
        const transporter = nodemailer.createTransport(config);
        
        // Wrap verify in a strict 5-second timeout
        await withTimeout(transporter.verify(), 5000, 'SMTP Verify (Port 465)');
        
        cachedTransporter = transporter;
        return cachedTransporter;
    } catch (e) {
        console.warn(`Primary SMTP failed or timed out: ${e.message}. Trying fallback Port 587...`);
        
        try {
            const fallbackConfig = { ...config, port: 587, secure: false };
            const fallbackTransporter = nodemailer.createTransport(fallbackConfig);
            
            // Wrap fallback verify in a strict 5-second timeout
            await withTimeout(fallbackTransporter.verify(), 5000, 'SMTP Verify (Port 587)');
            
            cachedTransporter = fallbackTransporter;
            return cachedTransporter;
        } catch (e2) {
            lastFailureTime = Date.now();
            throw new Error(`SMTP Error: ${e.message} (Fallback 587: ${e2.message})`);
        }
    }
};

const getEmailFooter = () => {
    return `
    <br>
    <div style="font-family: Arial, sans-serif; color: #333; font-size: 14px; line-height: 1.5; border-top: 1px solid #ccc; padding-top: 15px; margin-top: 30px;">
        <p><strong>Office of the Pro-Vice-Chancellor</strong><br>
        Ho Technical University, P. O. Box HP 217, Ho, Volta Region, Ghana, West Africa<br>
        "Adanu na zu kekeli”</p>
        
        <p style="font-size: 13px;">
            Tel: 036 202 7419<br>
            Digital Address: VH-0044-6820
        </p>
        
        <div style="font-size: 12px; color: #666; margin-top: 15px;">
            <p>📎 Please consider the environment before printing this email.<br>
            🔐 This email and any attachments are confidential and intended only for the addressee. Unauthorized use is prohibited.<br>
            🖥️ Ensure your device is protected by up-to-date antivirus software and follow HTU’s IT Security Policy at all times.</p>
        </div>
    </div>
    `;
};

const sendEmail = async (to, subject, htmlContent, attachments = []) => {
    try {
        const transporter = await getTransporter();
        // FORCE the 'from' to match the authenticated user!
        const fromEmail = (process.env.EMAIL_USER || "").trim();
        const mailOptions = {
            from: `HTU Accreditation <${fromEmail}>`,
            to,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    ${htmlContent}
                </div>
                ${getEmailFooter()}
            `,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        cachedTransporter = null;
        return { success: false, error: error.message };
    }
};

const verifyConnection = async () => {
    try {
        const transporter = await getTransporter();
        return { success: true };
    } catch (error) {
        console.error('SMTP Verification failed:', error);
        cachedTransporter = null;
        return { 
            success: false, 
            error: error.message,
            diagnostics: {
                host: (process.env.EMAIL_HOST || "").trim(),
                user_start: (process.env.EMAIL_USER || "").trim().substring(0, 5) + "...",
                pass_len: (process.env.EMAIL_PASS || "").trim().length
            }
        };
    }
};

module.exports = { sendEmail, verifyConnection };
