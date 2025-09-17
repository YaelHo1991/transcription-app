'use client';

import React, { useState } from 'react';
import { ShortcutData } from '../types/shortcuts';
import './AddShortcutForm.css';

interface AddShortcutFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (shortcut: string, expansion: string, description?: string, allowOverride?: boolean) => Promise<void>;
  onEdit?: (oldShortcut: string, newShortcut: string, expansion: string, description?: string) => Promise<void>;
  editingShortcut?: { shortcut: string; expansion: string; description?: string };
  existingShortcuts: Set<string>;
  shortcuts: Map<string, ShortcutData>; // Full shortcuts data to check system vs personal
}

export default function AddShortcutForm({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  editingShortcut,
  existingShortcuts,
  shortcuts
}: AddShortcutFormProps) {
  const [shortcut, setShortcut] = useState(editingShortcut?.shortcut || '');
  const [expansion, setExpansion] = useState(editingShortcut?.expansion || '');
  const [description, setDescription] = useState(editingShortcut?.description || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [conflictingShortcut, setConflictingShortcut] = useState<{
    shortcut: string;
    expansion: string;
    source: 'system' | 'user';
  } | null>(null);

  // Reset form when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      if (editingShortcut) {
        setShortcut(editingShortcut.shortcut);
        setExpansion(editingShortcut.expansion);
        setDescription(editingShortcut.description || '');
      } else {
        setShortcut('');
        setExpansion('');
        setDescription('');
      }
      setError('');
    }
  }, [isOpen, editingShortcut]);

  const validate = (): boolean => {
    if (!shortcut.trim()) {
      setError('נא להזין קיצור');
      return false;
    }
    
    if (!expansion.trim()) {
      setError('נא להזין טקסט מלא');
      return false;
    }
    
    if (shortcut.length > 20) {
      setError('הקיצור ארוך מדי (מקסימום 20 תווים)');
      return false;
    }
    
    if (expansion.length > 500) {
      setError('הטקסט המלא ארוך מדי (מקסימום 500 תווים)');
      return false;
    }
    
    // Check for duplicates (only if not editing the same shortcut)
    if (!editingShortcut || editingShortcut.shortcut !== shortcut) {
      if (existingShortcuts.has(shortcut)) {
        const existingShortcutData = shortcuts.get(shortcut);

        // If it's a system shortcut, show override dialog instead of error
        if (existingShortcutData && existingShortcutData.source === 'system') {
          setConflictingShortcut({
            shortcut: shortcut,
            expansion: existingShortcutData.expansion,
            source: 'system'
          });
          setShowOverrideDialog(true);
          return false; // Don't proceed with submit, show dialog instead
        } else {
          // It's a user shortcut, show regular error
          setError('קיצור זה כבר קיים');
          return false;
        }
      }
    }
    
    // Check for invalid characters
    if (!/^[א-תa-zA-Z0-9'\"\-\.\/\\s]+$/.test(shortcut)) {
      setError('הקיצור מכיל תווים לא חוקיים');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (editingShortcut && onEdit) {
        await onEdit(editingShortcut.shortcut, shortcut.trim(), expansion.trim(), description.trim() || undefined);
      } else {
        await onAdd(shortcut.trim(), expansion.trim(), description.trim() || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת הקיצור');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-shortcut-overlay" onClick={onClose}>
      <div className="add-shortcut-form" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h3>{editingShortcut ? 'עריכת קיצור' : 'הוספת קיצור אישי'}</h3>
          <button className="form-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shortcut">קיצור:</label>
            <input
              id="shortcut"
              type="text"
              value={shortcut}
              onChange={e => setShortcut(e.target.value)}
              placeholder="לדוגמה: ע'ד"
              maxLength={20}
              autoFocus
              disabled={loading}
            />
            <span className="char-count">{shortcut.length}/20</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="expansion">טקסט מלא:</label>
            <textarea
              id="expansion"
              value={expansion}
              onChange={e => setExpansion(e.target.value)}
              placeholder="לדוגמה: עורך דין"
              maxLength={500}
              rows={3}
              disabled={loading}
            />
            <span className="char-count">{expansion.length}/500</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">תיאור (אופציונלי):</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="תיאור קצר לקיצור"
              maxLength={100}
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
          
          <div className="form-preview">
            <div className="preview-title">תצוגה מקדימה:</div>
            <div className="preview-content">
              <span className="preview-shortcut">{shortcut || '...'}</span>
              <span className="preview-arrow">←</span>
              <span className="preview-expansion">{expansion || '...'}</span>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={loading}
            >
              ביטול
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading || !shortcut || !expansion}
            >
              {loading ? 'שומר...' : (editingShortcut ? 'עדכן' : 'הוסף')}
            </button>
          </div>
        </form>

        {/* Override Dialog */}
        {showOverrideDialog && conflictingShortcut && (
          <div className="override-dialog-overlay">
            <div className="override-dialog">
              <div className="override-dialog-header">
                <h4>קיצור כבר קיים במערכת</h4>
              </div>

              <div className="override-dialog-content">
                <p>הקיצור <strong>{conflictingShortcut.shortcut}</strong> כבר קיים במערכת:</p>

                <div className="conflict-info">
                  <div className="existing-shortcut">
                    <span className="shortcut-label">מערכת:</span>
                    <span className="shortcut-text">{conflictingShortcut.shortcut} → {conflictingShortcut.expansion}</span>
                  </div>

                  <div className="new-shortcut">
                    <span className="shortcut-label">האישי שלך:</span>
                    <span className="shortcut-text">{shortcut} → {expansion}</span>
                  </div>
                </div>

                <p>איך תרצה להמשיך?</p>
              </div>

              <div className="override-dialog-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowOverrideDialog(false);
                    setConflictingShortcut(null);
                  }}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  className="keep-system-btn"
                  onClick={() => {
                    setShowOverrideDialog(false);
                    setConflictingShortcut(null);
                    setError('לא ניתן להחליף קיצור מערכת. נסה קיצור אחר.');
                  }}
                >
                  השאר מערכת
                </button>
                <button
                  type="button"
                  className="override-btn"
                  onClick={async () => {
                    setShowOverrideDialog(false);
                    setConflictingShortcut(null);
                    setLoading(true);
                    setError('');

                    try {
                      // Add with override flag
                      await onAdd(shortcut.trim(), expansion.trim(), description.trim() || undefined, true);
                      onClose();
                    } catch (err: any) {
                      setError(err.message || 'שגיאה בשמירת הקיצור');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  השתמש בשלי
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}