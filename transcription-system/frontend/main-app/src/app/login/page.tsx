'use client';

// Force dynamic rendering to avoid static caching issues
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './login.css';
import { buildApiUrl } from '@/utils/api';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const system = searchParams.get('system') || 'transcription';
  
  // Force dynamic rendering by accessing current timestamp
  const [renderTime] = useState(() => Date.now());
  
  const [formData, setFormData] = useState({
    loginId: '', // Can be email or username  
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  // Determine system-specific styling
  const isCRM = system === 'crm';
  const systemName = isCRM ? 'מערכת CRM' : 'מערכת תמלול';
  const themeColor = isCRM ? '#b85042' : '#e0a96d';
  const bgGradient = isCRM 
    ? 'linear-gradient(135deg, #f5f6f0 0%, #ede8d3 100%)'
    : 'linear-gradient(135deg, #faf8f5 0%, #f5e6d3 100%)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', formData.loginId);
      
      // Determine if loginId is email or username
      const isEmail = formData.loginId.includes('@');
      const requestBody = isEmail 
        ? { email: formData.loginId, password: formData.password }
        : { username: formData.loginId, password: formData.password };

      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.success) {
        // Store auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userFullName', data.user.full_name || '');
        localStorage.setItem('permissions', data.user.permissions || '');
        localStorage.setItem('userCompany', data.user.personal_company || '');
        localStorage.setItem('transcriberCode', data.user.transcriber_code || '');
        
        // Check permissions and redirect accordingly
        const permissions = data.user.permissions || '';
        const hasCRM = permissions.includes('A') || permissions.includes('B') || permissions.includes('C');
        const hasTranscription = permissions.includes('D') || permissions.includes('E') || permissions.includes('F');
        
        if (isCRM && hasCRM) {
          router.push('/crm');
        } else if (!isCRM && hasTranscription) {
          router.push('/transcription');
        } else if (hasCRM) {
          router.push('/crm');
        } else if (hasTranscription) {
          router.push('/transcription');
        } else {
          setError('אין לך הרשאות למערכת זו');
        }
      } else {
        setError(data.error || data.message || 'שגיאה בהתחברות');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('שגיאה בהתחברות למערכת');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordUsername) {
      setForgotPasswordMessage('אנא הזן שם משתמש בשדה ההתחברות');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');

    try {
      const response = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: forgotPasswordUsername }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setForgotPasswordMessage('קישור לאיפוס הסיסמה נשלח לכתובת האימייל הרשומה במערכת');
        // Close modal after success
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordUsername('');
          setForgotPasswordMessage('');
        }, 3000);
      } else {
        setForgotPasswordMessage(data.message || 'שגיאה בשליחת האימייל');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setForgotPasswordMessage('שגיאה בחיבור לשרת');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <>
      <div 
        className="login-container" 
        style={{ 
          background: bgGradient,
          '--theme-color': themeColor,
          '--theme-color-20': themeColor + '33',
          '--theme-color-40': themeColor + '66',
          '--theme-color-50': themeColor + '80'
        } as React.CSSProperties}
        dir="rtl"
      >
        <div className="login-box">
          <div 
            className="login-header" 
            style={{ background: isCRM ? 'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}
          >
            <h1>{systemName}</h1>
            <p>התחברות למערכת</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="loginId">שם משתמש או דוא״ל</label>
              <input
                type="text"
                id="loginId"
                value={formData.loginId}
                onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                required
                placeholder="הזן את שם המשתמש או כתובת האימייל שלך"
                dir="ltr"
              />
            </div>
            
            <div className="form-group">
              <div className="password-header">
                <label htmlFor="password">סיסמה</label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotPasswordUsername(formData.loginId);
                  }}
                  style={{ color: themeColor }}
                >
                  שכחת סיסמה?
                </button>
              </div>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="הזן את הסיסמה שלך"
                dir="ltr"
              />
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              style={{ background: isCRM ? 'linear-gradient(135deg, ' + themeColor + ', ' + themeColor + 'dd)' : 'linear-gradient(135deg, #4a3428, #6b4423)' }}
              disabled={loading}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>אין לך חשבון? <Link href="/licenses" style={{ color: themeColor }}>רכוש רישיון</Link></p>
            {isCRM ? (
              <p>
                <Link href="/login?system=transcription" style={{ color: themeColor }}>
                  עבור למערכת תמלול
                </Link>
              </p>
            ) : (
              <p>
                <Link href="/login?system=crm" style={{ color: themeColor }}>
                  עבור למערכת CRM
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="modal-backdrop" onClick={() => setShowForgotPassword(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>איפוס סיסמה</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowForgotPassword(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleForgotPassword} className="modal-form">
                <p style={{ marginBottom: '20px', fontSize: '16px', lineHeight: '1.5' }}>
                  קישור לאיפוס הסיסמה יישלח לכתובת האימייל הרשומה במערכת.
                </p>

                {forgotPasswordMessage && (
                  <div className={`message ${forgotPasswordMessage.includes('שגיאה') ? 'error' : 'success'}`} style={{ marginBottom: '20px' }}>
                    {forgotPasswordMessage}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    style={{ background: themeColor }}
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? 'שולח...' : 'שלח קישור'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #faf8f5 0%, #f5e6d3 100%)'
      }}>
        <div>טוען...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}