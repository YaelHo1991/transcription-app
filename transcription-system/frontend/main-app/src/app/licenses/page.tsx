'use client';

import { useState, useEffect } from 'react';
import styles from './licenses.module.css';

// Exact pricing from original
const PRICING = {
  CRM_PERMISSION: 99,
  TRANSCRIPTION_PERMISSION: 79
};

const PERMISSIONS = {
  CRM: [
    { code: 'A', name: 'ניהול לקוחות', price: PRICING.CRM_PERMISSION },
    { code: 'B', name: 'ניהול עבודות', price: PRICING.CRM_PERMISSION },
    { code: 'C', name: 'ניהול מתמללים', price: PRICING.CRM_PERMISSION }
  ],
  TRANSCRIPTION: [
    { code: 'D', name: 'תמלול', price: PRICING.TRANSCRIPTION_PERMISSION },
    { code: 'E', name: 'הגהה', price: PRICING.TRANSCRIPTION_PERMISSION },
    { code: 'F', name: 'ייצוא', price: PRICING.TRANSCRIPTION_PERMISSION }
  ]
};

interface UserForm {
  fullName: string;
  email: string;
  personalCompany: string;
  permissions: string[];
}

export default function LicensesPage() {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectAllCRM, setSelectAllCRM] = useState(false);
  const [selectAllTranscription, setSelectAllTranscription] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({
    fullName: '',
    email: '',
    personalCompany: '',
    permissions: []
  });
  const [stats, setStats] = useState({
    totalUsers: '50+',
    companies: '15+',
    transcribers: '30+',
    projects: '200+'
  });

  const crmTotal = selectedPermissions
    .filter(p => ['A', 'B', 'C'].includes(p))
    .length * PRICING.CRM_PERMISSION;

  const transcriptionTotal = selectedPermissions
    .filter(p => ['D', 'E', 'F'].includes(p))
    .length * PRICING.TRANSCRIPTION_PERMISSION;

  const grandTotal = crmTotal + transcriptionTotal;

  const handlePermissionChange = (permissionCode: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionCode) 
        ? prev.filter(p => p !== permissionCode)
        : [...prev, permissionCode]
    );
    
    // Update select all status
    const crmCodes = PERMISSIONS.CRM.map(p => p.code);
    const transcriptionCodes = PERMISSIONS.TRANSCRIPTION.map(p => p.code);
    
    if (crmCodes.includes(permissionCode)) {
      const newPerms = selectedPermissions.includes(permissionCode)
        ? selectedPermissions.filter(p => p !== permissionCode)
        : [...selectedPermissions, permissionCode];
      const allCRMSelected = crmCodes.every(code => newPerms.includes(code));
      setSelectAllCRM(allCRMSelected);
    }
    
    if (transcriptionCodes.includes(permissionCode)) {
      const newPerms = selectedPermissions.includes(permissionCode)
        ? selectedPermissions.filter(p => p !== permissionCode)
        : [...selectedPermissions, permissionCode];
      const allTranscriptionSelected = transcriptionCodes.every(code => newPerms.includes(code));
      setSelectAllTranscription(allTranscriptionSelected);
    }
  };

  const handleSelectAllCRM = () => {
    const crmCodes = PERMISSIONS.CRM.map(p => p.code);
    if (selectAllCRM) {
      setSelectedPermissions(prev => prev.filter(p => !crmCodes.includes(p)));
      setSelectAllCRM(false);
    } else {
      setSelectedPermissions(prev => {
        const filtered = prev.filter(p => !crmCodes.includes(p));
        return [...filtered, ...crmCodes];
      });
      setSelectAllCRM(true);
    }
  };

  const handleSelectAllTranscription = () => {
    const transcriptionCodes = PERMISSIONS.TRANSCRIPTION.map(p => p.code);
    if (selectAllTranscription) {
      setSelectedPermissions(prev => prev.filter(p => !transcriptionCodes.includes(p)));
      setSelectAllTranscription(false);
    } else {
      setSelectedPermissions(prev => {
        const filtered = prev.filter(p => !transcriptionCodes.includes(p));
        return [...filtered, ...transcriptionCodes];
      });
      setSelectAllTranscription(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedPermissions.length === 0) {
      alert('יש לבחור לפחות הרשאה אחת');
      return;
    }

    
    const formData = {
      fullName: userForm.fullName,
      email: userForm.email,
      personalCompany: userForm.personalCompany || null,
      permissions: selectedPermissions,
      totalAmount: grandTotal
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://yalitranscription.duckdns.org/api';
      const response = await fetch(`${apiUrl}/licenses/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message || 'הזמנה נשלחה בהצלחה! נחזור אליך בהקדם.');
        // Reset form
        setUserForm({ fullName: '', email: '', personalCompany: '', permissions: [] });
        setSelectedPermissions([]);
      } else {
        const errorMsg = result.error ? `${result.message}\n\nError: ${result.error}` : result.message;
        alert('שגיאה בשליחת ההזמנה: ' + errorMsg);
        console.error('Purchase error details:', result);
        if (result.stack) {
          console.error('Stack trace:', result.stack);
        }
      }
    } catch (error) {
      alert('שגיאה בחיבור לשרת');
      console.error('Purchase error:', error);
    }
  };

  // Load stats from API
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://yalitranscription.duckdns.org/api';
    fetch(`${apiUrl}/licenses/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className={styles.body}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>🎯 מערכת תמלול - רכישת רישיונות</h1>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <h1>🚀 הצטרפו למערכת התמלול המתקדמת</h1>
          <p>פתרון מקצועי לתמלול, ניהול לקוחות ועיבוד אודיו</p>
          
          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.totalUsers}</div>
              <div className={styles.statLabel}>משתמשים פעילים</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.companies}</div>
              <div className={styles.statLabel}>חברות לקוחות</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.transcribers}</div>
              <div className={styles.statLabel}>מתמללים מקצועיים</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{stats.projects}</div>
              <div className={styles.statLabel}>פרויקטים הושלמו</div>
            </div>
          </div>
        </div>

        {/* Purchase Section */}
        <div className={styles.purchaseSection}>
          <h2>💼 רכישת רישיון</h2>
          
          <form onSubmit={handleSubmit}>
            {/* User Details Section */}
            <div className={`${styles.userDetailsSection} ${styles.crmThemed}`}>
              <h4>📋 פרטים אישיים</h4>
              <div className={styles.userFormGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="full-name">שם מלא *</label>
                  <input 
                    type="text" 
                    id="full-name"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({...userForm, fullName: e.target.value})}
                    required 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="email">אימייל *</label>
                  <input 
                    type="email" 
                    id="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    required 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="personal-company">שם חברה (אופציונלי)</label>
                  <input 
                    type="text" 
                    id="personal-company"
                    value={userForm.personalCompany}
                    onChange={(e) => setUserForm({...userForm, personalCompany: e.target.value})}
                    placeholder="שם החברה שלך"
                  />
                </div>
              </div>
            </div>

            {/* Systems Grid */}
            <div className={styles.systemsGrid}>
              {/* CRM System */}
              <div className={`${styles.systemCube} ${styles.crmSystem}`}>
                <div className={styles.systemHeader}>
                  <h3>💼 מערכת CRM</h3>
                  <p>ניהול לקוחות ופרויקטים</p>
                </div>
                <div className={styles.selectAllContainer}>
                  <input 
                    type="checkbox" 
                    id="select-all-crm"
                    checked={selectAllCRM}
                    onChange={handleSelectAllCRM}
                    className={styles.crmCheckbox}
                  />
                  <label htmlFor="select-all-crm" className={styles.selectAllLabel}>
                    בחר הכל
                  </label>
                </div>
                <div className={styles.systemContent}>
                  {PERMISSIONS.CRM.map(permission => (
                    <div key={permission.code} className={styles.permissionItem}>
                      <input 
                        type="checkbox" 
                        name="permissions" 
                        value={permission.code}
                        id={`perm-${permission.code.toLowerCase()}`}
                        checked={selectedPermissions.includes(permission.code)}
                        onChange={() => handlePermissionChange(permission.code)}
                        className={styles.crmCheckbox}
                      />
                      <label htmlFor={`perm-${permission.code.toLowerCase()}`}>
                        {permission.name} (₪{permission.price} לחודש)
                      </label>
                    </div>
                  ))}
                  <div className={styles.systemTotal}>
                    <strong>סך הכל CRM: <span>₪{crmTotal}</span></strong>
                  </div>
                </div>
                <div className={styles.systemMessages}></div>
              </div>

              {/* Transcription System */}
              <div className={`${styles.systemCube} ${styles.transcriptionSystem}`}>
                <div className={styles.systemHeader}>
                  <h3>🎯 אפליקציית תמלול</h3>
                  <p>כלים לתמלול ועיבוד אודיו</p>
                </div>
                <div className={styles.selectAllContainer}>
                  <input 
                    type="checkbox" 
                    id="select-all-transcription"
                    checked={selectAllTranscription}
                    onChange={handleSelectAllTranscription}
                    className={styles.transcriptionCheckbox}
                  />
                  <label htmlFor="select-all-transcription" className={styles.selectAllLabel}>
                    בחר הכל
                  </label>
                </div>
                <div className={styles.systemContent}>
                  {PERMISSIONS.TRANSCRIPTION.map(permission => (
                    <div key={permission.code} className={styles.permissionItem}>
                      <input 
                        type="checkbox" 
                        name="permissions" 
                        value={permission.code}
                        id={`perm-${permission.code.toLowerCase()}`}
                        checked={selectedPermissions.includes(permission.code)}
                        onChange={() => handlePermissionChange(permission.code)}
                        className={styles.transcriptionCheckbox}
                      />
                      <label htmlFor={`perm-${permission.code.toLowerCase()}`}>
                        {permission.name} (₪{permission.price} לחודש)
                      </label>
                    </div>
                  ))}
                  <div className={styles.systemTotal}>
                    <strong>סך הכל תמלול: <span>₪{transcriptionTotal}</span></strong>
                  </div>
                </div>
                <div className={styles.systemMessages}></div>
              </div>
            </div>

            {/* Total and Submit */}
            {grandTotal > 0 && (
              <div className={styles.grandTotalSection}>
                <div className={styles.grandTotal}>
                  <h3>סכום כולל לתשלום: ₪{grandTotal}/חודש</h3>
                  <p>כולל {selectedPermissions.length} הרשאות נבחרות</p>
                </div>
                <button type="submit" className={styles.submitButton}>
                  שלח הזמנה 🚀
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}