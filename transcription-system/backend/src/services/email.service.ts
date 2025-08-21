import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
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

      // Verify configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error.message);
          this.transporter = null;
        } else {
          console.log('✅ Email service ready to send emails via Gmail');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send welcome email with login credentials
   */
  async sendWelcomeEmail(params: {
    to: string;
    fullName: string;
    password: string;
    permissions: string[];
  }): Promise<boolean> {
    const { to, fullName, password, permissions } = params;

    // Format permissions for display
    const permissionNames: Record<string, string> = {
      'A': 'ניהול לקוחות',
      'B': 'ניהול עבודות', 
      'C': 'ניהול מתמללים',
      'D': 'תמלול',
      'E': 'הגהה',
      'F': 'ייצוא'
    };

    const permissionsList = permissions
      .map(p => permissionNames[p] || p)
      .join(', ');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            direction: rtl;
            text-align: right;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #4a3428, #6b4423);
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
            background: #f0f8ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #4a3428;
          }
          .credentials p {
            margin: 10px 0;
            font-size: 16px;
          }
          .credentials code {
            background: #e8f4ff;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: #0066cc;
            direction: ltr;
            display: inline-block;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #4a3428, #6b4423);
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .permissions {
            background: #fff9e6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-right: 4px solid #ffc107;
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
            color: #d9534f;
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
              <h3>📋 פרטי הכניסה שלך:</h3>
              <p><strong>אימייל:</strong> <code>${to}</code></p>
              <p><strong>סיסמה:</strong> <code>${password}</code></p>
            </div>

            <div style="text-align: center;">
              <a href="https://yalitranscription.duckdns.org/login" class="button">
                🔐 כניסה למערכת
              </a>
            </div>

            <div class="permissions">
              <h3>🔑 ההרשאות שלך:</h3>
              <p>${permissionsList}</p>
            </div>

            <p class="warning">
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

כניסה למערכת: https://yalitranscription.duckdns.org/login 

ההרשאות שלך: ${permissionsList}

חשוב: מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.

בברכה,
צוות מערכת התמלול
    `;

    // If transporter is not configured, log to console
    if (!this.transporter) {
      console.log('📧 Email would be sent to:', to);
      console.log('📧 Email content:');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return true; // Return true to not block the registration process
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"מערכת התמלול" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'ברוכים הבאים למערכת התמלול - פרטי הכניסה שלך',
        text: textContent,
        html: htmlContent
      });

      console.log('✅ Welcome email sent successfully to:', to);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      // Log to console as fallback
      console.log('📧 Email content (failed to send):');
      console.log('================================');
      console.log(textContent);
      console.log('================================');
      return false; // Don't block registration if email fails
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    fullName: string;
    resetToken: string;
  }): Promise<boolean> {
    // Implementation for password reset email
    // Similar structure to welcome email
    console.log('Password reset email functionality not yet implemented');
    return true;
  }
}

// Export singleton instance
export const emailService = new EmailService();