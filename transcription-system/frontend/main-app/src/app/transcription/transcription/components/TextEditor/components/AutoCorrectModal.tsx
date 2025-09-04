'use client';

import React, { useState, useEffect } from 'react';
import './AutoCorrectModal.css';

// Define action types for each rule
export type RuleAction = 'enabled' | 'disabled';
export type NotificationMode = 'block' | 'notify';

// Define punctuation marks
export const PUNCTUATION_MARKS = {
  period: { symbol: '.', name: 'נקודה', enabled: true },
  comma: { symbol: ',', name: 'פסיק', enabled: true },
  semicolon: { symbol: ';', name: 'נקודה-פסיק', enabled: true },
  colon: { symbol: ':', name: 'נקודתיים', enabled: true },
  question: { symbol: '?', name: 'סימן שאלה', enabled: true },
  exclamation: { symbol: '!', name: 'סימן קריאה', enabled: true },
  dash: { symbol: '-', name: 'מקף', enabled: false },
  ellipsis: { symbol: '…', name: 'שלוש נקודות', enabled: true },
  hebrewQuote: { symbol: '״', name: 'מרכאות עבריות', enabled: true },
  englishQuote: { symbol: '"', name: 'מרכאות אנגליות', enabled: true },
  parenthesisClose: { symbol: ')', name: 'סוגריים סגורים', enabled: true },
  bracketClose: { symbol: ']', name: 'סוגריים מרובעים', enabled: true },
  curlyClose: { symbol: '}', name: 'סוגריים מסולסלים', enabled: true },
};

export interface PunctuationSettings {
  [key: string]: boolean;
}

export interface AutoCorrectSettings {
  // Rules with action type
  blockDuplicateSpeakers: RuleAction;
  requirePunctuation: RuleAction;
  preventDoubleSpace: RuleAction;
  fixSpaceBeforePunctuation: RuleAction;
  validateParentheses: RuleAction;
  validateQuotes: RuleAction;
  autoCapitalize: RuleAction;
  fixNumberFormatting: RuleAction;
  
  // Notification mode for each rule (only applies when enabled)
  blockDuplicateSpeakersMode: NotificationMode;
  requirePunctuationMode: NotificationMode;
  preventDoubleSpaceMode: NotificationMode;
  fixSpaceBeforePunctuationMode: NotificationMode;
  validateParenthesesMode: NotificationMode;
  validateQuotesMode: NotificationMode;
  autoCapitalizeMode: NotificationMode;
  fixNumberFormattingMode: NotificationMode;
  
  // Punctuation settings
  validEndingPunctuation: PunctuationSettings;
  punctuationForSpaceFix: PunctuationSettings;
}

// Default settings
export const DEFAULT_SETTINGS: AutoCorrectSettings = {
  blockDuplicateSpeakers: 'enabled',
  requirePunctuation: 'enabled',
  preventDoubleSpace: 'enabled',
  fixSpaceBeforePunctuation: 'enabled',
  validateParentheses: 'enabled',
  validateQuotes: 'enabled',
  autoCapitalize: 'disabled',
  fixNumberFormatting: 'disabled',
  
  blockDuplicateSpeakersMode: 'block',
  requirePunctuationMode: 'notify',
  preventDoubleSpaceMode: 'block',
  fixSpaceBeforePunctuationMode: 'block',
  validateParenthesesMode: 'notify',
  validateQuotesMode: 'notify',
  autoCapitalizeMode: 'block',
  fixNumberFormattingMode: 'block',
  
  validEndingPunctuation: Object.keys(PUNCTUATION_MARKS).reduce((acc, key) => ({
    ...acc,
    [key]: PUNCTUATION_MARKS[key as keyof typeof PUNCTUATION_MARKS].enabled
  }), {}),
  
  punctuationForSpaceFix: Object.keys(PUNCTUATION_MARKS).reduce((acc, key) => ({
    ...acc,
    [key]: PUNCTUATION_MARKS[key as keyof typeof PUNCTUATION_MARKS].enabled
  }), {}),
};

interface AutoCorrectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoCorrectSettings;
  onSettingsChange: (settings: AutoCorrectSettings) => void;
  onSaveSettings?: (settings: AutoCorrectSettings) => Promise<void>;
}

