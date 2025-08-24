'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthRequiredModal({ 
  isOpen, 
  onClose,
  message = 'נדרשת התחברות מחדש כדי להמשיך'
}: AuthRequiredModalProps) {
  const router = useRouter();
  
  if (!isOpen) return null;

  const handleRelogin = () => {
    // Clear old tokens
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    
    // Get the current system (CRM or transcription)
    const currentPath = window.location.pathname;
    const isCRM = currentPath.startsWith('/crm');
    const system = isCRM ? 'crm' : 'transcription';
    
    // Redirect to login with the appropriate system
    router.push('/login?system=' + system);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="modal-content" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #faf8f3 100%)',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(139, 69, 19, 0.2)',
        textAlign: 'center',
        border: '1px solid rgba(218, 165, 32, 0.2)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #b8860b 0%, #daa520 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'inline-block'
        }}>
          🔐
        </div>
        
        <h2 style={{
          fontSize: '24px',
          marginBottom: '15px',
          color: '#6b4423',
          fontWeight: '600',
          textShadow: '1px 1px 2px rgba(139, 69, 19, 0.1)'
        }}>
          נדרשת התחברות מחדש
        </h2>
        
        <p style={{
          fontSize: '16px',
          color: '#8b6914',
          marginBottom: '25px',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleRelogin}
            style={{
              background: 'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #ffd700 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(184, 134, 11, 0.3)',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(184, 134, 11, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(184, 134, 11, 0.3)';
            }}
          >
            התחבר מחדש
          </button>
          
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #f5f5dc 0%, #ffe4b5 100%)',
              color: '#6b4423',
              border: '1px solid #daa520',
              borderRadius: '8px',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px rgba(139, 69, 19, 0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #ffe4b5 0%, #f5f5dc 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f5f5dc 0%, #ffe4b5 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            המשך ללא שמירה
          </button>
        </div>
        
        <p style={{
          fontSize: '13px',
          color: '#a0826d',
          marginTop: '20px',
          fontStyle: 'italic'
        }}>
          תוכל להמשיך לעבוד באופן מקומי, אך השינויים לא יישמרו בשרת
        </p>
      </div>
    </div>
  );
}