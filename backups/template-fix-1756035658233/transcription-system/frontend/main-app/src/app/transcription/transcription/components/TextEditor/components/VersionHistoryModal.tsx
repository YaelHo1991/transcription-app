'use client';

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../../../config/environment';
import './VersionHistoryModal.css';

interface BackupVersion {
  id: string;
  filename: string;
  version: number;
  created: string;
  size: number;
  blocks_count?: number;
  speakers_count?: number;
  words_count?: number;
  preview?: string;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (version: BackupVersion) => void;
  transcriptionId?: string;
  mediaId?: string;
  transcriptionNumber?: number;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  onRestore,
  transcriptionId,
  mediaId,
  transcriptionNumber
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<BackupVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<BackupVersion | null>(null);
  const [versionContent, setVersionContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareVersion, setCompareVersion] = useState<BackupVersion | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<BackupVersion | null>(null);
  
  // Extract media name from mediaId (format: 0-0-filename.mp3)
  const mediaName = mediaId ? mediaId.replace(/^0-0-/, '') : '';

  useEffect(() => {
    if (isOpen && mediaId && transcriptionNumber) {
      loadVersions();
    }
  }, [isOpen, mediaId, transcriptionNumber]);

  const loadVersions = async () => {
    if (!mediaId) {
      console.log('[VersionHistory] No mediaId/projectId provided');
      return;
    }
    
    console.log('[VersionHistory] Loading versions for project:', mediaId);
    setLoading(true);
    try {
      // Load backups from project service
      const response = await fetch(
        `${getApiUrl()}/api/projects/${mediaId}/backups`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-Mode': 'true'
          }
        }
      );
      
      console.log('[VersionHistory] Response status:', response.status);
      const data = await response.json();
      console.log('[VersionHistory] Response data:', data);
      
