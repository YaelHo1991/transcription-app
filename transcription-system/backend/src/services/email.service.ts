import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';

class EmailService {
  private transporter: Transporter | null = null;
  private useSendGrid: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check for SendGrid first (works immediately on Digital Ocean)
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (sendGridApiKey) {
      try {
        sgMail.setApiKey(sendGridApiKey);
        this.useSendGrid = true;
        console.log('✅ Email service ready using SendGrid');
        return;
      } catch (error) {
        console.error('❌ SendGrid initialization failed:', error);
      }
    }

    // Fall back to Gmail if SendGrid not configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.warn('⚠️ Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
      console.warn('📧 Emails will be logged to console instead of being sent');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword.replace(/\s/g, '') // Remove any spaces from app password
        }
      });

      // Verify configuration with timeout
      setTimeout(() => {
        this.transporter?.verify((error, success) => {
          if (error) {
            console.error('❌ Email service configuration error:', error.message);
            console.warn('📧 Falling back to console logging mode (Digital Ocean may block SMTP)');
            this.transporter = null;
          } else {
            console.log('✅ Email service ready to send emails via Gmail');
          }
        });
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send welcome email with login credentials - sends both CRM and Transcription emails
   */
  async sendWelcomeEmail(params: {
    to: string;
    fullName: string;
    password: string;
    permissions: string[];
  }): Promise<boolean> {
    const { to, fullName, password, permissions } = params;

    // Check which systems the user has access to
    const hasCRM = permissions.some(p => ['A', 'B', 'C'].includes(p));
    const hasTranscription = permissions.some(p => ['D', 'E', 'F'].includes(p));

    let success = true;

    // Send CRM welcome email if user has CRM permissions
    if (hasCRM) {
      const crmSuccess = await this.sendCRMWelcomeEmail({ to, fullName, password, permissions });
      success = success && crmSuccess;
    }

    // Send Transcription welcome email if user has transcription permissions
    if (hasTranscription) {
      const transcriptionSuccess = await this.sendTranscriptionWelcomeEmail({ to, fullName, password, permissions });
      success = success && transcriptionSuccess;
    }

    return success;
  }

  /**
   * Send CRM system welcome email
   */
  private async sendCRMWelcomeEmail(params: {
    to: string;
    fullName: string;
    password: string;
    permissions: string[];
  }): Promise<boolean> {
    const { to, fullName, password, permissions } = params;

    // Filter only CRM permissions
    const crmPermissions = permissions.filter(p => ['A', 'B', 'C'].includes(p));
    const permissionNames: Record<string, string> = {
      'A': 'ניהול לקוחות',
      'B': 'ניהול עבודות', 
      'C': 'ניהול מתמללים'
    };

    const permissionsList = crmPermissions
      .map(p => permissionNames[p] || p)
      .join(', ');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            direction: rtl !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f6f0;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #b85042 0%, #a0453a 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .credentials {
            background: linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #b85042;
          }
          .credentials p {
            margin: 10px 0;
            font-size: 16px;
          }
          .credentials code {
            background: #ede8d3;
            padding: 6px 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: #5a4a3a;
            direction: ltr !important;
            display: inline-block;
            unicode-bidi: bidi-override;
            text-align: left;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #b85042 0%, #d4a574 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .permissions {
            background: linear-gradient(135deg, #e7e8d1 0%, #d4d5c0 100%);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #d4a574;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .warning {
            color: #b85042;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 ברוכים הבאים למערכת ה-CRM</h1>
          </div>
          <div class="content">
            <h2>שלום ${fullName},</h2>
            <p>חשבונך נוצר בהצלחה במערכת ניהול הלקוחות!</p>
            
            <div class="credentials">
              <h3 style="text-align: right;">🔐 פרטי הכניסה שלך</h3>
              <p style="text-align: right;"><strong>אימייל:</strong> <code>${to}</code></p>
              <p style="text-align: right;"><strong>סיסמה:</strong> <code>${password}</code></p>
            </div>

            <div style="text-align: center;">
              <a href="https://yalitranscription.duckdns.org/crm" class="button" style="direction: rtl;">
                📈 כניסה למערכת CRM
              </a>
            </div>

            <div class="permissions">
              <h3 style="text-align: right;">🔑 ההרשאות שלך במערכת</h3>
              <p>${permissionsList}</p>
            </div>

            <p class="warning" style="text-align: right;">
              ⚠️ חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.
            </p>

            <div class="footer">
              <p>בברכה,<br>צוות מערכת ה-CRM</p>
              <p style="font-size: 12px; color: #999;">
                אימייל זה נשלח באופן אוטומטי. אנא אל תשיבו לאימייל זה.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
ברוכים הבאים למערכת ה-CRM

שלום ${fullName},

חשבונך נוצר בהצלחה במערכת ניהול הלקוחות!

פרטי הכניסה שלך:
====================
אימייל: ${to}
סיסמה: ${password}

כניסה למערכת: https://yalitranscription.duckdns.org/crm

ההרשאות שלך: ${permissionsList}

חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.

בברכה,
צוות מערכת ה-CRM
    `;

    // If transporter is not configured, log to console
    if (!this.transporter) {
      console.log('📧 CRM Email would be sent to:', to);
      console.log('📧 Email content:');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"מערכת ה-CRM" <${process.env.GMAIL_USER}>`,
        replyTo: 'no-reply@crm.system',
        to: to,
        subject: 'ברוכים הבאים למערכת ה-CRM - פרטי הכניסה שלך',
        text: textContent,
        html: htmlContent
      });

      console.log('✅ CRM welcome email sent successfully to:', to);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send CRM welcome email:', error);
      console.log('📧 CRM Email content (failed to send):');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return false;
    }
  }

  /**
   * Send Transcription system welcome email
   */
  private async sendTranscriptionWelcomeEmail(params: {
    to: string;
    fullName: string;
    password: string;
    permissions: string[];
  }): Promise<boolean> {
    const { to, fullName, password, permissions } = params;

    // Filter only Transcription permissions
    const transcriptionPermissions = permissions.filter(p => ['D', 'E', 'F'].includes(p));
    const permissionNames: Record<string, string> = {
      'D': 'תמלול',
      'E': 'הגהה',
      'F': 'ייצוא'
    };

    const permissionsList = transcriptionPermissions
      .map(p => permissionNames[p] || p)
      .join(', ');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            direction: rtl !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f0e8;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #4a3f2a 0%, #6b5d47 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .credentials {
            background: linear-gradient(135deg, #f5f0e8 0%, #e8dcc6 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #6b5d47;
          }
          .credentials p {
            margin: 10px 0;
            font-size: 16px;
          }
          .credentials code {
            background: #e8dcc6;
            padding: 6px 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: #4a3f2a;
            direction: ltr !important;
            display: inline-block;
            unicode-bidi: bidi-override;
            text-align: left;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #6b5d47 0%, #8b7355 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .permissions {
            background: linear-gradient(135deg, #f5f0e8 0%, #ede8d3 100%);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #8b7355;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .warning {
            color: #6b5d47;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 ברוכים הבאים למערכת התמלול</h1>
          </div>
          <div class="content">
            <h2>שלום ${fullName},</h2>
            <p>חשבונך נוצר בהצלחה במערכת התמלול!</p>
            
            <div class="credentials">
              <h3 style="text-align: right;">📋 פרטי הכניסה שלך</h3>
              <p style="text-align: right;"><strong>אימייל:</strong> <code>${to}</code></p>
              <p style="text-align: right;"><strong>סיסמה:</strong> <code>${password}</code></p>
            </div>

            <div style="text-align: center;">
              <a href="https://yalitranscription.duckdns.org/transcription" class="button" style="direction: rtl;">
                ✍️ כניסה למערכת התמלול
              </a>
            </div>

            <div class="permissions">
              <h3 style="text-align: right;">🔑 ההרשאות שלך במערכת</h3>
              <p>${permissionsList}</p>
            </div>

            <p class="warning" style="text-align: right;">
              ⚠️ חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.
            </p>

            <div class="footer">
              <p>בברכה,<br>צוות מערכת התמלול</p>
              <p style="font-size: 12px; color: #999;">
                אימייל זה נשלח באופן אוטומטי. אנא אל תשיבו לאימייל זה.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
ברוכים הבאים למערכת התמלול

שלום ${fullName},

חשבונך נוצר בהצלחה במערכת התמלול!

פרטי הכניסה שלך:
====================
אימייל: ${to}
סיסמה: ${password}

כניסה למערכת: https://yalitranscription.duckdns.org/transcription

ההרשאות שלך: ${permissionsList}

חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.

בברכה,
צוות מערכת התמלול
    `;

    // If transporter is not configured, log to console
    if (!this.transporter) {
      console.log('📧 Transcription Email would be sent to:', to);
      console.log('📧 Email content:');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"מערכת התמלול" <${process.env.GMAIL_USER}>`,
        replyTo: 'no-reply@transcription.system',
        to: to,
        subject: 'ברוכים הבאים למערכת התמלול - פרטי הכניסה שלך',
        text: textContent,
        html: htmlContent
      });

      console.log('✅ Transcription welcome email sent successfully to:', to);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send Transcription welcome email:', error);
      console.log('📧 Transcription Email content (failed to send):');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    fullName: string;
    resetToken: string;
    system?: 'crm' | 'transcription';
  }): Promise<boolean> {
    const { to, fullName, resetToken, system = 'transcription' } = params;

    // Create reset URL (works for both localhost and production)
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://yalitranscription.duckdns.org' 
      : 'http://localhost:3002';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Different styling based on system
    const systemConfig = system === 'crm' 
      ? {
          headerBg: 'linear-gradient(135deg, #b85042 0%, #a0453a 100%)',
          containerBg: '#f5f6f0',
          accentBg: 'linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%)',
          accentBorder: '#b85042',
          buttonBg: 'linear-gradient(135deg, #b85042 0%, #d4a574 100%)',
          warningBg: 'linear-gradient(135deg, #fce4d6 0%, #f9d5c2 100%)',
          warningBorder: '#d4a574',
          warningColor: '#8b5a2b',
          securityBg: 'linear-gradient(135deg, #e7e8d1 0%, #d4d5c0 100%)',
          securityBorder: '#a0453a',
          securityColor: '#5a4a3a',
          systemName: 'מערכת ה-CRM'
        }
      : {
          headerBg: 'linear-gradient(135deg, #6b5d47 0%, #8b7355 100%)',
          containerBg: '#f5f0e8',
          accentBg: 'linear-gradient(135deg, #f5f0e8 0%, #e8dcc6 100%)',
          accentBorder: '#6b5d47',
          buttonBg: 'linear-gradient(135deg, #6b5d47 0%, #8b7355 100%)',
          warningBg: 'linear-gradient(135deg, #f5ead6 0%, #ede2c7 100%)',
          warningBorder: '#8b7355',
          warningColor: '#5a4a3a',
          securityBg: 'linear-gradient(135deg, #dfd8c8 0%, #cfc5b0 100%)',
          securityBorder: '#6b5d47',
          securityColor: '#4a3f2a',
          systemName: 'מערכת התמלול'
        };

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            direction: rtl !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.8;
            color: #333;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: ${systemConfig.containerBg};
            border-radius: 10px;
          }
          .header {
            background: ${systemConfig.headerBg};
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .reset-info {
            background: ${systemConfig.accentBg};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid ${systemConfig.accentBorder};
          }
          .button {
            display: inline-block;
            padding: 15px 35px;
            background: ${systemConfig.buttonBg};
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
          }
          .button:hover {
            opacity: 0.9;
          }
          .warning {
            background: ${systemConfig.warningBg};
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid ${systemConfig.warningBorder};
            color: ${systemConfig.warningColor};
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .security-note {
            background: ${systemConfig.securityBg};
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid ${systemConfig.securityBorder};
            color: ${systemConfig.securityColor};
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 איפוס סיסמה ל${systemConfig.systemName}</h1>
          </div>
          <div class="content">
            <h2>שלום ${fullName},</h2>
            <p>קיבלנו בקשה לאיפוס הסיסמה עבור חשבונך ב${systemConfig.systemName}.</p>
            
            <div class="reset-info">
              <h3 style="text-align: right;">🔄 פרטי בקשת האיפוס</h3>
              <p style="text-align: right;"><strong>אימייל:</strong> <span style="direction: ltr !important; unicode-bidi: bidi-override; display: inline-block;">${to}</span></p>
              <p style="text-align: right;"><strong>זמן הבקשה:</strong> ${new Date().toLocaleString('he-IL')}</p>
            </div>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">
                🔓 איפוס הסיסמה
              </a>
            </div>

            <div class="warning">
              <h3 style="text-align: right;">⏰ חשוב לדעת</h3>
              <ul>
                <li>הקישור תקף למשך <strong>15 דקות בלבד</strong></li>
                <li>ניתן להשתמש בקישור פעם אחת בלבד</li>
                <li>לאחר איפוס הסיסמה, הקישור יפוג אוטומטית</li>
              </ul>
            </div>

            <div class="security-note">
              <h3 style="text-align: right;">🛡️ הערת אבטחה</h3>
              <p>אם לא ביקשת לאפס את הסיסמה, אנא התעלם מאימייל זה. הסיסמה שלך תישאר ללא שינוי.</p>
            </div>

            <div class="footer">
              <p>בברכה,<br>צוות ${systemConfig.systemName}</p>
              <p style="font-size: 12px; color: #999;">
                אימייל זה נשלח באופן אוטומטי. אנא אל תשיבו לאימייל זה.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
איפוס סיסמה ל${system === 'crm' ? 'מערכת ה-CRM' : 'מערכת התמלול'}

שלום ${fullName},

קיבלנו בקשה לאיפוס הסיסמה עבור חשבונך ב${system === 'crm' ? 'מערכת ה-CRM' : 'מערכת התמלול'}.

פרטי בקשת האיפוס:
===================
אימייל: ${to}
זמן הבקשה: ${new Date().toLocaleString('he-IL')}

לחץ על הקישור הבא כדי לאפס את הסיסמה:
${resetUrl}

חשוב לדעת:
-----------
• הקישור תקף למשך 15 דקות בלבד
• ניתן להשתמש בקישור פעם אחת בלבד
• לאחר איפוס הסיסמה, הקישור יפוג אוטומטית

הערת אבטחה:
-----------
אם לא ביקשת לאפס את הסיסמה, אנא התעלם מאימייל זה. הסיסמה שלך תישאר ללא שינוי.

בברכה,
צוות ${system === 'crm' ? 'מערכת ה-CRM' : 'מערכת התמלול'}
    `;

    // If transporter is not configured, log to console
    if (!this.transporter) {
      console.log('📧 Password reset email would be sent to:', to);
      console.log('📧 Reset URL:', resetUrl);
      console.log('📧 Email content:');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${system === 'crm' ? 'מערכת ה-CRM' : 'מערכת התמלול'}" <${process.env.GMAIL_USER}>`,
        replyTo: 'no-reply@system',
        to: to,
        subject: `איפוס סיסמה ל${system === 'crm' ? 'מערכת ה-CRM' : 'מערכת התמלול'}`,
        text: textContent,
        html: htmlContent
      });

      console.log('✅ Password reset email sent successfully to:', to);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      // Log to console as fallback
      console.log('📧 Password reset email content (failed to send):');
      console.log('================================');
      console.log(textContent);
      console.log('Reset URL:', resetUrl);
      console.log('================================');
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();