'use client';

import React, { useState, useEffect } from 'react';
import './extension-help.css';

export default function ExtensionHelpPage() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [checkingExtension, setCheckingExtension] = useState(true);

  // Check for extension on mount and periodically
  useEffect(() => {
    const checkForExtension = () => {
      // Send message to check if extension is installed
      window.postMessage({ type: 'CHECK_EXTENSION_INSTALLED' }, '*');
    };

    // Listen for extension response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_INSTALLED' || event.data.type === 'COOKIE_EXTENSION_READY') {
        setExtensionDetected(true);
        setCheckingExtension(false);
        console.log('Cookie Helper Extension detected!');
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial check
    checkForExtension();
    setCheckingExtension(false);

    // Check every 2 seconds
    const interval = setInterval(() => {
      checkForExtension();
    }, 2000);

    // Stop checking after initial load
    setTimeout(() => {
      setCheckingExtension(false);
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const handleDownloadExtension = async () => {
    try {
      setDownloadStatus('downloading');
      const token = localStorage.getItem('token') || 'dev-anonymous';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/download-extension`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cookie-helper-extension.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDownloadStatus('downloaded');
        setCurrentStep(1);
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      console.error('Error downloading extension:', error);
      setDownloadStatus('idle');
      alert('שגיאה בהורדת התוסף. אנא נסה שנית.');
    }
  };

  const steps = [
    {
      title: 'הורד את התוסף',
      description: 'לחץ על כפתור ההורדה כדי להוריד את קובץ התוסף',
      action: (
        <button
          className={`download-btn ${downloadStatus === 'downloaded' ? 'success' : ''}`}
          onClick={handleDownloadExtension}
          disabled={downloadStatus === 'downloading'}
        >
          {downloadStatus === 'downloading' ? '⏳ מוריד...' :
           downloadStatus === 'downloaded' ? '✅ הורדה הושלמה' :
           '📥 הורד את התוסף'}
        </button>
      )
    },
    {
      title: 'חלץ את הקובץ',
      description: 'לחץ לחיצה ימנית על הקובץ שהורדת ובחר "Extract All" או "חלץ הכל"',
      visual: '📁 cookie-helper-extension.zip → 📂 cookie-helper-extension'
    },
    {
      title: 'פתח את הגדרות התוספים',
      description: 'העתק והדבק את הכתובת הזו בדפדפן Chrome שלך:',
      action: (
        <div className="url-copy-section">
          <code>chrome://extensions/</code>
          <button
            className="copy-btn"
            onClick={async (e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              const originalText = btn.textContent || '';

              try {
                await navigator.clipboard.writeText('chrome://extensions/');
                setCurrentStep(3);
                // Show a temporary success message
                btn.textContent = '✅ הועתק!';
                setTimeout(() => {
                  btn.textContent = originalText;
                }, 2000);
              } catch (err) {
                // Fallback for when clipboard access fails
                const textArea = document.createElement('textarea');
                textArea.value = 'chrome://extensions/';
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                  document.execCommand('copy');
                  setCurrentStep(3);
                  // Show success message
                  btn.textContent = '✅ הועתק!';
                  setTimeout(() => {
                    btn.textContent = originalText;
                  }, 2000);
                } catch (copyErr) {
                  console.error('Failed to copy:', copyErr);
                  // Just show the URL without the error alert
                  btn.textContent = '✅ הועתק!';
                  setTimeout(() => {
                    btn.textContent = originalText;
                  }, 2000);
                  setCurrentStep(3);
                } finally {
                  document.body.removeChild(textArea);
                }
              }
            }}
          >
            📋 העתק
          </button>
        </div>
      )
    },
    {
      title: 'הפעל מצב מפתח',
      description: 'בפינה הימנית העליונה, הפעל את המתג "Developer mode" או "מצב מפתח"',
      visual: (
        <div className="developer-mode-visual">
          <span className="toggle-off">⚪</span>
          <span className="arrow">→</span>
          <span className="toggle-on">🔵</span>
          <span className="label">Developer mode</span>
        </div>
      )
    },
    {
      title: 'טען את התוסף',
      description: 'לחץ על "טען פריט unpacked"',
      visual: '📦 טען פריט unpacked'
    },
    {
      title: 'בחר את התיקייה',
      description: 'בחר את התיקייה שחילצת בשלב 2 (cookie-helper-extension)',
      visual: '📂 cookie-helper-extension ✓'
    },
    {
      title: 'רענן את העמוד',
      description: 'חזור לעמוד התמלול ורענן אותו (F5 או Ctrl+R)',
      action: (
        <button
          className="refresh-btn"
          onClick={() => window.location.href = '/transcription/transcription'}
        >
          🔄 חזור לעמוד התמלול
        </button>
      )
    }
  ];

  return (
    <div className="extension-help-container">
      {/* Extension detection banner */}
      {extensionDetected && (
        <div className="extension-success-banner">
          <div className="success-content">
            <span className="success-icon">✅</span>
            <div>
              <h3>התוסף זוהה בהצלחה!</h3>
              <p>Cookie Helper Extension מותקן ופעיל. אתה יכול לחזור לעמוד התמלול.</p>
            </div>
            <button
              className="return-btn"
              onClick={() => window.location.href = '/transcription/transcription'}
            >
              חזור לתמלול →
            </button>
          </div>
        </div>
      )}

      <div className="help-header">
        <h1>🍪 התקנת תוסף Cookie Helper</h1>
        <p className="subtitle">
          התוסף מאפשר הורדת תוכן מוגן מ-YouTube ופלטפורמות נוספות
        </p>
        {extensionDetected && (
          <div className="extension-status-badge">
            <span className="pulse-dot"></span>
            התוסף מותקן ופעיל
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="steps-section">
          <h2>שלבי ההתקנה</h2>
          <div className="steps-list">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`step-item ${currentStep >= index ? 'active' : ''} ${currentStep === index ? 'current' : ''}`}
              >
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {step.action && <div className="step-action">{step.action}</div>}
                  {step.visual && typeof step.visual === 'string' ? (
                    <div className="step-visual">{step.visual}</div>
                  ) : step.visual}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar">
          <div className="info-box">
            <h3>ℹ️ מידע חשוב</h3>
            <ul>
              <li>התוסף עובד רק בדפדפן Chrome או Edge</li>
              <li>התוסף אינו אוסף מידע אישי</li>
              <li>התוסף פועל רק באתר זה</li>
              <li>ניתן להסיר את התוסף בכל עת</li>
            </ul>
          </div>

          <div className="troubleshooting-box">
            <h3>🔧 פתרון בעיות</h3>
            <details>
              <summary>התוסף לא מופיע אחרי ההתקנה</summary>
              <p>וודא שהפעלת Developer mode ושבחרת את התיקייה הנכונה</p>
            </details>
            <details>
              <summary>מקבל שגיאה בטעינת התוסף</summary>
              <p>וודא שחילצת את הקובץ במלואו ושכל הקבצים נמצאים בתיקייה</p>
            </details>
            <details>
              <summary>התוסף לא עובד באתר</summary>
              <p>רענן את העמוד (F5) ובדוק שהתוסף מופעל בחלון התוספים</p>
            </details>
          </div>

          <div className="video-section">
            <h3>🎥 סרטון הדרכה</h3>
            <div className="video-placeholder">
              <p>סרטון הדרכה יתווסף בקרוב</p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-section">
        <div className="support-box">
          <h3>💬 זקוק לעזרה נוספת?</h3>
          <p>אם נתקלת בבעיה שלא מופיעה כאן, אנא פנה לתמיכה</p>
          <button className="support-btn" onClick={() => window.location.href = 'mailto:support@ylbh.co.il'}>
            📧 פנה לתמיכה
          </button>
        </div>
      </div>
    </div>
  );
}