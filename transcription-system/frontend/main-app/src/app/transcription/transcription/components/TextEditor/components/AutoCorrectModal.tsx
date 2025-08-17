'use client';

import React, { useState, useEffect } from 'react';
import './AutoCorrectModal.css';

export interface AutoCorrectSettings {
  blockDuplicateSpeakers: boolean;
  requirePunctuation: boolean;
  preventDoubleSpace: boolean;
  fixSpaceBeforePunctuation: boolean;
  validateParentheses: boolean;
  validateQuotes: boolean;
  autoCapitalize: boolean;
  fixNumberFormatting: boolean;
}

interface AutoCorrectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoCorrectSettings;
  onSettingsChange: (settings: AutoCorrectSettings) => void;
}

export default function AutoCorrectModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}: AutoCorrectModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = (key: keyof AutoCorrectSettings) => {
    const newSettings = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="autocorrect-modal-overlay" onClick={onClose}>
      <div className="autocorrect-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>הגדרות תיקון אוטומטי</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <h3>בלוקים ודוברים</h3>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.blockDuplicateSpeakers}
                onChange={() => handleToggle('blockDuplicateSpeakers')}
              />
              <div className="setting-info">
                <span className="setting-title">חסום דוברים כפולים</span>
                <span className="setting-description">
                  מונע יצירת בלוק חדש אם הדובר זהה לבלוק הקודם
                </span>
              </div>
            </label>
          </div>

          <div className="settings-section">
            <h3>פיסוק וסימנים</h3>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.requirePunctuation}
                onChange={() => handleToggle('requirePunctuation')}
              />
              <div className="setting-info">
                <span className="setting-title">חייב פיסוק בסוף משפט</span>
                <span className="setting-description">
                  חוסם מעבר לבלוק הבא אם המשפט מסתיים באות ללא פיסוק
                </span>
              </div>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.fixSpaceBeforePunctuation}
                onChange={() => handleToggle('fixSpaceBeforePunctuation')}
              />
              <div className="setting-info">
                <span className="setting-title">תקן רווח לפני פיסוק</span>
                <span className="setting-description">
                  מסיר רווח לפני נקודה, פסיק, נקודתיים וכו' (צמוד למילה)
                </span>
              </div>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.validateParentheses}
                onChange={() => handleToggle('validateParentheses')}
              />
              <div className="setting-info">
                <span className="setting-title">בדוק סוגריים</span>
                <span className="setting-description">
                  חוסם מעבר לבלוק הבא אם יש סוגריים פתוחים ללא סגירה
                </span>
              </div>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.validateQuotes}
                onChange={() => handleToggle('validateQuotes')}
              />
              <div className="setting-info">
                <span className="setting-title">בדוק מרכאות</span>
                <span className="setting-description">
                  חוסם מעבר לבלוק הבא אם יש מרכאות פתוחות ללא סגירה
                </span>
              </div>
            </label>
          </div>

          <div className="settings-section">
            <h3>עיצוב טקסט</h3>
            
            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.preventDoubleSpace}
                onChange={() => handleToggle('preventDoubleSpace')}
              />
              <div className="setting-info">
                <span className="setting-title">מנע רווח כפול</span>
                <span className="setting-description">
                  הופך רווחים כפולים לרווח בודד אוטומטית
                </span>
              </div>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.autoCapitalize}
                onChange={() => handleToggle('autoCapitalize')}
              />
              <div className="setting-info">
                <span className="setting-title">אות גדולה אוטומטית</span>
                <span className="setting-description">
                  מתחיל משפט חדש באות גדולה באנגלית
                </span>
              </div>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={localSettings.fixNumberFormatting}
                onChange={() => handleToggle('fixNumberFormatting')}
              />
              <div className="setting-info">
                <span className="setting-title">תקן פורמט מספרים</span>
                <span className="setting-description">
                  מוסיף פסיקים למספרים גדולים (1,000)
                </span>
              </div>
            </label>
          </div>

          <div className="modal-footer">
            <button className="btn-apply" onClick={onClose}>
              החל
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}