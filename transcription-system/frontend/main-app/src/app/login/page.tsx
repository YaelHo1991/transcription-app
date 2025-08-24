'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import './login.css';
import { buildApiUrl } from '@/utils/api';

function LoginContent() {
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
      const response = await fetch(buildApiUrl('/api/auth/login'), {
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