'use client';

import React, { useState, useEffect } from 'react';
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
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  onRestore,
  transcriptionId
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<BackupVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<BackupVersion | null>(null);
  const [versionContent, setVersionContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareVersion, setCompareVersion] = useState<BackupVersion | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // For demo, load test backups
      const response = await fetch('http://localhost:5000/dev/test-backup-live');
      const data = await response.json();
      
      if (data.success && data.sessions) {
        // Convert sessions to versions format
        const allVersions: BackupVersion[] = [];
        data.sessions.forEach((session: any, index: number) => {
          session.files.forEach((file: string, fileIndex: number) => {
            allVersions.push({
              id: `${session.sessionId}-${file}`,
              filename: file,
              version: index * 10 + fileIndex + 1,
              created: session.created,
              size: 0,
              blocks_count: 10,
              speakers_count: 3,
              words_count: 150
            });
          });
        });
        setVersions(allVersions);
      } else {
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
    setLoading(true);
    try {
      // For demo, return sample content
      const mockContent = `=== TRANSCRIPTION BACKUP ===
Project: ${version.filename.includes('live') ? 'Live Session' : 'Test Project'}
Transcription: Version ${version.version}
Date: ${version.created}
Version: ${version.version}

=== SPEAKERS ===
J: John (Interviewer)
M: Mary (Interviewee)
${version.speakers_count === 3 ? 'S: Sarah (Guest)' : ''}

=== TRANSCRIPT ===
00:00:00 [J]: זו גרסה ${version.version} של התמלול.
00:00:15 [M]: נכון, זו גרסה ישנה יותר.
${version.blocks_count > 10 ? '00:00:30 [J]: יש כאן יותר תוכן מהגרסה הקודמת.' : ''}

=== METADATA ===
Total Words: ${version.words_count}
Total Blocks: ${version.blocks_count}
Total Speakers: ${version.speakers_count}`;

      setVersionContent(mockContent);
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
    if (selectedVersion && onRestore) {
      if (confirm(`האם אתה בטוח שברצונך לשחזר לגרסה ${selectedVersion.version}?`)) {
        onRestore(selectedVersion);
        onClose();
      }
    }
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
              <h3>תצוגה מקדימה</h3>
              {selectedVersion && (
                <div className="preview-actions">
                  <button className="action-btn compare-btn" onClick={handleCompare}>
                    🔍 השווה
                  </button>
                  <button className="action-btn restore-btn" onClick={handleRestore}>
                    ♻️ שחזר
                  </button>
                </div>
              )}
            </div>
            
            <div className="preview-content">
              {selectedVersion ? (
                <pre className="version-text">{versionContent}</pre>
              ) : (
                <div className="preview-placeholder">
                  בחר גרסה לתצוגה מקדימה
                </div>
              )}
            </div>
            
            {selectedVersion && (
              <div className="preview-footer">
                <span>גודל: {formatSize(selectedVersion.size)}</span>
                <span>קובץ: {selectedVersion.filename}</span>
              </div>
            )}
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
      </div>
    </div>
  );
}