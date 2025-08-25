'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FixSession() {
  const router = useRouter();

  useEffect(() => {
    // Clear everything and start fresh
    localStorage.clear();
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '20px',
      color: '#666',
      direction: 'rtl',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div>מנקה את הסשן...</div>
      <div style={{ fontSize: '14px', color: '#999' }}>
        תועבר לדף ההתחברות בעוד רגע
      </div>
    </div>
  );
}