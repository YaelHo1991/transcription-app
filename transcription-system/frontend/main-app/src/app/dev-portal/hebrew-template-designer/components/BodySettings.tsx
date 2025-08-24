'use client';

import React from 'react';

interface BodySettingsProps {
  settings: {
    alignment: 'right' | 'left' | 'center' | 'justify';
    lineNumbers: boolean;
    lineNumbersCountBy: number;
    lineNumbersStartAt: number;
  };
  onSettingsChange: (settings: any) => void;
}

export default function BodySettings({ settings, onSettingsChange }: BodySettingsProps) {
  const updateSetting = (key: string, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="body-settings">
      <div className="settings-group">
        <h3>יישור טקסט:</h3>
        <div className="alignment-buttons">
          <button
            className={'align-btn ' + (settings.alignment === 'right' ? 'active' : '')}
            onClick={() => updateSetting('alignment', 'right')}
            title="יישור לימין"
          >
            ←
          </button>
          <button
            className={'align-btn ' + (settings.alignment === 'center' ? 'active' : '')}
            onClick={() => updateSetting('alignment', 'center')}
            title="יישור למרכז"
          >
            ≡
          </button>
          <button
            className={'align-btn ' + (settings.alignment === 'left' ? 'active' : '')}
            onClick={() => updateSetting('alignment', 'left')}
            title="יישור לשמאל"
          >
            →
          </button>
          <button
            className={'align-btn ' + (settings.alignment === 'justify' ? 'active' : '')}
            onClick={() => updateSetting('alignment', 'justify')}
            title="יישור לשני הצדדים"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h3>מספור שורות:</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.lineNumbers}
            onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
          />
          <span>הצג מספרי שורות</span>
        </label>
        
        {settings.lineNumbers && (
          <div className="line-numbers-options">
            <div className="control-group">
              <label>ספור כל:</label>
              <input
                type="number"
                value={settings.lineNumbersCountBy}
                onChange={(e) => updateSetting('lineNumbersCountBy', parseInt(e.target.value) || 1)}
                min="1"
                max="10"
              />
              <span className="hint">שורות</span>
            </div>
            
            <div className="control-group">
              <label>התחל מ:</label>
              <input
                type="number"
                value={settings.lineNumbersStartAt}
                onChange={(e) => updateSetting('lineNumbersStartAt', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-info">
        <h4>הסבר:</h4>
        <ul>
          <li><strong>יישור לשני הצדדים</strong> - הטקסט מיושר גם לימין וגם לשמאל (מומלץ לתמלולים)</li>
          <li><strong>מספרי שורות</strong> - מספרים אוטומטיים בצד הדף, מתעדכנים לפי תוכן העמוד</li>
          <li><strong>ספור כל X שורות</strong> - לדוגמה: אם תבחר 5, יופיעו רק 5, 10, 15...</li>
        </ul>
      </div>

      <style jsx>{`
        .body-settings {
          padding: 15px;
        }

        .settings-group {
          margin-bottom: 25px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 6px;
        }

        .settings-group h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #333;
        }

        .alignment-buttons {
          display: flex;
          gap: 10px;
        }

        .align-btn {
          width: 40px;
          height: 40px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .align-btn:hover {
          background: #f0f0f0;
        }

        .align-btn.active {
          background: #2196F3;
          color: white;
          border-color: #2196F3;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .line-numbers-options {
          margin-top: 15px;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .control-group label {
          min-width: 80px;
          font-size: 14px;
          color: #666;
        }

        .control-group input {
          width: 60px;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .hint {
          font-size: 13px;
          color: #999;
        }

        .settings-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin-top: 20px;
        }

        .settings-info h4 {
          margin-top: 0;
          color: #1565C0;
        }

        .settings-info ul {
          margin-bottom: 0;
          padding-right: 20px;
        }

        .settings-info li {
          margin-bottom: 8px;
          font-size: 13px;
          color: #1565C0;
        }
      `}</style>
    </div>
  );
}