'use client';

import React, { useState, useEffect } from 'react';
import './MediaLinkModal.css';

interface MediaFile {
  id: string;
  name: string;
  path: string;
  duration?: number;
  size?: number;
  format?: string;
}

interface MediaLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMediaId?: string;
  transcriptionId: string;
  onMediaLinked: (mediaId: string) => void;
}

export default function MediaLinkModal({
  isOpen,
  onClose,
  currentMediaId,
  transcriptionId,
  onMediaLinked
}: MediaLinkModalProps) {
  const [availableMedia, setAvailableMedia] = useState<MediaFile[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string>(currentMediaId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for development
  useEffect(() => {
    if (isOpen) {
      // In production, fetch from API
      const mockMedia: MediaFile[] = [
        { id: 'media-1', name: 'interview_part1.mp3', path: '/media/interview_part1.mp3', duration: 1800, size: 15000000, format: 'mp3' },
        { id: 'media-2', name: 'interview_part2.mp3', path: '/media/interview_part2.mp3', duration: 2400, size: 20000000, format: 'mp3' },
        { id: 'media-3', name: 'meeting_recording.wav', path: '/media/meeting_recording.wav', duration: 3600, size: 50000000, format: 'wav' },
        { id: 'media-4', name: 'podcast_episode.m4a', path: '/media/podcast_episode.m4a', duration: 2700, size: 22500000, format: 'm4a' },
        { id: 'media-5', name: 'lecture_recording.mp3', path: '/media/lecture_recording.mp3', duration: 5400, size: 45000000, format: 'mp3' }
      ];
      setAvailableMedia(mockMedia);
      setSelectedMediaId(currentMediaId || '');
    }
  }, [isOpen, currentMediaId]);

  const filteredMedia = availableMedia.filter(media =>
    media.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleLink = async () => {
    if (!selectedMediaId) {
      setError('אנא בחר קובץ מדיה');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In production, make API call to link media
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      onMediaLinked(selectedMediaId);
      onClose();
    } catch (err) {
      setError('שגיאה בקישור המדיה');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, make API call to unlink media
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      onMediaLinked('');
      setSelectedMediaId('');
      onClose();
    } catch (err) {
      setError('שגיאה בביטול הקישור');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="media-link-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>קישור קובץ מדיה</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="חפש קובץ מדיה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Current Media Info */}
          {currentMediaId && (
            <div className="current-media-info">
              <span className="info-label">מדיה נוכחית:</span>
              <span className="info-value">
                {availableMedia.find(m => m.id === currentMediaId)?.name || 'לא ידוע'}
              </span>
              <button 
                className="unlink-btn"
                onClick={handleUnlink}
                disabled={loading}
              >
                בטל קישור
              </button>
            </div>
          )}

          {/* Media List */}
          <div className="modal-media-list">
            {filteredMedia.length === 0 ? (
              <div className="no-media">לא נמצאו קבצי מדיה</div>
            ) : (
              filteredMedia.map(media => (
                <div
                  key={media.id}
                  className={`modal-media-item ${selectedMediaId === media.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMediaId(media.id)}
                >
                  <div className="modal-media-icon">
                    {media.format === 'mp3' && '🎵'}
                    {media.format === 'wav' && '🎵'}
                    {media.format === 'm4a' && '🎵'}
                    {media.format === 'mp4' && '🎬'}
                    {media.format === 'avi' && '🎬'}
                    {!['mp3', 'wav', 'm4a', 'mp4', 'avi'].includes(media.format || '') && '📁'}
                  </div>
                  <div className="modal-media-details">
                    <div className="modal-media-name">{media.name}</div>
                    <div className="modal-media-meta">
                      {formatDuration(media.duration) && (
                        <span className="modal-media-duration">{formatDuration(media.duration)}</span>
                      )}
                      {formatSize(media.size) && (
                        <span className="modal-media-size">{formatSize(media.size)}</span>
                      )}
                      {media.format && (
                        <span className="modal-media-format">{media.format.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  {selectedMediaId === media.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={loading}
          >
            ביטול
          </button>
          <button 
            className="link-btn"
            onClick={handleLink}
            disabled={loading || !selectedMediaId}
          >
            {loading ? 'מקשר...' : 'קשר מדיה'}
          </button>
        </div>
      </div>
    </div>
  );
}