export default function AutoCorrectModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onSaveSettings
}: AutoCorrectModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleActionChange = (key: keyof AutoCorrectSettings, action: RuleAction | NotificationMode) => {
    const newSettings = { ...localSettings, [key]: action };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
    saveSettingsToServer(newSettings);
  };

  const handlePunctuationToggle = (category: 'validEndingPunctuation' | 'punctuationForSpaceFix', punctKey: string) => {
    const newSettings = {
      ...localSettings,
      [category]: {
        ...localSettings[category],
        [punctKey]: !localSettings[category][punctKey]
      }
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
    saveSettingsToServer(newSettings);
  };

  const toggleAllPunctuation = (category: 'validEndingPunctuation' | 'punctuationForSpaceFix', enabled: boolean) => {
    const newSettings = {
      ...localSettings,
      [category]: Object.keys(PUNCTUATION_MARKS).reduce((acc, key) => ({
        ...acc,
        [key]: enabled
      }), {})
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
    saveSettingsToServer(newSettings);
  };

  const saveSettingsToServer = async (newSettings: AutoCorrectSettings) => {
    if (onSaveSettings) {
      setIsSaving(true);
      try {
        await onSaveSettings(newSettings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const renderRuleControl = (
    ruleKey: string,
    isEnabled: boolean
  ) => {
    const modeKey = `${ruleKey}Mode` as keyof AutoCorrectSettings;
    const mode = localSettings[modeKey] as NotificationMode;
    
    return (
      <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
        {/* Enable/Disable Toggle */}
        <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => handleActionChange(ruleKey as keyof AutoCorrectSettings, isEnabled ? 'disabled' : 'enabled')}
            style={{width: '18px', height: '18px', cursor: 'pointer'}}
          />
          <span style={{fontSize: '14px'}}>{isEnabled ? 'פעיל' : 'כבוי'}</span>
        </label>
        
        {/* Notification Mode Dropdown (only show when enabled) */}
        {isEnabled && (
          <select
            value={mode}
            onChange={(e) => handleActionChange(modeKey, e.target.value as NotificationMode)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #1a5d5d',
              background: 'white',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="block">חסום</option>
            <option value="notify">הודעה</option>
          </select>
        )}
      </div>
    );
  };
  
  const renderActionButtons = (
    key: keyof AutoCorrectSettings,
    currentValue: RuleAction
  ) => (
    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
      <button 
        style={{
          width: '32px', 
          height: '32px', 
          borderRadius: '6px',
          border: '2px solid #1a5d5d',
          background: currentValue === 'enabled' ? '#1a5d5d' : 'white',
          color: currentValue === 'enabled' ? 'white' : '#1a5d5d',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          margin: '0',
          padding: '0'
        }}
        onClick={() => handleActionChange(key, 'notify')}
        title="הודעה"
      >
        !
      </button>
      <button 
        style={{
          width: '32px', 
          height: '32px', 
          borderRadius: '6px',
          border: '2px solid #1a5d5d',
          background: currentValue === 'disabled' ? '#1a5d5d' : 'white',
          color: currentValue === 'disabled' ? 'white' : '#1a5d5d',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          margin: '0',
          padding: '0'
        }}
        onClick={() => handleActionChange(key, 'disabled')}
        title="כבוי"
      >
        —
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="autocorrect-modal-overlay" onClick={onClose}>
      <div className="autocorrect-modal enhanced" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>הגדרות תיקון אוטומטי</h2>
          {isSaving && <span className="saving-indicator">שומר...</span>}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <h3>בלוקים ודוברים</h3>
            
            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">חסום דוברים כפולים</span>
                <span className="setting-description">
                  מונע יצירת בלוק חדש אם הדובר זהה לבלוק הקודם
                </span>
              </div>
              {renderRuleControl('blockDuplicateSpeakers', localSettings.blockDuplicateSpeakers === 'enabled')}
            </div>
          </div>

          <div className="settings-section">
            <h3>פיסוק וסימנים</h3>
            
            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">חייב פיסוק בסוף משפט</span>
                <span className="setting-description">
                  בודק אם המשפט מסתיים באות ללא פיסוק
                </span>
              </div>
              {renderRuleControl('requirePunctuation', localSettings.requirePunctuation === 'enabled')}
            </div>

            {localSettings.requirePunctuation !== 'disabled' && (
              <div className="punctuation-selection">
                <h4>סימני פיסוק תקינים לסיום משפט:</h4>
                <div className="punctuation-controls">
                  <button 
                    className="select-all-btn"
                    onClick={() => toggleAllPunctuation('validEndingPunctuation', true)}
                  >
                    בחר הכל
                  </button>
                  <button 
                    className="select-none-btn"
                    onClick={() => toggleAllPunctuation('validEndingPunctuation', false)}
                  >
                    נקה הכל
                  </button>
                </div>
                <div className="punctuation-grid">
                  {Object.entries(PUNCTUATION_MARKS).map(([key, mark]) => (
                    <label key={key} className="punctuation-item">
                      <input
                        type="checkbox"
                        checked={localSettings.validEndingPunctuation[key] || false}
                        onChange={() => handlePunctuationToggle('validEndingPunctuation', key)}
                      />
                      <span className="punct-symbol">{mark.symbol}</span>
                      <span className="punct-name">{mark.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">תקן רווח לפני פיסוק</span>
                <span className="setting-description">
                  מסיר רווח לפני סימני פיסוק (צמוד למילה)
                </span>
              </div>
              {renderRuleControl('fixSpaceBeforePunctuation', localSettings.fixSpaceBeforePunctuation === 'enabled')}
            </div>

            {localSettings.fixSpaceBeforePunctuation !== 'disabled' && (
              <div className="punctuation-selection">
                <h4>סימני פיסוק לתיקון רווחים:</h4>
                <div className="punctuation-controls">
                  <button 
                    className="select-all-btn"
                    onClick={() => toggleAllPunctuation('punctuationForSpaceFix', true)}
                  >
                    בחר הכל
                  </button>
                  <button 
                    className="select-none-btn"
                    onClick={() => toggleAllPunctuation('punctuationForSpaceFix', false)}
                  >
                    נקה הכל
                  </button>
                </div>
                <div className="punctuation-grid">
                  {Object.entries(PUNCTUATION_MARKS).map(([key, mark]) => (
                    <label key={key} className="punctuation-item">
                      <input
                        type="checkbox"
                        checked={localSettings.punctuationForSpaceFix[key] || false}
                        onChange={() => handlePunctuationToggle('punctuationForSpaceFix', key)}
                      />
                      <span className="punct-symbol">{mark.symbol}</span>
                      <span className="punct-name">{mark.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">בדוק איזון סוגריים</span>
                <span className="setting-description">
                  מוודא שכל סוגריים פתוחים נסגרים כראוי
                </span>
              </div>
              {renderRuleControl('validateParentheses', localSettings.validateParentheses === 'enabled')}
            </div>

            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">בדוק מרכאות</span>
                <span className="setting-description">
                  מוודא שמרכאות נפתחות ונסגרות כראוי
                </span>
              </div>
              {renderRuleControl('validateQuotes', localSettings.validateQuotes === 'enabled')}
            </div>
          </div>

          <div className="settings-section">
            <h3>עיצוב טקסט</h3>
            
            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">מנע רווחים כפולים</span>
                <span className="setting-description">
                  מחליף רווחים כפולים ברווח בודד
                </span>
              </div>
              {renderRuleControl('preventDoubleSpace', localSettings.preventDoubleSpace === 'enabled')}
            </div>

            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">אותיות גדולות אוטומטיות</span>
                <span className="setting-description">
                  הופך אות ראשונה במשפט לאות גדולה (אנגלית)
                </span>
              </div>
              {renderRuleControl('autoCapitalize', localSettings.autoCapitalize === 'enabled')}
            </div>

            <div className="setting-item-enhanced">
              <div className="setting-info">
                <span className="setting-title">תקן פורמט מספרים</span>
                <span className="setting-description">
                  מתקן פורמט של מספרים ופסיקים
                </span>
              </div>
              {renderRuleControl('fixNumberFormatting', localSettings.fixNumberFormatting === 'enabled')}
            </div>
          </div>
        </div>
        
        <div className="modal-footer" style={{
          padding: '15px 20px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{fontSize: '12px', color: '#666'}}>
            {isSaving ? 'שומר הגדרות...' : 'הגדרות נשמרות אוטומטית'}
          </div>
          <button
            style={{
              background: 'linear-gradient(135deg, #1a5d5d 0%, #20c997 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={onClose}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 93, 93, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}