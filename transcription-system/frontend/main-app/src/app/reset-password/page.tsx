'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import './reset-password.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('קישור לא תקין');
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/auth/verify-reset-token/${token}`));
      const data = await response.json();

      if (response.ok && data.success) {
        setUserEmail(data.email);
        setVerifying(false);
      } else {
        setError(data.message || 'טוקן לא תקין או פג תוקף');
        setVerifying(false);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setError('שגיאה בחיבור לשרת');
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.password || !formData.confirmPassword) {
      setError('אנא מלא את כל השדות');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (formData.password.length < 6) {
      setError('הסיסמה חייבת להיות באורך 6 תווים לפחות');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('הסיסמה שונתה בהצלחה! מעביר לעמוד ההתחברות...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'שגיאה בעדכון הסיסמה');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="reset-container">
        <div className="reset-box">
          <div className="loading">
            <div className="spinner"></div>
            <p>מאמת קישור...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className="reset-container">
        <div className="reset-box">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>שגיאה</h2>
            <p>{error}</p>
            <button 
              className="back-button"
              onClick={() => router.push('/login')}
            >
              חזרה להתחברות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-container" dir="rtl">
      <div className="reset-box">
        <div className="reset-header">
          <h1>🔐 איפוס סיסמה</h1>
          <p>יצירת סיסמה חדשה עבור: <strong>{userEmail}</strong></p>
        </div>
        
        <form onSubmit={handleSubmit} className="reset-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="password">סיסמה חדשה</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
              dir="ltr"
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">אישור סיסמה</label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="הזן שוב את הסיסמה החדשה"
              dir="ltr"
              minLength={6}
            />
          </div>
          
          <div className="password-requirements">
            <h4>דרישות הסיסמה:</h4>
            <ul>
              <li className={formData.password.length >= 6 ? 'valid' : ''}>
                לפחות 6 תווים
              </li>
              <li className={formData.password === formData.confirmPassword && formData.password ? 'valid' : ''}>
                הסיסמאות תואמות
              </li>
            </ul>
          </div>
          
          <button 
            type="submit" 
            className="reset-button"
            disabled={loading}
          >
            {loading ? 'משנה סיסמה...' : 'שנה סיסמה'}
          </button>
        </form>
        
        <div className="reset-footer">
          <button 
            className="back-link"
            onClick={() => router.push('/login')}
          >
            ← חזרה להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="reset-container">
        <div className="reset-box">
          <div className="loading">
            <div className="spinner"></div>
            <p>טוען...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}