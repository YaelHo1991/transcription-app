'use client';

import React, { useState, useEffect } from 'react';
import type { Project, MediaInfo } from '@/lib/stores/projectStore';
import useProjectStore from '@/lib/stores/projectStore';
import { ConfirmationModal } from '../TextEditor/components/ConfirmationModal';
import { buildApiUrl } from '@/utils/api';
import './ProjectManagementModal.css';

// Extend Window interface for storage preferences
declare global {
  interface Window {
    storagePreferences?: {
      defaultStorageType: 'local' | 'server' | 'server_chunked';
      autoChunk: boolean;
      migrationThreshold: number;
      useLocalCache: boolean;
      compressionLevel: number;
    };
  }
}

interface ArchivedTranscription {
  id: string;
  originalProjectName: string;
  originalMediaName: string;
  archivedDate: string;
  size: number; // Size in bytes
  blocksCount: number;
  speakersCount: number;
}

// Helper function to decode Hebrew filenames
const decodeHebrewFilename = (name: string): string => {
  try {
    if (name.includes('%') || name.includes('\\x')) {
      return decodeURIComponent(name);
    }
    if (/[\u0080-\u00FF]/.test(name)) {
      const bytes = new Uint8Array(name.split('').map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
    return name;
  } catch (e) {
    console.error('Error decoding filename:', e);
    return name;
  }
};

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'projects' | 'transcriptions' | 'duration' | 'progress' | 'storage';
  projects: Project[];
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
  onTranscriptionRestored?: (projectId: string, mediaId: string) => void;
}

export default function ProjectManagementModal({
  isOpen,
  onClose,
  activeTab = 'projects',
  projects: propProjects,
  onProjectDelete,
  onMediaDelete,
  onTranscriptionRestored
}: ProjectManagementModalProps) {
  // Get fresh projects data from the store
  const storeProjects = useProjectStore(state => state.projects);
  const projects = storeProjects.length > 0 ? storeProjects : propProjects;
  
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [projectsSubTab, setProjectsSubTab] = useState<'active' | 'empty'>('active');
  const [archivedTranscriptions, setArchivedTranscriptions] = useState<ArchivedTranscription[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deleteTranscriptions, setDeleteTranscriptions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'media' | 'orphaned', id: string, mediaId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Keep empty folder dialog state
  const [showKeepEmptyDialog, setShowKeepEmptyDialog] = useState(false);
  const [pendingDeleteParams, setPendingDeleteParams] = useState<{
    projectId: string;
    mediaId: string;
    deleteTranscriptions: boolean;
  } | null>(null);

  // Multi-select states
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [selectedTranscriptions, setSelectedTranscriptions] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'projects' | 'media' | 'transcriptions' | null>(null);
  
  // Restoration state
  const [restorationDialog, setRestorationDialog] = useState<{
    transcription: ArchivedTranscription;
    matchingMedia: { projectId: string; projectName: string; mediaId: string; mediaName: string; }[];
    mode?: 'override' | 'append';
    showPositionDialog?: boolean;
    pendingTarget?: { projectId: string; mediaId: string };
  } | null>(null);
  
  // Preview state
  const [previewDialog, setPreviewDialog] = useState<{
    transcriptionId: string;
    content: string;
    metadata?: any;
  } | null>(null);

  // Storage preferences state
  const [storagePreferences, setStoragePreferences] = useState(() => {
    // Load preferences from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('storagePreferences');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse stored preferences:', e);
        }
      }
    }
    return {
      defaultStorageType: 'server' as 'local' | 'server' | 'server_chunked',
      autoChunk: false,
      migrationThreshold: 100, // MB
      useLocalCache: true,
      compressionLevel: 5
    };
  });

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Set preferences globally when component mounts or preferences change
    window.storagePreferences = storagePreferences;
  }, [storagePreferences]);

  useEffect(() => {
    if (isOpen) {
      // Clear success and error messages when modal is opened
      setSuccessMessage('');
      setShowSuccessModal(false);
      setErrorMessage('');
      setShowErrorModal(false);
      
      // Load archived transcriptions if on transcriptions tab
      if (currentTab === 'transcriptions') {
        loadArchivedTranscriptions();
      }
    }
  }, [isOpen, currentTab]);

  const loadArchivedTranscriptions = async () => {
    try {
      const token = (typeof window !== 'undefined' ? 
        (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';
      const response = await fetch(buildApiUrl('/api/projects/orphaned/transcriptions'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded orphaned transcriptions:', data.transcriptions);
        setArchivedTranscriptions(data.transcriptions || []);
      } else {
        console.error('Failed to load orphaned transcriptions:', response.status);
        setArchivedTranscriptions([]);
      }
    } catch (error) {
      // Silently fail - might be due to Chrome extension or CORS
      console.log('Could not load archived transcriptions (may be due to browser extension):', error);
      setArchivedTranscriptions([]);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    // Always return HH:MM:SS format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteClick = (type: 'project' | 'media', id: string, mediaId?: string) => {
    setDeleteTarget({ type, id, mediaId });
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setShowConfirmDialog(false);

    // Check if this is the last media in the project
    if (deleteTarget.type === 'media' && deleteTarget.mediaId) {
      const project = projects.find(p => p.projectId === deleteTarget.id);
      if (project && project.mediaFiles && project.mediaFiles.length === 1) {
        // This is the last media file, show keep empty dialog
        setPendingDeleteParams({
          projectId: deleteTarget.id,
          mediaId: deleteTarget.mediaId,
          deleteTranscriptions
        });
        setShowKeepEmptyDialog(true);
        setDeleteTarget(null);
        setDeleteTranscriptions(false);
        return;
      }
    }

    setLoading(true);

    try {
      if (deleteTarget.type === 'project' && onProjectDelete) {
        await onProjectDelete(deleteTarget.id, deleteTranscriptions);
        setSuccessMessage('הפרויקט נמחק בהצלחה');
        setShowSuccessModal(true);
      } else if (deleteTarget.type === 'media' && deleteTarget.mediaId && onMediaDelete) {
        await onMediaDelete(deleteTarget.id, deleteTarget.mediaId, deleteTranscriptions);
        // Close the media panel after successful deletion
        setSelectedProject(null);
        // Reload projects to get updated counts
        const { loadProjects } = useProjectStore.getState();
        await loadProjects();
        setSuccessMessage('המדיה נמחקה בהצלחה');
        setShowSuccessModal(true);
      } else if (deleteTarget.type === 'orphaned') {
        await executeOrphanedDelete(deleteTarget.id);
      }

      setDeleteTarget(null);
      setDeleteTranscriptions(false);
    } catch (error) {
      console.error('Delete failed:', error);
      setErrorMessage('שגיאה במחיקה. אנא נסה שנית.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  
  const confirmBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);

    // Check if this is bulk deleting all media from a project (would empty it)
    if (bulkDeleteType === 'media' && selectedProject) {
      const project = projects.find(p => p.projectId === selectedProject);
      if (project && project.mediaFiles &&
          selectedMedia.size === project.mediaFiles.length) {
        // User is deleting all media files, show keep empty dialog
        // We'll handle all selected media as one operation
        setPendingDeleteParams({
          projectId: selectedProject,
          mediaId: Array.from(selectedMedia)[0], // We'll handle all in the handler
          deleteTranscriptions
        });
        setShowKeepEmptyDialog(true);
        setBulkDeleteType(null);
        return;
      }
    }

    setLoading(true);

    let successCount = 0;
    let failedCount = 0;

    try {
      if (bulkDeleteType === 'projects' && onProjectDelete) {
        for (const projectId of selectedProjects) {
          try {
            await onProjectDelete(projectId, deleteTranscriptions);
            successCount++;
          } catch (error) {
            console.error(`Failed to delete project ${projectId}:`, error);
            failedCount++;
          }
        }
        if (successCount > 0) {
          setSuccessMessage(`${successCount} פרויקטים נמחקו בהצלחה${failedCount > 0 ? ` (${failedCount} נכשלו)` : ''}`);
          setSelectedProjects(new Set());
        }
      } else if (bulkDeleteType === 'media' && onMediaDelete && selectedProject) {
        for (const mediaId of selectedMedia) {
          try {
            await onMediaDelete(selectedProject, mediaId, deleteTranscriptions);
            successCount++;
          } catch (error) {
            console.error(`Failed to delete media ${mediaId}:`, error);
            failedCount++;
          }
        }
        if (successCount > 0) {
          setSuccessMessage(`${successCount} קבצי מדיה נמחקו בהצלחה${failedCount > 0 ? ` (${failedCount} נכשלו)` : ''}`);
          setSelectedMedia(new Set());
          // Close the media panel after bulk deletion
          setSelectedProject(null);
          // Reload projects to get updated counts
          const { loadProjects } = useProjectStore.getState();
          await loadProjects();
        }
      } else if (bulkDeleteType === 'transcriptions') {
        for (const transcriptionId of selectedTranscriptions) {
          try {
            await executeOrphanedDelete(transcriptionId);
            successCount++;
          } catch (error) {
            console.error(`Failed to delete transcription ${transcriptionId}:`, error);
            failedCount++;
          }
        }
        if (successCount > 0) {
          setSuccessMessage(`${successCount} תמלולים נמחקו בהצלחה${failedCount > 0 ? ` (${failedCount} נכשלו)` : ''}`);
          setSelectedTranscriptions(new Set());
        }
      }
      
      if (successCount > 0) {
        setShowSuccessModal(true);
      } else if (failedCount > 0) {
        setErrorMessage('כל הפריטים נכשלו במחיקה. אנא נסה שנית.');
        setShowErrorModal(true);
      }
      
      setBulkDeleteType(null);
      setDeleteTranscriptions(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      setErrorMessage('שגיאה במחיקה המרובה. אנא נסה שנית.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleProjectSelection = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };
  
  const toggleMediaSelection = (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedMedia);
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId);
    } else {
      newSelection.add(mediaId);
    }
    setSelectedMedia(newSelection);
  };
  
  const toggleTranscriptionSelection = (transcriptionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedTranscriptions);
    if (newSelection.has(transcriptionId)) {
      newSelection.delete(transcriptionId);
    } else {
      newSelection.add(transcriptionId);
    }
    setSelectedTranscriptions(newSelection);
  };
  
  const handleRestoreClick = async (transcription: ArchivedTranscription) => {
    console.log('[Restore] Looking for media matching:', transcription.originalMediaName);

    // Find all media files with matching names across all projects
    const matchingMedia: { projectId: string; projectName: string; mediaId: string; mediaName: string; }[] = [];

    // First, try name-based matching (for uploaded files)
    projects.forEach(project => {
      if (project.mediaInfo && project.mediaInfo.length > 0) {
        project.mediaInfo.forEach(media => {
          console.log(`[Restore] Checking media: "${media.name}" vs "${transcription.originalMediaName}" - Match: ${media.name === transcription.originalMediaName}`);

          // Check if media name matches the archived transcription's original media name
          // Use exact match to avoid confusion between similar names
          if (media.name === transcription.originalMediaName) {
            // Check if this exact combination is already in the list to avoid duplicates
            const isDuplicate = matchingMedia.some(
              m => m.projectId === project.projectId && m.mediaId === media.mediaId
            );

            if (!isDuplicate) {
              console.log(`[Restore] Found match: Project ${project.displayName || project.name}, Media ${media.name} (${media.mediaId})`);
              matchingMedia.push({
                projectId: project.projectId,
                projectName: project.displayName || project.name, // Use displayName for clarity
                mediaId: media.mediaId,
                mediaName: media.name
              });
            }
          }
        });
      }
    });

    console.log('[Restore] Total name-based matches found:', matchingMedia.length);

    // If no name-based matches found, try URL hash matching for URL-downloaded media
    if (matchingMedia.length === 0) {
      console.log('[Restore] No name matches found, trying URL hash matching...');

      try {
        const token = (typeof window !== 'undefined' ?
          (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';

        const response = await fetch(buildApiUrl('/api/projects/orphaned/find-matching-media'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcriptionId: transcription.id
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.matches && result.matches.length > 0) {
            console.log('[Restore] Found URL hash matches:', result.matches);
            matchingMedia.push(...result.matches);
          }

          // If we found matches by URL hash, update the display to show the original URL
          if (result.originalUrl && matchingMedia.length > 0) {
            console.log('[Restore] Original URL:', result.originalUrl);
          }
        }
      } catch (error) {
        console.error('[Restore] Error searching for URL hash matches:', error);
      }
    }

    console.log('[Restore] Total matches found (name + URL hash):', matchingMedia.length);

    // Show restoration dialog with matching media
    setRestorationDialog({
      transcription,
      matchingMedia
    });
  };
  
  const handleRestoreConfirm = async (targetProjectId: string, targetMediaId: string, mode: 'override' | 'append', position?: 'before' | 'after') => {
    if (!restorationDialog) return;
    
    console.log('[Restore] Confirming restore:', {
      transcriptionId: restorationDialog.transcription.id,
      targetProjectId,
      targetMediaId,
      mode,
      position: position || 'after'
    });
    
    // CRITICAL: Stop any autosave before restore to prevent contamination
    try {
      const backupService = (await import('@/services/backupService')).default;
      if (backupService) {
        console.log('[Restore] Stopping autosave before restore operation');
        backupService.stopAutoSave();
      } else {
        console.warn('[Restore] Could not access backup service');
      }
    } catch (error) {
      console.error('[Restore] Error stopping autosave:', error);
    }
    
    try {
      setLoading(true);
      const token = (typeof window !== 'undefined' ? 
        (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';
      
      const response = await fetch(buildApiUrl('/api/projects/orphaned/restore-to-media'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcriptionId: restorationDialog.transcription.id,
          targetProjectId,
          targetMediaId,
          mode,
          position: position || 'after' // Default to 'after' for backward compatibility
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(result.message || 'התמלול שוחזר בהצלחה');
        setShowSuccessModal(true);
        
        // Close restoration dialog FIRST
        setRestorationDialog(null);
        
        // Then reload archived transcriptions
        await loadArchivedTranscriptions();
        
        // CRITICAL: If we restored to the currently loaded media, reload it
        // This prevents showing stale data
        try {
          const useProjectStore = (await import('@/lib/stores/projectStore')).default;
          const projectStore = useProjectStore.getState();
          const currentProjectId = projectStore.currentProject?.projectId;
          const currentMediaId = projectStore.currentMediaId;
        
          console.log('[Restore] Checking if need to reload current media:', {
            targetProjectId,
            targetMediaId,
            currentProjectId,
            currentMediaId,
            needsReload: targetProjectId === currentProjectId && targetMediaId === currentMediaId
          });
        
          if (targetProjectId === currentProjectId && targetMediaId === currentMediaId) {
            console.log('[Restore] Reloading current media after restore');
            // Force reload the current media to show the restored content
            await projectStore.setCurrentMediaById(targetProjectId, targetMediaId);
          }
        } catch (error) {
          console.error('[Restore] Error reloading current media:', error);
        }
        
        // Call the callback to load the restored transcription
        if (onTranscriptionRestored) {
          onTranscriptionRestored(targetProjectId, targetMediaId);
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'שגיאה בשחזור התמלול');
        setShowErrorModal(true);
        // Close restoration dialog on error too
        setRestorationDialog(null);
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setErrorMessage('שגיאה בשחזור התמלול');
      setShowErrorModal(true);
      // Close restoration dialog on error
      setRestorationDialog(null);
    } finally {
      setLoading(false);
    }
  };

  const previewTranscription = async (transcriptionId: string) => {
    try {
      setLoading(true);
      const token = (typeof window !== 'undefined' ? 
        (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';
      const response = await fetch(buildApiUrl(`/api/projects/orphaned/preview/${transcriptionId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Parse the content properly
        let formattedContent = '';
        let metadata = {};
        
        if (data.content) {
          if (typeof data.content === 'string') {
            // Try to parse as JSON first
            try {
              const parsed = JSON.parse(data.content);
              metadata = parsed.metadata || {};
              
              // Format blocks into readable text
              if (parsed.blocks && Array.isArray(parsed.blocks)) {
                formattedContent = parsed.blocks.map((block: any) => {
                  if (block.speaker) {
                    return `[${block.speaker}]\n${block.text || ''}`;
                  }
                  return block.text || '';
                }).join('\n\n');
              } else {
                formattedContent = JSON.stringify(parsed, null, 2);
              }
            } catch {
              // If not JSON, use as is
              formattedContent = data.content;
            }
          } else if (typeof data.content === 'object') {
            metadata = data.content.metadata || {};
            
            // Format blocks
            if (data.content.blocks && Array.isArray(data.content.blocks)) {
              formattedContent = data.content.blocks.map((block: any) => {
                if (block.speaker) {
                  return `[${block.speaker}]\n${block.text || ''}`;
                }
                return block.text || '';
              }).join('\n\n');
            } else {
              formattedContent = JSON.stringify(data.content, null, 2);
            }
          }
        }
        
        // Set the preview dialog state
        setPreviewDialog({
          transcriptionId,
          content: formattedContent || 'אין תוכן להצגה',
          metadata
        });
      } else {
        setErrorMessage('שגיאה בטעינת תצוגה מקדימה');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setErrorMessage('שגיאה בטעינת תצוגה מקדימה');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const exportTranscription = async (transcriptionId: string, format: 'word' | 'json') => {
    console.log(`Exporting transcription ${transcriptionId} as ${format}`);
    try {
      const token = (typeof window !== 'undefined' ? 
        (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';
      const response = await fetch(buildApiUrl('/api/projects/orphaned/export'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcriptionId, format })
      });
      
      console.log('Export response:', response.status);
      
      if (response.ok) {
        if (format === 'json') {
          // JSON format returns JSON data
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || `transcription_${transcriptionId}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else if (format === 'word') {
          // Word format returns binary data
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transcription_${transcriptionId}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        const errorText = await response.text();
        console.error('Export failed:', response.status, errorText);
        alert(`Export failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export error: ${error}`);
    }
  };
  
  const deleteTranscription = async (transcriptionId: string) => {
    // Set the delete target to trigger the confirmation modal
    setDeleteTarget({ type: 'orphaned', id: transcriptionId });
    setShowConfirmDialog(true);
  };
  
  const executeOrphanedDelete = async (transcriptionId: string) => {
    console.log(`[Frontend] Deleting orphaned transcription: ${transcriptionId}`);
    
    try {
      const token = (typeof window !== 'undefined' ? 
        (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';
      
      // URL encode the transcriptionId to handle special characters
      const encodedId = encodeURIComponent(transcriptionId);
      console.log(`[Frontend] Encoded ID: ${encodedId}`);
      
      const response = await fetch(buildApiUrl(`/api/projects/orphaned/${encodedId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[Frontend] Delete response:', response.status, response.statusText);
      
      if (response.ok) {
        // Immediately remove the item from the list for better UX
        setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcriptionId));
        
        // Then reload the list from server to ensure consistency
        setTimeout(async () => {
          await loadArchivedTranscriptions();
        }, 500);
        
        setSuccessMessage('התמלול נמחק בהצלחה');
        setShowSuccessModal(true);
      } else if (response.status === 404) {
        // File not found - it's already deleted, just refresh the list
        console.log('Transcription already deleted (404), refreshing list');
        
        // Immediately remove the item from the list
        setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcriptionId));
        
        // Then reload from server
        setTimeout(async () => {
          await loadArchivedTranscriptions();
        }, 500);
        
        setSuccessMessage('התמלול כבר נמחק מהמערכת');
        setShowSuccessModal(true);
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
        setErrorMessage(`שגיאה במחיקת התמלול: ${response.status === 500 ? 'שגיאת שרת פנימית' : errorText}`);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('שגיאת רשת במחיקת התמלול. אנא ודא שהשרת פועל.');
      setShowErrorModal(true);
    }
  };

  // Handle keep empty folder dialog
  const handleKeepEmptyChoice = async (keepEmpty: boolean) => {
    if (!pendingDeleteParams) return;

    setShowKeepEmptyDialog(false);
    setLoading(true);

    try {
      // Check if we need to handle multiple media files (from bulk delete)
      if (selectedMedia.size >= 1) {
        // Handle bulk delete of all media (even if it's just one file)
        for (const mediaId of selectedMedia) {
          const token = (typeof window !== 'undefined' ?
            (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';

          const isLastMedia = Array.from(selectedMedia).indexOf(mediaId) === selectedMedia.size - 1;

          const response = await fetch(
            buildApiUrl(`/api/projects/${pendingDeleteParams.projectId}/media/${mediaId}`),
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                deleteTranscription: pendingDeleteParams.deleteTranscriptions,
                keepEmptyProject: isLastMedia ? keepEmpty : true // Only apply user choice on last media
              })
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to delete media ${mediaId}:`, errorText);
          }
        }

        // Clear selections
        setSelectedMedia(new Set());
        setSelectedProject(null);

        // Reload projects to get updated counts
        const { loadProjects } = useProjectStore.getState();
        await loadProjects();

        if (keepEmpty) {
          setSuccessMessage('המדיה נמחקה והפרויקט נשמר כריק');
        } else {
          setSuccessMessage('המדיה והפרויקט נמחקו בהצלחה');
        }
        setShowSuccessModal(true);

      } else {
        // Handle single media delete (when not using checkbox)
        const token = (typeof window !== 'undefined' ?
          (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null) || 'dev-anonymous';

        const response = await fetch(
          buildApiUrl(`/api/projects/${pendingDeleteParams.projectId}/media/${pendingDeleteParams.mediaId}`),
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              deleteTranscription: pendingDeleteParams.deleteTranscriptions,
              keepEmptyProject: keepEmpty
            })
          }
        );

        if (response.ok) {
          const result = await response.json();

          // Close the media panel after successful deletion
          setSelectedProject(null);

          // Reload projects to get updated counts
          const { loadProjects } = useProjectStore.getState();
          await loadProjects();

          if (result.projectKeptEmpty) {
            setSuccessMessage('המדיה נמחקה והפרויקט נשמר כריק');
          } else if (result.projectDeleted) {
            setSuccessMessage('המדיה והפרויקט נמחקו בהצלחה');
          } else {
            setSuccessMessage('המדיה נמחקה בהצלחה');
          }

          setShowSuccessModal(true);
        } else {
          const errorText = await response.text();
          setErrorMessage(`שגיאה במחיקה: ${errorText}`);
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('שגיאה במחיקה. אנא נסה שנית.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setPendingDeleteParams(null);
    }
  };

  const calculateTotalDuration = () => {
    // Calculate total duration from all media files
    let totalSeconds = 0;
    projects.forEach(project => {
      if (project.mediaInfo) {
        project.mediaInfo.forEach(media => {
          totalSeconds += media.duration || 0;
        });
      }
    });
    return totalSeconds;
  };
  
  const calculateProjectSize = (project: Project) => {
    if (project.mediaInfo) {
      return project.mediaInfo.reduce((total, media) => total + (media.size || 0), 0);
    }
    return project.size || 0;
  };
  
  const calculateTotalSize = () => {
    return projects.reduce((total, project) => total + calculateProjectSize(project), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="project-management-modal-overlay" onClick={(e) => {
      // Only close if clicking the overlay itself, not nested modals
      if ((e.target as HTMLElement).classList.contains('project-management-modal-overlay')) {
        onClose();
      }
    }}>
      <div className="project-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ניהול פרויקטים ותמלולים</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${currentTab === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentTab('projects')}
          >
            פרויקטים
          </button>
          <button
            className={`tab ${currentTab === 'transcriptions' ? 'active' : ''}`}
            onClick={() => setCurrentTab('transcriptions')}
          >
            תמלולים
          </button>
          <button
            className={`tab ${currentTab === 'duration' ? 'active' : ''}`}
            onClick={() => setCurrentTab('duration')}
          >
            משך כולל
          </button>
          <button 
            className={`tab ${currentTab === 'progress' ? 'active' : ''}`}
            onClick={() => setCurrentTab('progress')}
          >
            התקדמות
          </button>
          <button 
            className={`tab ${currentTab === 'storage' ? 'active' : ''}`}
            onClick={() => setCurrentTab('storage')}
          >
            אחסון
          </button>
        </div>

        <div className="modal-content">
          {/* Projects Tab */}
          {currentTab === 'projects' && (
            <div className="projects-tab">
              {/* Sub-tabs for Projects */}
              <div className="projects-sub-tabs">
                <button
                  className={`sub-tab ${projectsSubTab === 'active' ? 'active' : ''}`}
                  onClick={() => setProjectsSubTab('active')}
                >
                  פרויקטים פעילים ({projects.filter(p => p.mediaFiles && p.mediaFiles.length > 0).length})
                </button>
                <button
                  className={`sub-tab ${projectsSubTab === 'empty' ? 'active' : ''}`}
                  onClick={() => setProjectsSubTab('empty')}
                >
                  פרויקטים ריקים ({projects.filter(p => !p.mediaFiles || p.mediaFiles.length === 0).length})
                </button>
              </div>

              {/* Active Projects */}
              {projectsSubTab === 'active' && (
                <>
                  <div className="projects-stats-bar">
                    <span>סה"כ פרויקטים פעילים: {projects.filter(p => p.mediaFiles && p.mediaFiles.length > 0).length}</span>
                    <span>נפח כולל: {formatSize(calculateTotalSize())}</span>
                    <span>משך כולל: {formatDuration(calculateTotalDuration())}</span>
                    {selectedProjects.size > 0 && (
                      <button
                        className="bulk-delete-btn"
                        onClick={() => {
                          setBulkDeleteType('projects');
                          setShowBulkDeleteConfirm(true);
                        }}
                      >
                        🗑️ מחק {selectedProjects.size} פרויקטים
                      </button>
                    )}
                  </div>
                  <div className="projects-grid">
                    {projects
                      .filter(p => p.mediaFiles && p.mediaFiles.length > 0)
                      .map(project => {
                  const projectSize = calculateProjectSize(project);
                  return (
                    <div 
                      key={project.projectId} 
                      className={`project-grid-item ${selectedProject === project.projectId ? 'selected' : ''} ${selectedProjects.has(project.projectId) ? 'checkbox-selected' : ''}`}
                      onClick={() => setSelectedProject(selectedProject === project.projectId ? null : project.projectId)}
                    >
                      <div className="project-date-corner">
                        {new Date(project.lastModified).toLocaleDateString('he-IL')}
                      </div>
                      
                      <input 
                        type="checkbox"
                        className="project-checkbox"
                        checked={selectedProjects.has(project.projectId)}
                        onClick={(e) => toggleProjectSelection(project.projectId, e)}
                        onChange={() => {}}
                      />
                      
                      <div className="project-icon">📁</div>
                      <div className="project-name" title={project.displayName}>{project.displayName}</div>
                      <div className="project-stats">
                        <span>{project.mediaInfo ? project.mediaInfo.length : (project.mediaFiles?.length || 0)} קבצים</span>
                        <span>•</span>
                        <span>{formatSize(projectSize)}</span>
                      </div>
                      
                    </div>
                  );
                    })}
                  </div>
                </>
              )}

              {/* Empty Projects */}
              {projectsSubTab === 'empty' && (
                <>
                  <div className="projects-stats-bar">
                    <span>סה"כ פרויקטים ריקים: {projects.filter(p => !p.mediaFiles || p.mediaFiles.length === 0).length}</span>
                    {selectedProjects.size > 0 && (
                      <button
                        className="bulk-delete-btn"
                        onClick={() => {
                          setBulkDeleteType('projects');
                          setShowBulkDeleteConfirm(true);
                        }}
                      >
                        🗑️ מחק {selectedProjects.size} פרויקטים
                      </button>
                    )}
                    {projects.filter(p => !p.mediaFiles || p.mediaFiles.length === 0).length > 0 && (
                      <button
                        className="bulk-delete-btn"
                        onClick={() => {
                          const emptyProjects = projects.filter(p => !p.mediaFiles || p.mediaFiles.length === 0);
                          setSelectedProjects(new Set(emptyProjects.map(p => p.projectId)));
                          setBulkDeleteType('projects');
                          setShowBulkDeleteConfirm(true);
                        }}
                        disabled={loading}
                      >
                        מחק את כל הפרויקטים הריקים
                      </button>
                    )}
                  </div>
                  <div className="projects-grid">
                    {projects.filter(p => !p.mediaFiles || p.mediaFiles.length === 0).length === 0 ? (
                      <div className="no-empty-projects">
                        <p>אין פרויקטים ריקים</p>
                        <p className="hint">פרויקטים ריקים הם פרויקטים ללא קבצי מדיה</p>
                      </div>
                    ) : (
                      projects
                        .filter(p => !p.mediaFiles || p.mediaFiles.length === 0)
                        .map(project => {
                          const projectSize = calculateProjectSize(project);
                          return (
                            <div
                              key={project.projectId}
                              className={`project-grid-item ${selectedProject === project.projectId ? 'selected' : ''} ${selectedProjects.has(project.projectId) ? 'checkbox-selected' : ''}`}
                              onClick={() => setSelectedProject(selectedProject === project.projectId ? null : project.projectId)}
                            >
                              <div className="project-date-corner">
                                {new Date(project.lastModified).toLocaleDateString('he-IL')}
                              </div>

                              <input
                                type="checkbox"
                                className="project-checkbox"
                                checked={selectedProjects.has(project.projectId)}
                                onClick={(e) => toggleProjectSelection(project.projectId, e)}
                                onChange={() => {}}
                              />

                              <div className="project-icon">📁</div>
                              <div className="project-name" title={project.displayName}>{project.displayName}</div>
                              <div className="project-stats">
                                <span>0 קבצים</span>
                                <span className="separator">•</span>
                                <span>{formatSize(projectSize)}</span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </>
              )}

              {/* Media Details Panel - Outside of grid */}
              {selectedProject && (
                <>
                  <div className="media-details-overlay" onClick={() => setSelectedProject(null)} />
                  <div className="media-details-panel">
                    <button className="close-panel-btn" onClick={() => setSelectedProject(null)}>×</button>
                    {(() => {
                      const project = projects.find(p => p.projectId === selectedProject);
                      if (!project) return null;
                      return (
                        <>
                          <div className="media-panel-header">
                            <h4>קבצי מדיה - {project.displayName}</h4>
                            {selectedMedia.size > 0 && (
                              <button 
                                className="bulk-delete-media-btn"
                                onClick={() => {
                                  setBulkDeleteType('media');
                                  setShowBulkDeleteConfirm(true);
                                }}
                              >
                                🗑️ מחק {selectedMedia.size} קבצים
                              </button>
                            )}
                          </div>
                          <div className="media-list-detailed">
                            {project.mediaInfo && project.mediaInfo.length > 0 ? (
                              project.mediaInfo.map((media, index) => {
                                console.log(`[ProjectModal] Rendering media ${index}: ${media.name} with mediaId: ${media.mediaId}`);
                                return (
                                <div key={`media-detail-${project.projectId}-${media.mediaId}-${index}`} className={`media-detail-item ${selectedMedia.has(media.mediaId) ? 'checkbox-selected' : ''}`}>
                                  <input 
                                    type="checkbox"
                                    className="media-checkbox"
                                    checked={selectedMedia.has(media.mediaId)}
                                    onClick={(e) => toggleMediaSelection(media.mediaId, e)}
                                    onChange={() => {}}
                                  />
                                  <div className="media-icon">🎵</div>
                                  <div className="media-info">
                                    <div className="media-name">{(() => {
                                      // Decode Hebrew filename if needed
                                      try {
                                        if (media.name.includes('%') || media.name.includes('\\x')) {
                                          return decodeURIComponent(media.name);
                                        }
                                        if (/[\u0080-\u00FF]/.test(media.name)) {
                                          const bytes = new Uint8Array(media.name.split('').map(c => c.charCodeAt(0)));
                                          return new TextDecoder('utf-8').decode(bytes);
                                        }
                                        return media.name;
                                      } catch (e) {
                                        return media.name;
                                      }
                                    })()}</div>
                                    <div className="media-stats">
                                      <span>{formatSize(media.size)}</span>
                                      <span>•</span>
                                      <span>{formatDuration(media.duration)}</span>
                                    </div>
                                  </div>
                                </div>
                                );
                              })
                            ) : (
                              project.mediaFiles.map((mediaId, index) => {
                                // Try to get media name from mediaInfo if we somehow missed it
                                const mediaName = typeof mediaId === 'string' ? mediaId : `Media ${index + 1}`;
                                return (
                                  <div key={`media-detail-${project.projectId}-${mediaId}-${index}`} className={`media-detail-item ${selectedMedia.has(mediaId) ? 'checkbox-selected' : ''}`}>
                                    <input 
                                      type="checkbox"
                                      className="media-checkbox"
                                      checked={selectedMedia.has(mediaId)}
                                      onClick={(e) => toggleMediaSelection(mediaId, e)}
                                      onChange={() => {}}
                                    />
                                    <div className="media-icon">🎵</div>
                                    <div className="media-info">
                                      <div className="media-name">{mediaName}</div>
                                      <div className="media-stats">
                                        <span className="media-id">0 B</span>
                                      </div>
                                    </div>
                                </div>
                              );
                            })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Transcriptions Tab */}
          {currentTab === 'transcriptions' && (
            <div className="transcriptions-tab">
              <div className="transcriptions-header">
                <h3>תמלולים בארכיון</h3>
                {selectedTranscriptions.size > 0 && (
                  <button 
                    className="bulk-delete-btn"
                    onClick={() => {
                      setBulkDeleteType('transcriptions');
                      setShowBulkDeleteConfirm(true);
                    }}
                  >
                    🗑️ מחק {selectedTranscriptions.size} תמלולים
                  </button>
                )}
              </div>
              <div className="archived-transcriptions-list">
                {archivedTranscriptions.length === 0 ? (
                  <p className="no-archived">אין תמלולים בארכיון</p>
                ) : (
                  archivedTranscriptions.map(transcription => (
                    <div key={transcription.id} className={`archived-transcription-item ${selectedTranscriptions.has(transcription.id) ? 'checkbox-selected' : ''}`}>
                      <input 
                        type="checkbox"
                        className="transcription-checkbox"
                        checked={selectedTranscriptions.has(transcription.id)}
                        onClick={(e) => toggleTranscriptionSelection(transcription.id, e)}
                        onChange={() => {}}
                      />
                      <div className="transcription-info">
                        <h4>{transcription.originalProjectName} / {transcription.originalMediaName}</h4>
                        <div className="transcription-meta">
                          <span>📅 {new Date(transcription.archivedDate).toLocaleDateString('he-IL')}</span>
                          <span>💾 {formatSize(transcription.size)}</span>
                          <span>📝 {transcription.blocksCount} בלוקים</span>
                          <span>👥 {transcription.speakersCount} דוברים</span>
                        </div>
                      </div>
                      
                      <div className="transcription-actions">
                        <button 
                          className="preview-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            previewTranscription(transcription.id);
                          }}
                        >
                          👁️ תצוגה מקדימה
                        </button>
                        <button 
                          className="export-word-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTranscription(transcription.id, 'word');
                          }}
                        >
                          📄 Word
                        </button>
                        <button 
                          className="export-json-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportTranscription(transcription.id, 'json');
                          }}
                        >
                          💾 JSON
                        </button>
                        <button 
                          className="restore-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(transcription);
                          }}
                          title="שחזר תמלול למדיה"
                        >
                          🔄
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Duration Tab */}
          {currentTab === 'duration' && (
            <div className="duration-tab">
              <h3>משך כולל של קבצי מדיה</h3>
              <div className="total-duration">
                <span className="duration-value">{formatDuration(calculateTotalDuration())}</span>
                <div className="duration-breakdown">
                  <span>סה"כ פרויקטים: {projects.length}</span>
                  <span>סה"כ קבצים: {projects.reduce((sum, p) => sum + p.totalMedia, 0)}</span>
                </div>
              </div>
              
              <div className="projects-duration-list">
                {projects.map(project => {
                  const projectDuration = project.mediaInfo 
                    ? project.mediaInfo.reduce((sum, media) => sum + (media.duration || 0), 0)
                    : 0;
                  return (
                    <div key={project.projectId} className="project-duration-item">
                      <div className="project-duration-header">
                        <h4>{project.displayName}</h4>
                        <span className="project-total-duration">{formatDuration(projectDuration)}</span>
                      </div>
                      <div className="media-duration-list">
                        {project.mediaInfo && project.mediaInfo.length > 0 ? (
                          // Deduplicate media items by mediaId to avoid duplicate key warnings
                          Array.from(new Map(project.mediaInfo.map(m => [m.mediaId, m])).values()).map((media, index) => (
                            <div key={`media-duration-${project.projectId}-${media.mediaId}-${index}`} className="media-duration-item">
                              <div className="media-icon-small">🎵</div>
                              <span className="media-name">{(() => {
                                // Decode Hebrew filename if needed
                                try {
                                  if (media.name.includes('%') || media.name.includes('\\x')) {
                                    return decodeURIComponent(media.name);
                                  }
                                  if (/[\u0080-\u00FF]/.test(media.name)) {
                                    const bytes = new Uint8Array(media.name.split('').map(c => c.charCodeAt(0)));
                                    return new TextDecoder('utf-8').decode(bytes);
                                  }
                                  return media.name;
                                } catch (e) {
                                  return media.name;
                                }
                              })()}</span>
                              <span className="duration">{formatDuration(media.duration)}</span>
                            </div>
                          ))
                        ) : (
                          project.mediaFiles.map((mediaId, index) => {
                            const mediaName = typeof mediaId === 'string' ? mediaId : `Media ${index + 1}`;
                            // Try to get duration from project.mediaDurations if available
                            const duration = project.mediaDurations?.[mediaId] || 0;
                            return (
                              <div key={`media-duration-${project.projectId}-${mediaId}-${index}`} className="media-duration-item">
                                <div className="media-icon-small">🎵</div>
                                <span className="media-name">{mediaName}</span>
                                <span className="duration">{formatDuration(duration)}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {currentTab === 'progress' && (
            <div className="progress-tab">
              <h3>התקדמות תמלול</h3>
              <p className="placeholder-message">
                תכונה זו עדיין בפיתוח
              </p>
            </div>
          )}

          {/* Storage Tab */}
          {currentTab === 'storage' && (
            <div className="storage-tab">
              <h3>הגדרות אחסון</h3>
              
              {/* Default Storage Type */}
              <div className="storage-preference-group">
                <h4>סוג אחסון ברירת מחדל</h4>
                <div className="storage-option-group">
                  <label className="storage-option-label">
                    <input
                      type="radio"
                      name="defaultStorageType"
                      value="local"
                      checked={storagePreferences.defaultStorageType === 'local'}
                      onChange={(e) => setStoragePreferences(prev => ({ ...prev, defaultStorageType: e.target.value as any }))}
                    />
                    <span>💻 מקומי - קבצים נשמרים במחשב שלך</span>
                  </label>
                  <label className="storage-option-label">
                    <input
                      type="radio"
                      name="defaultStorageType"
                      value="server"
                      checked={storagePreferences.defaultStorageType === 'server'}
                      onChange={(e) => setStoragePreferences(prev => ({ ...prev, defaultStorageType: e.target.value as any }))}
                    />
                    <span>☁️ שרת - גישה מכל מקום</span>
                  </label>
                  <label className="storage-option-label">
                    <input
                      type="radio"
                      name="defaultStorageType"
                      value="server_chunked"
                      checked={storagePreferences.defaultStorageType === 'server_chunked'}
                      onChange={(e) => setStoragePreferences(prev => ({ ...prev, defaultStorageType: e.target.value as any }))}
                    />
                    <span>📦 שרת מקטע - לקבצים גדולים</span>
                  </label>
                </div>
              </div>

              {/* Auto Chunk Setting */}
              <div className="storage-preference-group">
                <h4>הגדרות מתקדמות</h4>
                <div className="storage-checkbox-group">
                  <label className="storage-checkbox-label">
                    <input
                      type="checkbox"
                      checked={storagePreferences.autoChunk}
                      onChange={(e) => setStoragePreferences(prev => ({ ...prev, autoChunk: e.target.checked }))}
                    />
                    <span>חלק אוטומטית קבצים גדולים מ-100MB</span>
                  </label>
                  <label className="storage-checkbox-label">
                    <input
                      type="checkbox"
                      checked={storagePreferences.useLocalCache}
                      onChange={(e) => setStoragePreferences(prev => ({ ...prev, useLocalCache: e.target.checked }))}
                    />
                    <span>השתמש במטמון מקומי לביצועים טובים יותר</span>
                  </label>
                </div>
              </div>

              {/* Migration Threshold */}
              <div className="storage-preference-group">
                <h4>סף העברה אוטומטית לשרת</h4>
                <div className="storage-slider-container">
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={storagePreferences.migrationThreshold}
                    onChange={(e) => setStoragePreferences(prev => ({ ...prev, migrationThreshold: parseInt(e.target.value) }))}
                    className="storage-slider"
                  />
                  <span className="storage-slider-value">{storagePreferences.migrationThreshold} MB</span>
                </div>
                <p className="storage-help-text">
                  קבצים מעל גודל זה יועברו אוטומטית לשרת
                </p>
              </div>

              {/* Compression Level */}
              <div className="storage-preference-group">
                <h4>רמת דחיסה</h4>
                <div className="storage-slider-container">
                  <input
                    type="range"
                    min="1"
                    max="9"
                    value={storagePreferences.compressionLevel}
                    onChange={(e) => setStoragePreferences(prev => ({ ...prev, compressionLevel: parseInt(e.target.value) }))}
                    className="storage-slider"
                  />
                  <span className="storage-slider-value">רמה {storagePreferences.compressionLevel}</span>
                </div>
                <p className="storage-help-text">
                  רמת דחיסה גבוהה יותר = קבצים קטנים יותר אבל זמן עיבוד ארוך יותר
                </p>
              </div>

              {/* Save Button */}
              <div className="storage-actions">
                <button 
                  className="save-storage-preferences"
                  onClick={() => {
                    // Save preferences to localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('storagePreferences', JSON.stringify(storagePreferences));
                    }
                    
                    // Apply chunking logic globally
                    window.storagePreferences = storagePreferences;
                    
                    // Log the settings for demonstration
                    console.log('🔧 Storage Preferences Saved:', {
                      defaultType: storagePreferences.defaultStorageType,
                      autoChunk: storagePreferences.autoChunk,
                      threshold: `${storagePreferences.migrationThreshold}MB`,
                      compression: `Level ${storagePreferences.compressionLevel}`,
                      useCache: storagePreferences.useLocalCache
                    });
                    
                    setSuccessMessage('הגדרות האחסון נשמרו בהצלחה');
                    setShowSuccessModal(true);
                  }}
                >
                  שמור הגדרות
                </button>
              </div>
              
              {/* Storage Status Display */}
              <div className="storage-preference-group" style={{ marginTop: '30px' }}>
                <h4>סטטוס אחסון נוכחי</h4>
                <div style={{ 
                  background: 'rgba(32, 201, 151, 0.1)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(32, 201, 151, 0.3)'
                }}>
                  <div style={{ marginBottom: '10px', color: 'white' }}>
                    📊 <strong>סך הכל פרויקטים:</strong> {projects.length}
                  </div>
                  <div style={{ marginBottom: '10px', color: 'white' }}>
                    💾 <strong>גודל כולל:</strong> {(calculateTotalSize() / (1024 * 1024)).toFixed(2)} MB
                  </div>
                  <div style={{ marginBottom: '10px', color: 'white' }}>
                    🎯 <strong>קבצים שיחולקו אוטומטית:</strong> {
                      projects.filter(p => {
                        const size = calculateProjectSize(p);
                        return size > storagePreferences.migrationThreshold * 1024 * 1024;
                      }).length
                    } פרויקטים
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginTop: '15px' }}>
                    💡 טיפ: העלה קובץ גדול מ-{storagePreferences.migrationThreshold}MB כדי לראות את המערכת מחלקת אותו אוטומטית לחלקים
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
          <div className="modal-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay') && !loading) {
              setShowBulkDeleteConfirm(false);
              setBulkDeleteType(null);
              setDeleteTranscriptions(false);
            }
          }}>
            <div className="modal-container small error-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">אישור מחיקה מרובה</h3>
                {!loading && (
                  <button className="modal-close" onClick={() => {
                    setShowBulkDeleteConfirm(false);
                    setBulkDeleteType(null);
                    setDeleteTranscriptions(false);
                  }}>×</button>
                )}
              </div>
              
              <div className="modal-body">
                <div className="confirmation-icon">⚠️</div>
                <div className="confirmation-message">
                  {bulkDeleteType === 'projects' 
                    ? `האם אתה בטוח שברצונך למחוק ${selectedProjects.size} פרויקטים?` 
                    : bulkDeleteType === 'media'
                    ? `האם אתה בטוח שברצונך למחוק ${selectedMedia.size} קבצי מדיה?`
                    : `האם אתה בטוח שברצונך למחוק ${selectedTranscriptions.size} תמלולים לצמיתות?`}
                </div>
                
                {/* Checkbox for delete transcriptions option */}
                {bulkDeleteType !== 'transcriptions' && (
                  <div className="delete-options" style={{ marginTop: '15px', textAlign: 'right' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}>
                      <span style={{ marginLeft: '8px' }}>מחק גם את התמלולים המשויכים</span>
                      <input 
                        type="checkbox" 
                        checked={deleteTranscriptions}
                        onChange={(e) => setDeleteTranscriptions(e.target.checked)}
                        disabled={loading}
                        style={{ cursor: 'pointer' }}
                      />
                    </label>
                    {!deleteTranscriptions && (
                      <p className="confirmation-submessage" style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                        התמלולים יועברו לארכיון ויהיו זמינים בלשונית "תמלולים"
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  className={'modal-btn modal-btn-danger' + (loading ? ' loading' : '')}
                  onClick={confirmBulkDelete}
                  disabled={loading}
                >
                  {loading ? '' : 'מחק'}
                </button>
                <button
                  className="modal-btn modal-btn-secondary"
                  onClick={() => {
                    setShowBulkDeleteConfirm(false);
                    setBulkDeleteType(null);
                    setDeleteTranscriptions(false);
                  }}
                  disabled={loading}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Custom Delete Confirmation Modal */}
        {showConfirmDialog && (
          <div className="modal-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay') && !loading) {
              setShowConfirmDialog(false);
              setDeleteTarget(null);
              setDeleteTranscriptions(false);
            }
          }}>
            <div className="modal-container small error-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">אישור מחיקה</h3>
                {!loading && (
                  <button className="modal-close" onClick={() => {
                    setShowConfirmDialog(false);
                    setDeleteTarget(null);
                    setDeleteTranscriptions(false);
                  }}>×</button>
                )}
              </div>
              
              <div className="modal-body">
                <div className="confirmation-icon">⚠️</div>
                <div className="confirmation-message">
                  {deleteTarget?.type === 'project' 
                    ? 'האם אתה בטוח שברצונך למחוק את הפרויקט?' 
                    : deleteTarget?.type === 'orphaned'
                    ? 'האם אתה בטוח שברצונך למחוק את התמלול לצמיתות?'
                    : 'האם אתה בטוח שברצונך למחוק את קובץ המדיה?'}
                </div>
                
                {/* Checkbox for delete transcriptions option */}
                {deleteTarget?.type !== 'orphaned' && (
                  <div className="delete-options" style={{ marginTop: '15px', textAlign: 'right' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }}>
                      <span style={{ marginLeft: '8px' }}>מחק גם את התמלולים המשויכים</span>
                      <input 
                        type="checkbox" 
                        checked={deleteTranscriptions}
                        onChange={(e) => setDeleteTranscriptions(e.target.checked)}
                        disabled={loading}
                        style={{ cursor: 'pointer' }}
                      />
                    </label>
                    {!deleteTranscriptions && (
                      <p className="confirmation-submessage" style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                        התמלולים יועברו לארכיון ויהיו זמינים בלשונית "תמלולים"
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  className={'modal-btn modal-btn-danger' + (loading ? ' loading' : '')}
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? '' : 'מחק'}
                </button>
                <button
                  className="modal-btn modal-btn-secondary"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setDeleteTarget(null);
                    setDeleteTranscriptions(false);
                  }}
                  disabled={loading}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keep Empty Folder Dialog */}
        {showKeepEmptyDialog && pendingDeleteParams && (
          <div className="keep-empty-dialog">
            <div className="modal-overlay" onClick={(e) => {
              if ((e.target as HTMLElement).classList.contains('modal-overlay') && !loading) {
                setShowKeepEmptyDialog(false);
                setPendingDeleteParams(null);
              }
            }}>
              <div className="modal-dialog">
                <div className="modal-header">
                  <h3>קובץ מדיה אחרון בפרויקט</h3>
                </div>

                <div className="modal-body">
                  <p className="confirmation-message">
                    זהו קובץ המדיה האחרון בפרויקט זה.
                  </p>
                  <p className="confirmation-submessage">
                    האם ברצונך לשמור את תיקיית הפרויקט הריקה או למחוק את כל הפרויקט?
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    className={'modal-btn modal-btn-primary' + (loading ? ' loading' : '')}
                    onClick={() => handleKeepEmptyChoice(true)}
                    disabled={loading}
                  >
                    {loading ? '' : 'שמור תיקייה ריקה'}
                  </button>
                  <button
                    className={'modal-btn modal-btn-danger' + (loading ? ' loading' : '')}
                    onClick={() => handleKeepEmptyChoice(false)}
                    disabled={loading}
                  >
                    {loading ? '' : 'מחק את כל הפרויקט'}
                  </button>
                  <button
                    className="modal-btn modal-btn-secondary"
                    onClick={() => {
                      setShowKeepEmptyDialog(false);
                      setPendingDeleteParams(null);
                    }}
                    disabled={loading}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        <ConfirmationModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
          }}
          onConfirm={() => {
            setShowSuccessModal(false);
          }}
          title="הפעולה הושלמה"
          message={successMessage}
          confirmText="אישור"
          type="success"
          showIcon={true}
        />
        
        {/* Error Modal */}
        <ConfirmationModal
          isOpen={showErrorModal}
          onClose={() => {
            setShowErrorModal(false);
          }}
          onConfirm={() => {
            setShowErrorModal(false);
          }}
          title="שגיאה"
          message={errorMessage}
          confirmText="סגור"
          type="danger"
          showIcon={true}
        />
        
        {/* Preview Dialog */}
        {previewDialog && (
          <div className="orphan-preview-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('orphan-preview-overlay') && !loading) {
              setPreviewDialog(null);
            }
          }}>
            <div className="orphan-preview-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="orphan-preview-header">
                <h2>תצוגה מקדימה של תמלול</h2>
                <button 
                  className="orphan-preview-close-btn"
                  onClick={() => setPreviewDialog(null)}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
              
              <div className="orphan-preview-body">
                {/* Content section - moved to top */}
                <div className="orphan-preview-content-section">
                  <div className="orphan-preview-content">
                    <pre>{previewDialog.content}</pre>
                  </div>
                </div>
                
                {/* Metadata section - moved to bottom */}
                {previewDialog.metadata && Object.keys(previewDialog.metadata).length > 0 && (
                  <div className="orphan-preview-metadata">
                    <h3>פרטי התמלול</h3>
                    <div className="orphan-metadata-grid">
                      {previewDialog.metadata.fileName && (
                        <div className="orphan-metadata-item">
                          <span className="orphan-metadata-label">שם קובץ:</span>
                          <span className="orphan-metadata-value">{previewDialog.metadata.fileName}</span>
                        </div>
                      )}
                      {previewDialog.metadata.duration && (
                        <div className="orphan-metadata-item">
                          <span className="orphan-metadata-label">משך:</span>
                          <span className="orphan-metadata-value">
                            {Math.floor(previewDialog.metadata.duration / 60)}:{String(Math.floor(previewDialog.metadata.duration % 60)).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                      {previewDialog.metadata.createdAt && (
                        <div className="orphan-metadata-item">
                          <span className="orphan-metadata-label">נוצר בתאריך:</span>
                          <span className="orphan-metadata-value">
                            {new Date(previewDialog.metadata.createdAt).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="orphan-preview-footer">
                <button
                  className="orphan-preview-btn orphan-preview-btn-secondary"
                  onClick={() => setPreviewDialog(null)}
                  disabled={loading}
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Restoration Dialog */}
        {restorationDialog && !restorationDialog.showPositionDialog && (
          <div className="orphan-restore-overlay">
            <div className="orphan-restore-dialog">
              <div className="orphan-restore-header">
                <h2>שחזור תמלול</h2>
                <button 
                  className="orphan-restore-close"
                  onClick={() => setRestorationDialog(null)}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
              
              <div className="orphan-restore-body">
                {restorationDialog.matchingMedia.length === 0 ? (
                  <div className="no-matching-media">
                    <p>לא נמצאו קבצי מדיה תואמים לשם "{restorationDialog.transcription.originalMediaName}"</p>
                    <p className="help-text">העלה את הקובץ לפרויקט כדי לשחזר את התמלול</p>
                  </div>
                ) : (
                  <>
                    <p>בחר את המדיה שאליה תרצה לשחזר את התמלול:</p>
                    <div className="matching-media-list">
                      {restorationDialog.matchingMedia.map((media, index) => (
                        <div key={index} className="matching-media-item">
                          <div className="media-info">
                            <div className="project-name">{media.projectName}</div>
                            <div className="media-name">{media.mediaName}</div>
                          </div>
                          <div className="restore-actions">
                            <button
                              className="orphan-restore-btn orphan-restore-btn-primary"
                              onClick={() => {
                                // Check if target has existing transcription
                                setRestorationDialog({ ...restorationDialog, mode: 'override' });
                                handleRestoreConfirm(media.projectId, media.mediaId, 'override');
                              }}
                              disabled={loading}
                            >
                              החלף תמלול קיים
                            </button>
                            <button
                              className="orphan-restore-btn orphan-restore-btn-secondary"
                              onClick={() => {
                                setRestorationDialog({ 
                                  ...restorationDialog, 
                                  mode: 'append',
                                  showPositionDialog: true,
                                  pendingTarget: { projectId: media.projectId, mediaId: media.mediaId }
                                });
                              }}
                              disabled={loading}
                            >
                              הוסף לתמלול קיים
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  className="modal-btn modal-btn-secondary"
                  onClick={() => setRestorationDialog(null)}
                  disabled={loading}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Position Selection Dialog for Append Mode */}
        {restorationDialog && restorationDialog.showPositionDialog && restorationDialog.pendingTarget && (
          <div className="orphan-restore-overlay">
            <div className="orphan-restore-dialog" style={{ maxWidth: '400px' }}>
              <div className="orphan-restore-header">
                <h2>בחר מיקום להוספת התמלול</h2>
                <button 
                  className="orphan-restore-close"
                  onClick={() => setRestorationDialog(null)}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
              
              <div className="orphan-restore-body" style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ marginBottom: '20px', fontSize: '16px' }}>
                  איפה ברצונך להוסיף את התמלול השמור?
                </p>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    className="orphan-restore-btn orphan-restore-btn-primary"
                    onClick={() => {
                      const { pendingTarget } = restorationDialog;
                      setRestorationDialog({ ...restorationDialog, showPositionDialog: false });
                      handleRestoreConfirm(pendingTarget.projectId, pendingTarget.mediaId, 'append', 'before');
                    }}
                    disabled={loading}
                    style={{ minWidth: '120px' }}
                  >
                    בתחילת התמלול
                  </button>
                  
                  <button
                    className="orphan-restore-btn orphan-restore-btn-primary"
                    onClick={() => {
                      const { pendingTarget } = restorationDialog;
                      setRestorationDialog({ ...restorationDialog, showPositionDialog: false });
                      handleRestoreConfirm(pendingTarget.projectId, pendingTarget.mediaId, 'append', 'after');
                    }}
                    disabled={loading}
                    style={{ minWidth: '120px' }}
                  >
                    בסוף התמלול
                  </button>
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  className="modal-btn modal-btn-secondary"
                  onClick={() => setRestorationDialog(null)}
                  disabled={loading}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}