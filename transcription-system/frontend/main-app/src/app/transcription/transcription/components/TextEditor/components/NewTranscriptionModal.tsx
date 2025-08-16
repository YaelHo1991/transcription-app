'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NewTranscriptionModal.css';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface MediaFile {
  id: string;
  file_name: string;
  external_url?: string;
  file_path?: string;
}

interface NewTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionCreated: (transcription: any) => void;
}

export default function NewTranscriptionModal({ 
  isOpen, 
  onClose, 
  onTranscriptionCreated 
}: NewTranscriptionModalProps) {
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkCurrentMedia, setLinkCurrentMedia] = useState(false);
  const [copyFromTranscriptionId, setCopyFromTranscriptionId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [existingTranscriptions, setExistingTranscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects and transcriptions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadTranscriptions();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = getUserIdFromToken(); // You'll need to implement this
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/projects/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTranscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = getUserIdFromToken();
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/transcriptions/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setExistingTranscriptions(response.data.transcriptions);
      }
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    }
  };

  const getUserIdFromToken = (): string => {
    // Mock implementation - in real app, decode JWT token
    return 'mock-user-id';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('כותרת התמלול נדרשה');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Create transcription
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/transcriptions/create`,
        {
          title: title.trim(),
          projectId: selectedProjectId || undefined,
          mediaIds: linkCurrentMedia ? ['current-media'] : [] // Mock current media
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // If copying from existing transcription, load that data
        let transcriptionData = response.data.transcription;
        
        if (copyFromTranscriptionId) {
          // In a real implementation, you'd copy the blocks and speakers
          // For now, just note that it should be copied
          transcriptionData.copiedFrom = copyFromTranscriptionId;
        }

        onTranscriptionCreated(transcriptionData);
        handleClose();
      }
    } catch (error: any) {
      console.error('Failed to create transcription:', error);
      setError(error.response?.data?.error || 'שגיאה ביצירת התמלול');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSelectedProjectId('');
    setLinkCurrentMedia(false);
    setCopyFromTranscriptionId('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="new-transcription-overlay" onClick={handleClose}>
      <div className="new-transcription-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>תמלול חדש</h2>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">כותרת התמלול:</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="הכנס כותרת לתמלול..."
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="project">פרויקט:</label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="form-select"
              disabled={isLoading}
            >
              <option value="">תמלול עצמאי (ללא פרויקט)</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={linkCurrentMedia}
                onChange={(e) => setLinkCurrentMedia(e.target.checked)}
                disabled={isLoading}
              />
              <span className="checkbox-text">קשר למדיה הנוכחית</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="copyFrom">העתק מתמלול קיים:</label>
            <select
              id="copyFrom"
              value={copyFromTranscriptionId}
              onChange={(e) => setCopyFromTranscriptionId(e.target.value)}
              className="form-select"
              disabled={isLoading}
            >
              <option value="">התחל עם תמלול ריק</option>
              {existingTranscriptions.map(transcription => (
                <option key={transcription.id} value={transcription.id}>
                  {transcription.title}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              onClick={handleClose}
              className="cancel-btn"
              disabled={isLoading}
            >
              ביטול
            </button>
            <button 
              type="submit"
              className="create-btn"
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? 'יוצר...' : 'צור תמלול'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}