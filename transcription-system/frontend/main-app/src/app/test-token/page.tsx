'use client';

import { useEffect, useState } from 'react';

export default function TestToken() {
  const [tokenData, setTokenData] = useState<any>(null);
  const [localStorageUserId, setLocalStorageUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      // Get userId from localStorage
      const storedUserId = localStorage.getItem('userId');
      setLocalStorageUserId(storedUserId);
      
      // Get and decode token
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenData(payload);
      } else {
        setError('No token found in localStorage');
      }
    } catch (err) {
      setError('Error decoding token: ' + err);
    }
  }, []);

  const ADMIN_USER_IDS = [
    '3134f67b-db84-4d58-801e-6b2f5da0f6a3',
    '21c6c05f-cb60-47f3-b5f2-b9ada3631345'
  ];

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (!tokenData) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  const tokenUserId = tokenData.userId || tokenData.id || tokenData.user_id;
  const finalUserId = localStorageUserId || tokenUserId;
  const isAdminFromToken = ADMIN_USER_IDS.includes(tokenUserId);
  const isAdminFromLocalStorage = localStorageUserId ? ADMIN_USER_IDS.includes(localStorageUserId) : false;
  const isAdmin = isAdminFromLocalStorage || isAdminFromToken;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Token Debug Info</h1>
      <h2>Token Payload:</h2>
      <pre>{JSON.stringify(tokenData, null, 2)}</pre>
      
      <h2>localStorage Data:</h2>
      <p>userId from localStorage: <strong>{localStorageUserId || 'NOT FOUND'}</strong></p>
      
      <h2>Admin Check:</h2>
      <p>User ID from Token: <strong>{tokenUserId}</strong></p>
      <p>User ID from localStorage: <strong>{localStorageUserId}</strong></p>
      <p>Final User ID used: <strong>{finalUserId}</strong></p>
      <p>Admin IDs: {ADMIN_USER_IDS.join(', ')}</p>
      <p>Is Admin (from localStorage): <strong style={{ color: isAdminFromLocalStorage ? 'green' : 'red' }}>{isAdminFromLocalStorage ? 'YES' : 'NO'}</strong></p>
      <p>Is Admin (from token): <strong style={{ color: isAdminFromToken ? 'green' : 'red' }}>{isAdminFromToken ? 'YES' : 'NO'}</strong></p>
      <p>Final Admin Status: <strong style={{ color: isAdmin ? 'green' : 'red' }}>{isAdmin ? 'YES' : 'NO'}</strong></p>
    </div>
  );
}