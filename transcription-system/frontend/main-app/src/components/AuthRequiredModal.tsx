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
    router.push(`/login?system=${system}`);
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
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          🔐
        </div>
        
        <h2 style={{
          fontSize: '24px',
          marginBottom: '15px',
          color: '#333',
          fontWeight: '600'
        }}>
          נדרשת התחברות מחדש
        </h2>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
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
              background: 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 2px 8px rgba(233, 30, 99, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            התחבר מחדש
          </button>
          
          <button
            onClick={onClose}
            style={{
              background: '#f0f0f0',
              color: '#666',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#e0e0e0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
            }}
          >
            המשך ללא שמירה
          </button>
        </div>
        
        <p style={{
          fontSize: '13px',
          color: '#999',
          marginTop: '20px',
          fontStyle: 'italic'
        }}>
          תוכל להמשיך לעבוד באופן מקומי, אך השינויים לא יישמרו בשרת
        </p>
      </div>
    </div>
  );
}