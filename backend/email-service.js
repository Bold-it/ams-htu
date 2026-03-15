const nodemailer = require('nodemailer');
const { google } = require('googleapis');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

let cachedTransporter = null;

const getTransporter = async () => {
    if (cachedTransporter) return cachedTransporter;

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_USER) {
        throw new Error('Gmail credentials not fully configured');
    }

    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID.trim(),
            process.env.GMAIL_CLIENT_SECRET.trim(),
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN.trim()
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) reject("Failed to create access token: " + err.message);
                resolve(token);
            });
        });

        cachedTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.GMAIL_USER,
                accessToken,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN
            }
        });

        cachedTransporter.on('token', (token) => {
            console.log('New access token generated');
        });

        return cachedTransporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        throw error;
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
        const mailOptions = {
            from: `HTU Accreditation <${process.env.GMAIL_USER}>`,
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
        await transporter.verify();
        return { success: true };
    } catch (error) {
        console.error('SMTP Verification failed:', error);
        cachedTransporter = null;
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail, verifyConnection };
