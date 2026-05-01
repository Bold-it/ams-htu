const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let cachedTransporter = null;
const KEY_PATH = path.join(__dirname, 'google-key.json');

/**
 * Gets the transporter based on current configuration.
 * Prioritizes USE_OAUTH2=true, otherwise falls back to standard SMTP.
 */
const getTransporter = async () => {
    if (cachedTransporter) return cachedTransporter;

    if (process.env.USE_OAUTH2 === 'true') {
        if (!fs.existsSync(KEY_PATH)) {
            throw new Error(`CRITICAL: Google Service Account key missing at ${KEY_PATH}`);
        }

        const keyData = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
        const userEmail = (process.env.EMAIL_USER || 'accreditationsystem@htu.edu.gh').trim();

        console.log(`Initializing Google OAuth2 for: ${userEmail}`);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: userEmail,
                serviceClient: keyData.client_id,
                privateKey: keyData.private_key,
            }
        });

        try {
            await transporter.verify();
            console.log('SUCCESS: Google Service Account OAuth2 Verified.');
            cachedTransporter = transporter;
            return cachedTransporter;
        } catch (err) {
            console.error('OAuth2 Verification Failed:', err.message);
            throw err;
        }
    } else {
        // STANDARD SMTP (cPanel / Native HTU Email)
        const host = (process.env.EMAIL_HOST || "mail.ams.htu.edu.gh").trim();
        const user = (process.env.EMAIL_USER || "").trim();
        const pass = (process.env.EMAIL_PASS || "").trim();
        const port = parseInt(process.env.EMAIL_PORT) || 465;
        const secure = process.env.EMAIL_SECURE !== 'false';

        console.log(`Initializing Standard SMTP for: ${user}@${host}`);

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
            name: 'ams.htu.edu.gh' // Forces the HELO name to resolve correctly
        });

        try {
            await transporter.verify();
            console.log('SUCCESS: Standard SMTP Verified.');
            cachedTransporter = transporter;
            return cachedTransporter;
        } catch (err) {
            console.error('SMTP Verification Failed:', err.message);
            throw err;
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

const getEmailFooterText = () => {
    return `
--------------------------------------------------
Office of the Pro-Vice-Chancellor
Ho Technical University, P. O. Box HP 217, Ho, Volta Region, Ghana, West Africa
"Adanu na zu kekeli"

Tel: 036 202 7419
Digital Address: VH-0044-6820

Please consider the environment before printing this email.
This email and any attachments are confidential and intended only for the addressee. Unauthorized use is prohibited.
Ensure your device is protected by up-to-date antivirus software and follow HTU’s IT Security Policy at all times.
`;
};

const sendEmail = async (to, subject, htmlContent, textContent = null, attachments = []) => {
    try {
        const transporter = await getTransporter();
        
        const userEmail = (process.env.EMAIL_USER || 'accreditationsystem@htu.edu.gh').trim();
        
        // Simple plain-text fallback if none provided
        const finalPlainText = textContent || htmlContent.replace(/<[^>]*>/g, '').trim();

        const mailOptions = {
            from: `"HTU Accreditation" <${userEmail}>`,
            to,
            subject,
            text: `${finalPlainText}\n\n${getEmailFooterText()}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    ${htmlContent}
                </div>
                ${getEmailFooter()}
            `,
            attachments,
            headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'high',
                'X-Entity-Ref-ID': Date.now().toString()
            }
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
        await getTransporter();
        return { success: true };
    } catch (error) {
        console.error('Service Account Verification failed:', error);
        cachedTransporter = null;
        return { 
            success: false, 
            error: error.message
        };
    }
};

module.exports = { sendEmail, verifyConnection };
