'use client';

import { useRouter } from 'next/navigation';
import './UnauthorizedOverlay.css';

interface UnauthorizedOverlayProps {
  requiredPermission: string;
  permissionName: string;
  theme: 'transcription' | 'proofreading' | 'export' | 'crm-jobs' | 'crm-clients' | 'crm-employees';
}

export default function UnauthorizedOverlay({ 
  requiredPermission, 
  permissionName,
  theme 
}: UnauthorizedOverlayProps) {
  const router = useRouter();

  const handlePurchase = () => {
    router.push('/licenses');
  };

  const handleMainPage = () => {
    // Navigate to appropriate main page based on theme
    if (theme.startsWith('crm-')) {
      router.push('/crm');
    } else {
      router.push('/transcription');
    }
  };

  return (
    <div className={`unauthorized-overlay theme-${theme}`}>
      <div className="unauthorized-modal">
        <div className="unauthorized-icon">🔒</div>
        <h2 className="unauthorized-title">אין הרשאת גישה</h2>
        <p className="unauthorized-message">
          אין לך הרשאת גישה לדף זה.<br/>
          נדרשת הרשאת {permissionName} ({requiredPermission})
        </p>
        <div className="unauthorized-buttons">
          <button className="unauthorized-btn btn-primary" onClick={handlePurchase}>
            רכישת רישיון
          </button>
          <button className="unauthorized-btn btn-secondary" onClick={handleMainPage}>
            לדף הראשי
          </button>
        </div>
      </div>
    </div>
  );
}