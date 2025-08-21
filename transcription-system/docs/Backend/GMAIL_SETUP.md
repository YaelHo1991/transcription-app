# Gmail Email Setup Guide

## Overview
This guide explains how to configure Gmail SMTP for sending automated emails from the transcription system.

## Prerequisites
- A Gmail account
- 2-Step Verification enabled on your Google account

## Step-by-Step Setup

### 1. Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification" 
3. Follow the prompts to enable it if not already enabled

### 2. Generate App Password
1. After enabling 2-Step Verification, go back to [Security Settings](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Scroll to the bottom and click on "App passwords"
4. Select app: "Mail"
5. Select device: "Other (Custom name)"
6. Enter name: "Transcription System"
7. Click "Generate"
8. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

### 3. Configure Environment Variables
Add these lines to your backend `.env.development` file:

```env
# Email Configuration (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

**Location**: `C:\Users\ayelh\Documents\Projects\Transcription\transcription-system\backend\.env.development`

**Important**: 
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `xxxx-xxxx-xxxx-xxxx` with the 16-character app password (you can include or omit spaces)
- Never commit this file to version control

### 4. Email Sending Limits
Gmail SMTP has the following limits:
- **Daily sending limit**: 500 emails per day
- **Recipients per message**: 500 recipients
- **Rate limit**: ~20 emails per second

For production use with higher volumes, consider using:
- SendGrid (100 free emails/day)
- AWS SES
- Mailgun

## Testing
Once configured, the system will automatically send emails when:
1. A new user registers via the licenses page
2. Password reset is requested (if implemented)
3. Other system notifications

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify the app password is correct
   - Ensure 2-Step Verification is enabled
   - Check that you're using the app password, not your regular Gmail password

2. **"Less secure app access" warning**
   - This is normal when using app passwords
   - App passwords are actually more secure than regular passwords

3. **Emails not sending**
   - Check your internet connection
   - Verify the GMAIL_USER matches the account that generated the app password
   - Check the backend logs for specific error messages

## Security Notes
- App passwords are full access to your Gmail account
- Store them securely and never share them
- If compromised, immediately revoke the app password in Google Account settings
- Consider creating a dedicated Gmail account for system emails

## Email Template
The system sends a welcome email with the following format:

```
Subject: ברוכים הבאים למערכת התמלול

שלום [Full Name],

חשבונך נוצר בהצלחה במערכת התמלול!

פרטי הכניסה שלך:
====================
אימייל: [user@example.com]
סיסמה: [Auto-generated password]

כניסה למערכת: http://localhost:3002/login

חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה.

ההרשאות שלך:
[List of permissions]

בברכה,
צוות מערכת התמלול
```

## Development Mode
In development, generated passwords are also visible at:
- **Dev Dashboard**: http://localhost:5000/dev
- Database field: `users.plain_password`

This helps with testing and debugging during development.