# Google Gmail/Workspace Integration Setup

To allow the Accreditation Monitoring System to send emails using HTU's Gmail/Workspace account, you need to set up Google OAuth 2.0 credentials.

## Step 1: Create a Project in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top and select **New Project**.
3. Name it `HTU Accreditation System` and click **Create**.
4. Select the newly created project.

## Step 2: Enable Gmail API

1. In the sidebar, go to **APIs & Services > Library**.
2. Search for `Gmail API`.
3. Click on **Gmail API** and then click **Enable**.

## Step 3: Configure Branding and Data Access (Scopes)

1. In the **Google Auth Platform** sidebar, go to **Branding**.
2. Fill in the **App name** (HTU Accreditation) and **Support email**. Click **Save**.
3. Go to **Audience** in the sidebar. Select **Internal** and click **Save**.
4. Go to **Data access** in the sidebar. This is where **Scopes** are managed.
5. Click **Add or remove scopes**.
6. Search for and select `https://mail.google.com/` (Gmail API - Send, read, and delete emails). 
7. Click **Update** at the bottom, then click **Save** on the Data Access page.

## Step 4: Create Clients (Credentials)

1. Go to **Clients** in the sidebar.
2. Click **Create client** at the top and select **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Accreditation Backend`.
5. Under **Authorized redirect URIs**, add:
   `https://developers.google.com/oauthplayground`
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

## Step 5: Get Refresh Token

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the settings icon (gear) in the top right.
3. Check **Use your own OAuth credentials**.
4. Paste your **Client ID** and **Client Secret**.
5. Close settings.
6. In the Step 1 list on the left, find **Gmail API v1**.
7. Select `https://mail.google.com/`.
8. Click **Authorize APIs**.
9. Sign in with **accreditationsystem@htu.edu.gh**.
10. Click **Continue** (ignore the "Google hasn't verified this app" warning by clicking Advanced > Go to HTU Accreditation System (unsafe)).
11. Grant permission.
12. In Step 2, click **Exchange authorization code for tokens**.
13. Copy the **Refresh Token**.

## Step 6: Update Environment Variables

Update your `.env` file in the `backend` folder with the credentials:

```env
GMAIL_CLIENT_ID=your_client_id_from_step_4
GMAIL_CLIENT_SECRET=your_client_secret_from_step_4
GMAIL_REFRESH_TOKEN=your_refresh_token_from_step_5
GMAIL_USER=accreditationsystem@htu.edu.gh
```

## Troubleshooting

- **Token Expiry**: The Refresh Token handles long-term access. If it stops working (rare, usually if password changes or permissions revoked), repeat Step 5 to generate a new one.
- **"App not verified"**: Since this is an internal internal tool, you can ignore verification warnings during setup.
