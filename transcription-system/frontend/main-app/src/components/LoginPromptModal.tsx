'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './LoginPromptModal.css';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose?: () => void;
  message?: string;
  system?: 'transcription' | 'crm';
}

export default function LoginPromptModal({ 
  isOpen, 
  onClose,
  message = 'עליך להתחבר כדי לגשת למערכת',
  system = 'transcription'
}: LoginPromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push('/login?system=' + system);
  };

  const handleRegister = () => {
    router.push('/licenses');
  };

  return (
    <div className="login-prompt-overlay">
      <div className="login-prompt-modal">
        <div className="login-prompt-header">
          <div className="login-prompt-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.0222 2 8.08879 2.58649 6.4443 3.6853C4.79981 4.78412 3.51809 6.3459 2.76121 8.17317C2.00433 10.0004 1.8063 12.0111 2.19215 13.9509C2.578 15.8907 3.53041 17.6725 4.92894 19.0711C6.32746 20.4696 8.10929 21.422 10.0491 21.8079C11.9889 22.1937 13.9996 21.9957 15.8268 21.2388C17.6541 20.4819 19.2159 19.2002 20.3147 17.5557C21.4135 15.9112 22 13.9778 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7363 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.76121C14.6136 2.25866 13.3132 2 12 2ZM12 20C10.4178 20 8.87104 19.5308 7.55544 18.6518C6.23985 17.7727 5.21447 16.5233 4.60897 15.0615C4.00347 13.5997 3.84504 11.9911 4.15372 10.4393C4.4624 8.88743 5.22433 7.46197 6.34315 6.34315C7.46197 5.22433 8.88743 4.4624 10.4393 4.15372C11.9911 3.84504 13.5997 4.00346 15.0615 4.60896C16.5233 5.21447 17.7727 6.23984 18.6518 7.55544C19.5308 8.87103 20 10.4177 20 12C20 14.1217 19.1572 16.1566 17.6569 17.6569C16.1566 19.1571 14.1217 20 12 20Z" fill="currentColor"/>
              <path d="M12 11C12.5523 11 13 10.5523 13 10V7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7V10C11 10.5523 11.4477 11 12 11Z" fill="currentColor"/>
              <path d="M12 14C11.4477 14 11 14.4477 11 15V17C11 17.5523 11.4477 18 12 18C12.5523 18 13 17.5523 13 17V15C13 14.4477 12.5523 14 12 14Z" fill="currentColor"/>
            </svg>
          </div>
          <h2>נדרשת התחברות</h2>
          <p>{message}</p>
        </div>
        
        <div className="login-prompt-body">
          <p className="login-prompt-subtitle">
            בחר באחת מהאפשרויות הבאות:
          </p>
          
          <div className="login-prompt-actions">
            <button 
              className="login-prompt-btn login-prompt-btn-primary"
              onClick={handleLogin}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
              התחברות למערכת
            </button>
            
            <button 
              className="login-prompt-btn login-prompt-btn-secondary"
              onClick={handleRegister}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM19 19H5V5H19V19ZM12 8C13.66 8 15 9.34 15 11C15 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11C9 9.34 10.34 8 12 8ZM7 16.75C7 15.22 10.47 14.5 12 14.5C13.53 14.5 17 15.22 17 16.75V18H7V16.75Z" fill="currentColor"/>
              </svg>
              רכישת רישיון חדש
            </button>
          </div>
          
          {onClose && (
            <button 
              className="login-prompt-btn login-prompt-btn-text"
              onClick={onClose}
            >
              ביטול
            </button>
          )}
        </div>
      </div>
    </div>
  );
}