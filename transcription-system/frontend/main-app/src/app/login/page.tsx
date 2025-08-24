'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const system = searchParams.get('system') || 'transcription';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      console.log('Attempting login with:', formData.email);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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

  return (
    <>
      <div 
        className="login-container" 
        style={{ background: bgGradient }}
        dir="rtl"
      >
        <div className="login-box">
          <div 
            className="login-header" 
            style={{ background: isCRM ? `linear-gradient(135deg, ${themeColor}, ${themeColor + 'dd'})` : 'linear-gradient(135deg, #4a3428, #6b4423)' }}
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
              <label htmlFor="email">כתובת אימייל</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="הזן את כתובת האימייל שלך"
                dir="ltr"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">סיסמה</label>
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
              style={{ background: isCRM ? `linear-gradient(135deg, ${themeColor}, ${themeColor + 'dd'})` : 'linear-gradient(135deg, #4a3428, #6b4423)' }}
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
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-box {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          max-width: 450px;
          width: 100%;
        }

        .login-header {
          padding: 40px 30px;
          color: white;
          text-align: center;
        }

        .login-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .login-header p {
          font-size: 16px;
          opacity: 0.9;
        }

        .login-form {
          padding: 40px 30px;
        }

        .error-message {
          background: #fee;
          color: #c00;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.3s ease;
          background: #f8f8f8;
        }

        .form-group input:focus {
          outline: none;
          border-color: ${themeColor};
          background: white;
          box-shadow: 0 0 0 3px ${themeColor}20;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px ${themeColor}40;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px ${themeColor}50;
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          padding: 20px 30px;
          background: #f8f8f8;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }

        .login-footer p {
          margin: 10px 0;
          color: #666;
          font-size: 14px;
        }

        .login-footer a {
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s ease;
        }

        .login-footer a:hover {
          opacity: 0.8;
        }

        @media (max-width: 480px) {
          .login-header {
            padding: 30px 20px;
          }
          
          .login-form {
            padding: 30px 20px;
          }
          
          .login-header h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </>
  );
}