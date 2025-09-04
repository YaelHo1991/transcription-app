'use client';

import React, { useEffect, useState } from 'react';
import LoginPopup from '../LoginPopup/LoginPopup';
import { setupAuthInterceptor, setupXHRInterceptor, setLoginPopupCallback } from '@/lib/services/authInterceptor';

export default function AuthInterceptorProvider({ children }: { children: React.ReactNode }) {
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  useEffect(() => {
    // Setup auth interceptors
    if (typeof window !== 'undefined') {
      setupAuthInterceptor();
      setupXHRInterceptor();
      
      // Set the callback to show login popup
      setLoginPopupCallback(() => {
        setShowLoginPopup(true);
      });
    }
  }, []);

  const handleLoginSuccess = () => {
    setShowLoginPopup(false);
    // The popup component already reloads the page after successful login
  };

  const handleClose = () => {
    setShowLoginPopup(false);
  };

  return (
    <>
      {children}
      <LoginPopup 
        isOpen={showLoginPopup} 
        onClose={handleClose}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}