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
  currentMediaName?: string;
  currentProjectId?: string;
}

// Development mode flag - set to true to bypass all authentication
const DEV_MODE = true;

export default function NewTranscriptionModal({ 
  isOpen, 
  onClose, 
  onTranscriptionCreated,
  currentMediaName = '',
  currentProjectId = ''
}: NewTranscriptionModalProps) {
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkCurrentMedia, setLinkCurrentMedia] = useState(true); // Default to checked
  const [copyFromTranscriptionId, setCopyFromTranscriptionId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [existingTranscriptions, setExistingTranscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects and transcriptions when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set title to media name (without extension) or default
      if (currentMediaName) {
        // Remove file extension from media name
        const nameWithoutExt = currentMediaName.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      } else {
        setTitle('תמלול חדש');
      }
      
      setSelectedProjectId(currentProjectId || '');
      setLinkCurrentMedia(true); // Always default to checked
      
      // Clear any invalid tokens and use mock data for development
      const token = localStorage.getItem('token');
      if (token && !getUserIdFromToken()) {
        console.log('Invalid token detected, removing it');
        localStorage.removeItem('token');
      }
      
      loadProjects();
      loadTranscriptions();
    }
  }, [isOpen, currentMediaName, currentProjectId]);

  const loadProjects = async () => {
    // In dev mode, always use mock data
    if (DEV_MODE) {
      console.log('DEV MODE: Using mock projects data');
      setProjects([
        { id: 'proj-1', name: 'פרויקט ראיונות', description: 'ראיונות עבודה' },
        { id: 'proj-2', name: 'פרויקט הרצאות', description: 'הרצאות אקדמיות' },
        { id: 'proj-3', name: 'פרויקט פגישות', description: 'פגישות עסקיות' }
      ]);
      return;
    }
    
    // For production, check token
    const token = localStorage.getItem('token');
    const userId = getUserIdFromToken();
    
    console.log('loadProjects: token exists?', !!token, 'userId:', userId);
    
    if (!token || !userId) {
      console.log('Using mock projects data');
      // Mock projects for development
      setProjects([
        { id: 'proj-1', name: 'פרויקט ראיונות', description: 'ראיונות עבודה' },
        { id: 'proj-2', name: 'פרויקט הרצאות', description: 'הרצאות אקדמיות' },
        { id: 'proj-3', name: 'פרויקט פגישות', description: 'פגישות עסקיות' }
      ]);
      return;
    }
    
    try {
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
      // Fallback to mock data on error
      setProjects([
        { id: 'proj-1', name: 'פרויקט ראיונות', description: 'ראיונות עבודה' },
        { id: 'proj-2', name: 'פרויקט הרצאות', description: 'הרצאות אקדמיות' }
      ]);
    }
  };

  const loadTranscriptions = async () => {
    // In dev mode, always use mock data
    if (DEV_MODE) {
      console.log('DEV MODE: Using mock transcriptions data');
      setExistingTranscriptions([
        { id: 'trans-old-1', title: 'ראיון מועמד א׳' },
        { id: 'trans-old-2', title: 'הרצאה על AI' },
        { id: 'trans-old-3', title: 'פגישת צוות' }
      ]);
      return;
    }
    
    // For production, check token
    const token = localStorage.getItem('token');
    const userId = getUserIdFromToken();
    
    console.log('loadTranscriptions: token exists?', !!token, 'userId:', userId);
    
    if (!token || !userId) {
      console.log('Using mock transcriptions data');
      // Mock transcriptions for development
      setExistingTranscriptions([
        { id: 'trans-old-1', title: 'ראיון מועמד א׳' },
        { id: 'trans-old-2', title: 'הרצאה על AI' },
        { id: 'trans-old-3', title: 'פגישת צוות' }
      ]);
      return;
    }
    
    try {
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
      // Fallback to mock data
      setExistingTranscriptions([
        { id: 'trans-old-1', title: 'ראיון מועמד א׳' },
        { id: 'trans-old-2', title: 'הרצאה על AI' }
      ]);
    }
  };

  const getUserIdFromToken = (): string => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found in localStorage');
      return '';
    }
    
    try {
      // Decode JWT token (base64)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('Invalid token format');
        return '';
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const userId = payload.id || payload.userId || '';
      console.log('Decoded userId from token:', userId);
      return userId;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return '';
    }
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
      // In dev mode, always create mock transcription
      if (DEV_MODE) {
        console.log('DEV MODE: Creating mock transcription');
        const mockTranscription = {
          id: `trans-${Date.now()}`,
          title: title.trim(),
          project_id: selectedProjectId || null,
          media_ids: linkCurrentMedia ? ['current-media'] : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          copiedFrom: copyFromTranscriptionId || null
        };
        
        setTimeout(() => {
          onTranscriptionCreated(mockTranscription);
          handleClose();
          setIsLoading(false);
        }, 500);
        return;
      }
      
      const token = localStorage.getItem('token');
      
      // For development without token, create mock transcription
      if (!token) {
        const mockTranscription = {
          id: `trans-${Date.now()}`,
          title: title.trim(),
          project_id: selectedProjectId || null,
          media_ids: linkCurrentMedia ? ['current-media'] : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          copiedFrom: copyFromTranscriptionId || null
        };
        
        setTimeout(() => {
          onTranscriptionCreated(mockTranscription);
          handleClose();
          setIsLoading(false);
        }, 500);
        return;
      }
      
      // Create transcription with auth
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transcription/transcriptions/create`,
        {
          title: title.trim(),
          projectId: selectedProjectId || undefined,
          mediaIds: linkCurrentMedia ? ['current-media'] : []
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        let transcriptionData = response.data.transcription;
        
        if (copyFromTranscriptionId) {
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
    setLinkCurrentMedia(true); // Reset to default checked
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