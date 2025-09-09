'use client';

import React, { useState, useEffect } from 'react';
import './LoginPopup.css';
import { buildApiUrl } from '@/utils/api';

interface LoginPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginPopup({ isOpen, onClose, onLoginSuccess }: LoginPopupProps) {
  const [loginId, setLoginId] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('green'); // Default theme for transcription

  useEffect(() => {
    // Detect current page theme
    const pathname = window.location.pathname;
    if (pathname.includes('/crm')) {
      setTheme('brown');
    } else if (pathname.includes('/transcription')) {
      setTheme('green');
    } else if (pathname === '/login') {
      // Check which side of login page we're on
      const loginContainer = document.querySelector('.login-container');
      if (loginContainer?.classList.contains('crm-active')) {
        setTheme('brown');
      } else {
        setTheme('green');
      }
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Determine if loginId is email or username
      const isEmail = loginId.includes('@');
      const requestBody = isEmail 
        ? { email: loginId, password }
        : { username: loginId, password };

      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear any existing invalid tokens first
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Store new token and user data (matching main login page format)
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userFullName', data.user.full_name || '');
        localStorage.setItem('permissions', data.user.permissions || '');
        localStorage.setItem('userCompany', data.user.personal_company || '');
        localStorage.setItem('transcriberCode', data.user.transcriber_code || '');
        
        // Call success callback
        onLoginSuccess();
        
        // Close popup
        onClose();
        
        // Reload the page to refresh data
        window.location.reload();
      } else {
        setError(data.error || 'שגיאה בהתחברות');
      }
    } catch (error) {
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-popup-overlay" onClick={onClose}>
      <div 
        className={`login-popup-modal theme-${theme}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="login-popup-close" onClick={onClose}>×</button>
        
        <h2>התחברות נדרשת</h2>
        <p className="login-popup-message">
          נדרשת התחברות כדי להמשיך
        </p>

        <form onSubmit={handleLogin}>
          <div className="login-popup-field">
            <input
              type="text"
              placeholder="שם משתמש או דוא״ל"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="login-popup-field">
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="login-popup-error">{error}</div>
          )}

          <button 
            type="submit" 
            className="login-popup-submit"
            disabled={isLoading}
          >
            {isLoading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        <div className="login-popup-footer">
          <a href="/login" className="login-popup-link">
            עבור לדף התחברות מלא
          </a>
        </div>
      </div>
    </div>
  );
}