      if (data.success && data.backups) {
        // Convert backup format to version format
        const versions = data.backups.map((backup: any, index: number) => ({
          id: backup.file,
          filename: backup.file,
          version: data.backups.length - index,
          created: backup.timestamp,
          size: backup.size || 2000,
          blocks_count: backup.blocks?.length || 0,
          speakers_count: backup.speakers?.length || 0,
          words_count: 0
        }));
        setVersions(versions);
      } else if (!data.success || data.backups?.length === 0) {
        // Create mock versions for demo
        setVersions([
          {
            id: '1',
            filename: 'v3_2025-08-17T07-00-00.txt',
            version: 3,
            created: new Date(Date.now() - 3600000).toISOString(),
            size: 2048,
            blocks_count: 15,
            speakers_count: 3,
            words_count: 280
          },
          {
            id: '2',
            filename: 'v2_2025-08-17T06-00-00.txt',
            version: 2,
            created: new Date(Date.now() - 7200000).toISOString(),
            size: 1800,
            blocks_count: 12,
            speakers_count: 2,
            words_count: 220
          },
          {
            id: '3',
            filename: 'v1_2025-08-17T05-00-00.txt',
            version: 1,
            created: new Date(Date.now() - 10800000).toISOString(),
            size: 1500,
            blocks_count: 10,
            speakers_count: 2,
            words_count: 180
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      // Use mock data on error
      setVersions([
        {
          id: '1',
          filename: 'v1_2025-08-17T07-00-00.txt',
          version: 1,
          created: new Date().toISOString(),
          size: 1700,
          blocks_count: 10,
          speakers_count: 3,
          words_count: 150
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionContent = async (version: BackupVersion) => {
    if (!mediaId) return; // mediaId is now projectId
    
    setLoading(true);
    try {
      // Load backup content from project service
      const response = await fetch(
        `${getApiUrl()}/api/projects/${mediaId}/backups/${version.filename}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-Mode': 'true'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Format content for preview
        let content = '=== תצוגה מקדימה ===\n\n';
        
        if (data.speakers && data.speakers.length > 0) {
          content += '=== דוברים ===\n';
          data.speakers.forEach((s: any) => {
            content += `${s.code}: ${s.name}\n`;
          });
          content += '\n';
        }
        
        if (data.blocks && data.blocks.length > 0) {
          content += '=== תמלול ===\n';
          data.blocks.forEach((block: any) => {
            const timestamp = block.timestamp || '';
            const speaker = block.speaker ? `[${block.speaker}]` : '';
            const prefix = timestamp || speaker ? `${timestamp} ${speaker}: ` : '';
            content += `${prefix}${block.text || ''}\n`;
          });
          content += '\n';
        }
        
        content += `=== מידע ===\n`;
        content += `בלוקים: ${data.blocks?.length || 0}\n`;
        content += `דוברים: ${data.speakers?.length || 0}\n`;
        content += `מילים: ${data.metadata?.totalWords || 0}`;
        
        setVersionContent(content);
      } else {
        setVersionContent('שגיאה בטעינת התוכן');
      }
    } catch (error) {
      console.error('Failed to load version content:', error);
      setVersionContent('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version: BackupVersion) => {
    setSelectedVersion(version);
    loadVersionContent(version);
  };

  const handleRestore = () => {
    if (selectedVersion) {
      setPendingVersion(selectedVersion);
      setShowConfirmModal(true);
    }
  };
  
  const confirmRestore = () => {
    if (pendingVersion && onRestore) {
      onRestore(pendingVersion);
      setShowConfirmModal(false);
      setPendingVersion(null);
      onClose();
    }
  };
  
  const cancelRestore = () => {
    setShowConfirmModal(false);
    setPendingVersion(null);
  };

  const handleCompare = () => {
    if (selectedVersion) {
      setComparing(true);
      setCompareVersion(selectedVersion);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredVersions = versions.filter(v => 
    v.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.version.toString().includes(searchTerm)
  );

  const groupVersionsByDate = () => {
    const groups: { [key: string]: BackupVersion[] } = {};
    
    filteredVersions.forEach(version => {
      const date = new Date(version.created);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'היום';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'אתמול';
      } else {
        groupKey = date.toLocaleDateString('he-IL');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(version);
    });
    
    return groups;
  };

  if (!isOpen) return null;

  const versionGroups = groupVersionsByDate();

  return (
    <div className="version-history-modal-overlay" onClick={onClose}>
      <div className="version-history-modal" onClick={e => e.stopPropagation()}>
        <div className="version-history-header">
          <h2>היסטוריית גרסאות</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="version-history-search">
          <input
            type="text"
            placeholder="חפש גרסה..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="version-history-content">
          <div className="version-list">
            <h3>רשימת גרסאות</h3>
            {loading && <div className="loading">טוען...</div>}
            
            {Object.entries(versionGroups).map(([date, versions]) => (
              <div key={date} className="version-group">
                <div className="version-group-header">{date}</div>
                {versions.map(version => (
                  <div
                    key={version.id}
                    className={`version-item ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                    onClick={() => handleVersionClick(version)}
                  >
                    <div className="version-main">
                      <span className="version-number">גרסה {version.version}</span>
                      <span className="version-time">{formatDate(version.created)}</span>
                    </div>
                    <div className="version-stats">
                      <span className="stat">📝 {version.blocks_count} בלוקים</span>
                      <span className="stat">👥 {version.speakers_count} דוברים</span>
                      <span className="stat">📄 {version.words_count} מילים</span>
                    </div>
                    {comparing && compareVersion?.id === version.id && (
                      <div className="compare-badge">להשוואה</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            {filteredVersions.length === 0 && !loading && (
              <div className="no-versions">אין גרסאות זמינות</div>
            )}
          </div>

          <div className="version-preview">
            <div className="preview-header">
              <h3>
                תצוגה מקדימה
                {mediaName && (
                  <span className="preview-title-media"> - {mediaName}</span>
                )}
              </h3>
              {selectedVersion && (
                <div className="preview-actions">
                  <button className="action-btn compare-btn" onClick={handleCompare}>
                    🔍 השווה
                  </button>
                  <button className="load-version-btn-header" onClick={handleRestore}>
                    <span className="btn-icon">📥</span>
                    <span className="btn-text">טען גרסה זו</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="preview-content">
              {selectedVersion ? (
                <div className="preview-layout">
                  <div className="preview-sidebar">
                    <div className="sidebar-section">
                      <h4>📊 פרטי גרסה</h4>
                      <div className="info-item">
                        <span className="info-label">גרסה:</span>
                        <span className="info-value">{selectedVersion.version}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">תאריך:</span>
                        <span className="info-value">{formatDate(selectedVersion.timestamp)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">גודל:</span>
                        <span className="info-value">{formatSize(selectedVersion.size)}</span>
                      </div>
                    </div>
                    
                    <div className="sidebar-section">
                      <h4>👥 דוברים</h4>
                      <div className="speakers-list">
                        {versionContent && versionContent.includes('דוברים:') ? 
                          <div className="info-item">
                            <span className="info-value">
                              {versionContent.match(/דוברים: (\d+)/)?.[1] || '0'} דוברים
                            </span>
                          </div>
                        : <span className="info-value">אין מידע</span>}
                      </div>
                    </div>
                    
                    <div className="sidebar-section">
                      <h4>📝 סטטיסטיקה</h4>
                      <div className="info-item">
                        <span className="info-label">בלוקים:</span>
                        <span className="info-value">{selectedVersion.blocks_count || 0}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">מילים:</span>
                        <span className="info-value">{selectedVersion.words_count || 0}</span>
                      </div>
                    </div>
                    
                    {versionContent && versionContent.includes('הערות:') && (
                      <div className="sidebar-section">
                        <h4>💬 הערות</h4>
                        <div className="remarks-preview">
                          {versionContent.match(/הערות: (\d+)/)?.[1] || '0'} הערות
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="preview-main">
                    <div className="preview-document">
                      {versionContent ? (
                        versionContent.split('\n').map((line, index) => {
                          // Skip metadata lines for main view
                          if (line.startsWith('===') || line.includes('דוברים:') || line.includes('בלוקים:') || line.includes('הערות:')) {
                            return null;
                          }
                          
                          // Parse speaker and text
                          const speakerMatch = line.match(/^(\[.*?\]):\s*(.*)/);
                          if (speakerMatch) {
                            return (
                              <div key={index} className="preview-block">
                                <span className="preview-speaker">{speakerMatch[1]}</span>
                                <span className="preview-text">{speakerMatch[2]}</span>
                              </div>
                            );
                          }
                          
                          // Regular text
                          return line.trim() ? (
                            <div key={index} className="preview-line">
                              {line}
                            </div>
                          ) : null;
                        })
                      ) : (
                        <div className="preview-empty">אין תוכן להצגה</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-icon">📄</div>
                  <div className="placeholder-text">בחר גרסה לתצוגה מקדימה</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {comparing && compareVersion && selectedVersion && compareVersion.id !== selectedVersion.id && (
          <div className="compare-panel">
            <div className="compare-header">
              <h3>השוואה בין גרסאות</h3>
              <button onClick={() => setComparing(false)}>סגור השוואה</button>
            </div>
            <div className="compare-content">
              <div className="compare-side">
                <h4>גרסה {compareVersion.version}</h4>
                <div className="compare-stats">
                  <span>📝 {compareVersion.blocks_count} בלוקים</span>
                  <span>👥 {compareVersion.speakers_count} דוברים</span>
                </div>
              </div>
              <div className="compare-arrow">→</div>
              <div className="compare-side">
                <h4>גרסה {selectedVersion.version}</h4>
                <div className="compare-stats">
                  <span>📝 {selectedVersion.blocks_count} בלוקים</span>
                  <span>👥 {selectedVersion.speakers_count} דוברים</span>
                </div>
              </div>
            </div>
            <div className="compare-diff">
              <div className="diff-added">+ {(selectedVersion.blocks_count || 0) - (compareVersion.blocks_count || 0)} בלוקים נוספו</div>
              <div className="diff-changed">~ {(selectedVersion.words_count || 0) - (compareVersion.words_count || 0)} מילים השתנו</div>
            </div>
          </div>
        )}
        
        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="confirm-modal-overlay" onClick={cancelRestore}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="confirm-header">
                <h3>אישור טעינת גרסה</h3>
              </div>
              <div className="confirm-content">
                <p>האם אתה בטוח שברצונך לטעון גרסה {pendingVersion?.version}?</p>
                <p className="confirm-warning">פעולה זו תחליף את התמלול הנוכחי.</p>
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn cancel-btn" onClick={cancelRestore}>
                  ביטול
                </button>
                <button className="confirm-btn confirm-btn-primary" onClick={confirmRestore}>
                  טען גרסה
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}