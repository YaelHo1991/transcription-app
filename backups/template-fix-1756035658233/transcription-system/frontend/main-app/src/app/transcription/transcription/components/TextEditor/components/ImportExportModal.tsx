'use client';

import React, { useState, useRef } from 'react';
import { ShortcutData } from '../types/shortcuts';
import {
  exportToCSV,
  exportToJSON,
  parseCSV,
  parseJSON,
  parseText,
  validateShortcuts,
  downloadFile
} from '../utils/ImportExportUtils';
import './ImportExportModal.css';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Map<string, ShortcutData>;
  onImport: (shortcuts: Array<{ shortcut: string; expansion: string; description?: string; category?: string }>) => Promise<void>;
  userQuota?: { used: number; max: number };
}

type TabType = 'export' | 'import';
type ExportFormat = 'csv' | 'json' | 'text';

export default function ImportExportModal({
  isOpen,
  onClose,
  shortcuts,
  onImport,
  userQuota
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportPersonalOnly, setExportPersonalOnly] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreview, setImportPreview] = useState<{
    valid: Array<{ shortcut: string; expansion: string; description?: string; category?: string }>;
    duplicates: Array<{ shortcut: string; expansion: string }>;
    invalid: Array<{ shortcut: string; expansion: string; reason: string }>;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get personal shortcuts count
  const personalCount = Array.from(shortcuts.values()).filter(s => s.source === 'user').length;

  // Handle export
  const handleExport = () => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
    const dateStr = new Date().toISOString().split('T')[0];
    
    switch (exportFormat) {
      case 'csv':
        content = exportToCSV(shortcuts, exportPersonalOnly);
        filename = `shortcuts_${dateStr}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'json':
        content = exportToJSON(shortcuts, exportPersonalOnly);
        filename = `shortcuts_${dateStr}.json`;
        mimeType = 'application/json';
        break;
        
      case 'text':
        // Simple text format
        const lines: string[] = [];
        shortcuts.forEach((data, shortcut) => {
          if (exportPersonalOnly && data.source !== 'user') return;
          lines.push(`${shortcut}\t${data.expansion}`);
        });
        content = lines.join('\r\n');
        filename = `shortcuts_${dateStr}.txt`;
        mimeType = 'text/plain';
        break;
    }
    
    downloadFile(content, filename, mimeType);
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setImportError('');
    setImportPreview(null);
    
    try {
      const content = await file.text();
      let parsed: Array<{ shortcut: string; expansion: string; description?: string; category?: string }> = [];
      
      // Parse based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'csv') {
        parsed = await parseCSV(content);
      } else if (ext === 'json') {
        parsed = await parseJSON(content);
      } else if (ext === 'txt' || ext === 'text') {
        parsed = await parseText(content);
      } else {
        // Try to auto-detect format
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          parsed = await parseJSON(content);
        } else if (content.includes(',') && content.split('\n')[0]?.includes(',')) {
          parsed = await parseCSV(content);
        } else {
          parsed = await parseText(content);
        }
      }
      
      // Validate shortcuts
      const validation = validateShortcuts(parsed, shortcuts);
      
      // Check quota
      const remainingQuota = (userQuota?.max || 100) - (userQuota?.used || 0);
      if (validation.valid.length > remainingQuota) {
        setImportError(`לא ניתן לייבא ${validation.valid.length} קיצורים. נותרו ${remainingQuota} מקומות פנויים במכסה`);
        validation.valid = validation.valid.slice(0, remainingQuota);
      }
      
      setImportPreview(validation);
      
    } catch (error: any) {
      setImportError(error.message || 'שגיאה בקריאת הקובץ');
    } finally {
      setImporting(false);
    }
  };

  // Handle import confirmation
  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.valid.length === 0) return;
    
    setImporting(true);
    setImportError('');
    
    try {
      await onImport(importPreview.valid);
      onClose();
    } catch (error: any) {
      setImportError(error.message || 'שגיאה בייבוא הקיצורים');
    } finally {
      setImporting(false);
    }
  };

  // Reset state when closing
  React.useEffect(() => {
    if (!isOpen) {
      setImportPreview(null);
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="import-export-overlay" onClick={onClose}>
      <div className="import-export-modal" onClick={e => e.stopPropagation()}>
        <div className="import-export-header">
          <h2>ייבוא וייצוא קיצורים</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="import-export-tabs">
          <button
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            ייצוא קיצורים
          </button>
          <button
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            ייבוא קיצורים
          </button>
        </div>

        <div className="import-export-content">
          {activeTab === 'export' ? (
            <div className="export-section">
              <div className="export-options">
                <div className="option-group">
                  <label>פורמט ייצוא:</label>
                  <div className="format-buttons">
                    <button
                      className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                      onClick={() => setExportFormat('csv')}
                    >
                      CSV (Excel)
                    </button>
                    <button
                      className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
                      onClick={() => setExportFormat('json')}
                    >
                      JSON
                    </button>
                    <button
                      className={`format-btn ${exportFormat === 'text' ? 'active' : ''}`}
                      onClick={() => setExportFormat('text')}
                    >
                      טקסט פשוט
                    </button>
                  </div>
                </div>

                <div className="option-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportPersonalOnly}
                      onChange={e => setExportPersonalOnly(e.target.checked)}
                    />
                    <span>ייצא רק קיצורים אישיים ({personalCount} קיצורים)</span>
                  </label>
                </div>
              </div>

              <div className="export-info">
                <div className="info-box">
                  <h4>מה יכלול הקובץ?</h4>
                  <ul>
                    {exportFormat === 'csv' && (
                      <>
                        <li>קובץ CSV שניתן לפתוח ב-Excel</li>
                        <li>עמודות: קיצור, טקסט מלא, תיאור, קטגוריה</li>
                        <li>תמיכה מלאה בעברית</li>
                      </>
                    )}
                    {exportFormat === 'json' && (
                      <>
                        <li>קובץ JSON מובנה</li>
                        <li>כולל מטה-דאטה (תאריך, גרסה)</li>
                        <li>מתאים לגיבוי ושחזור</li>
                      </>
                    )}
                    {exportFormat === 'text' && (
                      <>
                        <li>קובץ טקסט פשוט</li>
                        <li>פורמט: קיצור [TAB] טקסט מלא</li>
                        <li>קל לעריכה ידנית</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <div className="export-actions">
                <button className="export-btn" onClick={handleExport}>
                  <span className="export-icon">💾</span>
                  ייצא קיצורים
                </button>
              </div>
            </div>
          ) : (
            <div className="import-section">
              <div className="import-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt,.text"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                <button 
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <span className="upload-icon">📁</span>
                  בחר קובץ לייבוא
                </button>
                
                <div className="supported-formats">
                  <small>פורמטים נתמכים: CSV, JSON, TXT</small>
                </div>
              </div>

              {importError && (
                <div className="import-error">
                  {importError}
                </div>
              )}

              {importPreview && (
                <div className="import-preview">
                  <h4>תצוגה מקדימה:</h4>
                  
                  {importPreview.valid.length > 0 && (
                    <div className="preview-section valid">
                      <div className="preview-header">
                        <span className="preview-icon">✅</span>
                        <span>{importPreview.valid.length} קיצורים תקינים</span>
                      </div>
                      <div className="preview-list">
                        {importPreview.valid.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="preview-item">
                            <span className="preview-shortcut">{item.shortcut}</span>
                            <span className="preview-arrow">←</span>
                            <span className="preview-expansion">{item.expansion}</span>
                          </div>
                        ))}
                        {importPreview.valid.length > 5 && (
                          <div className="preview-more">
                            ועוד {importPreview.valid.length - 5} קיצורים...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {importPreview.duplicates.length > 0 && (
                    <div className="preview-section duplicates">
                      <div className="preview-header">
                        <span className="preview-icon">⚠️</span>
                        <span>{importPreview.duplicates.length} כפילויות (ידלגו)</span>
                      </div>
                      <div className="preview-list">
                        {importPreview.duplicates.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="preview-item">
                            <span className="preview-shortcut">{item.shortcut}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importPreview.invalid.length > 0 && (
                    <div className="preview-section invalid">
                      <div className="preview-header">
                        <span className="preview-icon">❌</span>
                        <span>{importPreview.invalid.length} שגויים</span>
                      </div>
                      <div className="preview-list">
                        {importPreview.invalid.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="preview-item">
                            <span className="preview-shortcut">{item.shortcut}</span>
                            <span className="preview-reason">({item.reason})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importPreview.valid.length > 0 && (
                    <div className="import-confirm">
                      <button 
                        className="confirm-btn"
                        onClick={handleImportConfirm}
                        disabled={importing}
                      >
                        {importing ? 'מייבא...' : `ייבא ${importPreview.valid.length} קיצורים`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="import-info">
                <div className="info-box">
                  <h4>הוראות ייבוא:</h4>
                  <ul>
                    <li>הקובץ צריך להכיל לפחות עמודות: קיצור וטקסט מלא</li>
                    <li>קיצורים כפולים ידלגו אוטומטית</li>
                    <li>מכסה אישית: {userQuota?.used || 0} / {userQuota?.max || 100} בשימוש</li>
                    <li>ניתן לייבא עד {(userQuota?.max || 100) - (userQuota?.used || 0)} קיצורים נוספים</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}