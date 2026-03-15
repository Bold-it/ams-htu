const { google } = require('googleapis');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

async function testCredentials() {
    console.log('Testing GMAIL credentials from .env...');
    console.log('User:', process.env.GMAIL_USER);
    console.log('Client ID:', process.env.GMAIL_CLIENT_ID);

    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID.trim(),
        process.env.GMAIL_CLIENT_SECRET.trim(),
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN.trim()
    });

    try {
        const { token } = await oauth2Client.getAccessToken();
        console.log('SUCCESS! Access token retrieved.');
    } catch (error) {
        console.error('FAILURE! Error retrieving access token:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('\nPossible causes for invalid_grant:');
            console.log('1. The Refresh Token was generated for a different Client ID/Secret.');
            console.log('2. The "Use your own OAuth credentials" option was not checked in OAuth Playground settings.');
            console.log('3. The Client ID or Secret in .env does not match what was used in the Playground.');
        }
    }
}

testCredentials();
