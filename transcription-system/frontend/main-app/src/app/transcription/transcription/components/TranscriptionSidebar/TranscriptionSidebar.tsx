'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import useProjectStore from '@/lib/stores/projectStore';
import './TranscriptionSidebar.css';
import { buildApiUrl } from '@/utils/api';
import { SingleMediaUploadModal } from './SingleMediaUploadModal';

export interface TranscriptionSidebarProps {
  onOpenManagementModal?: (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => void;
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
}

const TranscriptionSidebar = forwardRef((props: TranscriptionSidebarProps, ref) => {
  console.log('[TranscriptionSidebar] Component function called');
  
  const [isMounted, setIsMounted] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{
    quotaLimitMB: number;
    quotaUsedMB: number;
    usedPercent: number;
  } | null>(null);
  
  // Inline notification state
  const [sidebarNotification, setSidebarNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'loading';
    progress?: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Duplicate confirmation state for media
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    projectId: string;
    files: File[];
    existingMedia: any;
  } | null>(null);
  
  // Duplicate project confirmation state
  const [duplicateProjectConfirm, setDuplicateProjectConfirm] = useState<{
    type: 'exact' | 'partial';
    existingProject: any;
    missingInProject?: string[];
    files: File[];
    folderName: string;
  } | null>(null);
  
  // Transcription selection state
  const [transcriptionSelection, setTranscriptionSelection] = useState<{
    transcriptions: any[];
    selectedIds: Set<string>;
    loading: boolean;
    formData: FormData;
    folderName: string;
    files: File[];
  } | null>(null);
  
  // Single media upload modal state
  const [showSingleMediaModal, setShowSingleMediaModal] = useState(false);
  
  const { 
    projects,
    currentProject,
    currentMedia,
    currentMediaId,
    isLoading,
    error,
    loadProjects,
    setCurrentProject,
    setCurrentMedia,
    setCurrentMediaById,
    createProjectFromFolder,
    addMediaToProject,
    setError
  } = useProjectStore();
  
  console.log('[TranscriptionSidebar] Store accessed successfully');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const addMediaInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Helper function to show sidebar notifications
  const showSidebarNotification = (message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info', autoHide: boolean = true) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    
    setSidebarNotification({ message, type });
    
    // Auto-hide after 4 seconds for non-loading notifications
    if (autoHide && type !== 'loading') {
      notificationTimeoutRef.current = setTimeout(() => {
        setSidebarNotification(null);
      }, 4000);
    }
  };
  
  const hideSidebarNotification = () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setSidebarNotification(null);
  };
  
  // Load orphaned transcriptions count
  useEffect(() => {
    const loadOrphanedCount = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        const response = await fetch(buildApiUrl('/api/projects/orphaned/transcriptions'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrphanedCount(data.transcriptions?.length || 0);
        }
      } catch (error) {
        console.error('Failed to load orphaned transcriptions count:', error);
      }
    };
    
    loadOrphanedCount();
  }, [projects]); // Reload when projects change

  // Load user storage info function
  const loadStorageInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token || token === 'dev-anonymous') {
        // Don't try to load storage for anonymous users
        return;
      }
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(buildApiUrl('/api/auth/storage'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.storage) {
            setStorageInfo(data.storage);
          }
        } else if (response.status === 401) {
          // Token is invalid, don't keep trying
          console.log('Storage info not available - user not authenticated');
        } else if (response.status === 404) {
          // Endpoint not found - backend might not support this yet
          console.log('Storage endpoint not available');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.log('Storage info request timed out');
        } else {
          // Network error - backend might be down
          console.log('Backend not reachable - storage info unavailable');
        }
      }
    } catch (error) {
      // Silent fail - don't log to console
    }
  }, []);

  // Load projects and user storage info on mount only
  useEffect(() => {
    loadProjects(); // Load projects from backend
    loadStorageInfo();
    // Refresh storage info every 30 seconds
    const intervalId = setInterval(loadStorageInfo, 30000);
    return () => {
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Expose the refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshStorage: loadStorageInfo
  }));
  
  // Also expose globally for easy access
  useEffect(() => {
    (window as any).refreshSidebarStorage = loadStorageInfo;
    return () => {
      delete (window as any).refreshSidebarStorage;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Set mounted state
  useEffect(() => {
    console.log('[TranscriptionSidebar] Component mounted');
    console.log('[TranscriptionSidebar] Initial isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Initial projects:', projects.length);
    setIsMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Log when projects change and auto-select first project if none selected
  useEffect(() => {
    console.log('[TranscriptionSidebar] Projects changed:', projects.length, 'projects');
    console.log('[TranscriptionSidebar] Current isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Current error:', error);
    if (projects.length > 0) {
      console.log('[TranscriptionSidebar] First project:', projects[0].projectId);
      
      // Auto-select first project if no project is currently selected
      if (!currentProject && projects[0]) {
        console.log('[TranscriptionSidebar] Auto-selecting first project:', projects[0].projectId);
        setCurrentProject(projects[0]);
        
        // DISABLED: Auto-loading first media causes data loss after restoration
        // Users should manually select which media to work on
        // if (projects[0].mediaFiles && projects[0].mediaFiles.length > 0) {
        //   const firstMediaId = projects[0].mediaFiles[0];
        //   console.log('[TranscriptionSidebar] Auto-loading first media:', firstMediaId);
        //   setCurrentMediaById(projects[0].projectId, firstMediaId);
        // }
      }
    }
  }, [projects, isLoading, error, currentProject, setCurrentProject, setCurrentMediaById]);
  
  const handleFolderUpload = async () => {
    console.log('[TranscriptionSidebar] handleFolderUpload called');
    console.log('[TranscriptionSidebar] folderInputRef.current:', folderInputRef.current);
    
    // Directly open the folder selection dialog
    if (folderInputRef.current) {
      console.log('[TranscriptionSidebar] Clicking folder input');
      folderInputRef.current.click();
    } else {
      console.error('[TranscriptionSidebar] folderInputRef.current is null');
      showSidebarNotification('שגיאה בפתיחת חלון בחירת תיקייה', 'error');
    }
  };
  
  const handleAddMediaClick = (projectId: string) => {
    // Trigger the file input for this specific project
    const inputRef = addMediaInputRefs.current[projectId];
    if (inputRef) {
      inputRef.click();
    }
  };
  
  const handleAddMediaSelected = async (event: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    console.log('[TranscriptionSidebar] handleAddMediaSelected called for project:', projectId);
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      // Filter for media files only
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        file.type.startsWith('video/')
      );
      
      if (mediaFiles.length === 0) {
        showSidebarNotification('לא נמצאו קבצי מדיה בקבצים שנבחרו', 'error');
        return;
      }
      
      // Create FormData for upload
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Send filenames separately to preserve UTF-8 encoding
      const fileNames = mediaFiles.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      mediaFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Show loading notification
      setIsUploading(true);
      showSidebarNotification('מוסיף קבצי מדיה לפרויקט...', 'loading', false);
      
      // Try to add media
      const result = await addMediaToProject(projectId, formData);
      
      if (result) {
        if (result.isDuplicate) {
          // Store duplicate info for confirmation - store actual file objects
          setDuplicateConfirm({
            projectId,
            files: mediaFiles, // Store the actual File objects array, not FileList
            existingMedia: result.existingMedia
          });
          
          // Show duplicate notification
          hideSidebarNotification();
          // The confirmation dialog will be shown in the render
        } else if (result.success) {
          showSidebarNotification(`${mediaFiles.length} קבצי מדיה נוספו בהצלחה`, 'success');
          
          // Reload projects to update file count and storage
          await loadProjects();
          
          // Auto-select the first new media if available
          if (result.newMediaIds && result.newMediaIds.length > 0) {
            const firstNewMediaId = result.newMediaIds[0];
            await setCurrentMediaById(projectId, firstNewMediaId);
          }
        }
      } else {
        showSidebarNotification('שגיאה בהוספת קבצי המדיה', 'error');
      }
      
    } catch (error: any) {
      console.log('[TranscriptionSidebar] Error adding media:', error.message);
      showSidebarNotification('שגיאה לא צפויה', 'error');
    } finally {
      setIsUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
      
      // Hide loading notification after a delay if still showing
      if (sidebarNotification?.type === 'loading') {
        setTimeout(() => hideSidebarNotification(), 500);
      }
    }
  };
  
  const handleDuplicateProjectConfirm = async (action: 'create' | 'addMissing' | 'useExisting' | 'cancel') => {
    if (!duplicateProjectConfirm) return;
    
    const { existingProject } = duplicateProjectConfirm;
    
    if (action === 'create') {
      // Create anyway with force flag
      const { files, folderName } = duplicateProjectConfirm;
      
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      formData.append('folderName', folderName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      formData.append('force', 'true'); // Force creation
      
      const fileNames = files.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      setIsUploading(true);
      showSidebarNotification('יוצר פרויקט חדש...', 'loading', false);
      
      const newProject = await createProjectFromFolder(formData);
      
      if (newProject && !newProject.error) {
        showSidebarNotification(`הפרויקט "${folderName}" נוצר בהצלחה`, 'success');
        setCurrentProject(newProject);
        
        if (newProject.mediaFiles && newProject.mediaFiles.length > 0) {
          await setCurrentMediaById(newProject.projectId, newProject.mediaFiles[0]);
        }
      } else {
        showSidebarNotification('שגיאה ביצירת הפרויקט', 'error');
      }
      
      setIsUploading(false);
      setDuplicateProjectConfirm(null);
      
    } else if (action === 'addMissing' && duplicateProjectConfirm.type === 'partial') {
      // Add only missing files to existing project
      const { existingProject, missingInProject, files, folderName } = duplicateProjectConfirm;
      
      // Filter to only include files that are actually missing - declare here for broader scope
      const missingFiles = files.filter(file => missingInProject.includes(file.name));
      const missingFileNames = missingFiles.map(f => f.name);
      
      const formData = new FormData();
      formData.append('missingFiles', JSON.stringify(missingInProject));
      
      console.log(`[AddMissing] Filtering ${files.length} files to ${missingFiles.length} missing files:`, missingFileNames);
      
      formData.append('fileNames', JSON.stringify(missingFileNames));
      
      missingFiles.forEach(file => {
        formData.append('files', file);
      });
      
      setIsUploading(true);
      showSidebarNotification('מוסיף קבצים חסרים...', 'loading', false);
      
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        const response = await fetch(buildApiUrl(`/api/projects/${existingProject.projectId}/add-missing-media`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          showSidebarNotification(result.message || 'הקבצים החסרים נוספו בהצלחה', 'success');
          
          // Reload projects to get updated metadata
          await loadProjects();
          
          // Select the updated project
          const updatedProjects = await loadProjects();
          const updatedProject = updatedProjects?.find((p: any) => p.projectId === existingProject.projectId);
          if (updatedProject) {
            setCurrentProject(updatedProject);
          }
        } else {
          showSidebarNotification('שגיאה בהוספת הקבצים החסרים', 'error');
        }
      } catch (error) {
        console.error('Error adding missing media:', error);
        showSidebarNotification('שגיאה בהוספת הקבצים החסרים', 'error');
      }
      
      setIsUploading(false);
      setDuplicateProjectConfirm(null);
    } else if (action === 'useExisting') {
      // Use existing project (for complete duplicates)
      if (duplicateProjectConfirm.hasArchivedTranscriptions && duplicateProjectConfirm.archivedTranscriptions && existingProject) {
        setDuplicateProjectConfirm(null);
        
        const { files, folderName } = duplicateProjectConfirm;
        const formData = new FormData();
        formData.append('folderName', folderName || existingProject.name);
        
        // Archived transcriptions functionality has been moved to Project Management Modal
        console.log('Archived transcriptions found but restoration during upload is disabled');
        // Just select the existing project
        setCurrentProject(existingProject);
        if (existingProject.mediaFiles && existingProject.mediaFiles.length > 0) {
          await setCurrentMediaById(existingProject.projectId, existingProject.mediaFiles[0]);
        }
        showSidebarNotification('משתמש בפרויקט הקיים', 'success');
      } else {
        // Just select the existing project
        setCurrentProject(existingProject);
        if (existingProject.mediaFiles && existingProject.mediaFiles.length > 0) {
          await setCurrentMediaById(existingProject.projectId, existingProject.mediaFiles[0]);
        }
        showSidebarNotification('משתמש בפרויקט הקיים', 'success');
      }
    }
    
    // Clear duplicate project confirmation state (unless we're showing archived dialog)
    if (!duplicateProjectConfirm.hasArchivedTranscriptions || action === 'cancel') {
      setDuplicateProjectConfirm(null);
    }
  };
  
  // Archived transcription restoration has been moved to Project Management Modal
  
  const handleTranscriptionSelectionConfirm = async () => {
    if (!transcriptionSelection || transcriptionSelection.selectedIds.size === 0) {
      showSidebarNotification('אנא בחר לפחות תמלול אחד', 'error');
      return;
    }
    
    const { formData, folderName, files, selectedIds, existingProjectId } = transcriptionSelection;
    setTranscriptionSelection(null);
    setIsUploading(true);
    
    // Check if we're restoring to an existing project or creating new
    if (existingProjectId) {
      showSidebarNotification('מוסיף קבצי מדיה לפרויקט קיים...', 'loading', false);
      
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous';
        
        // First, add the uploaded media files to the existing project
        const addMediaFormData = new FormData();
        const fileNames = files.map(f => f.name);
        
        // Pass the missing files list to the backend
        // The backend needs to know which files are actually missing from the project
        addMediaFormData.append('fileNames', JSON.stringify(fileNames));
        addMediaFormData.append('missingFiles', JSON.stringify(fileNames)); // Add this line to specify which files to add
        
        files.forEach(file => {
          addMediaFormData.append('files', file);
        });
        
        const addMediaResponse = await fetch(buildApiUrl(`/api/projects/${existingProjectId}/add-missing-media`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: addMediaFormData
        });
        
        if (addMediaResponse.status === 409) {
          // Duplicates found, ask user for confirmation
          const duplicateInfo = await addMediaResponse.json();
          const confirmMessage = duplicateInfo.message || 'נמצאו קבצים כפולים. האם להמשיך?';
          
          if (window.confirm(confirmMessage)) {
            // User confirmed, retry with confirmation flag
            addMediaFormData.append('confirmDuplicates', 'true');
            const retryResponse = await fetch(buildApiUrl(`/api/projects/${existingProjectId}/add-missing-media`), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: addMediaFormData
            });
            
            if (!retryResponse.ok) {
              const error = await retryResponse.json().catch(() => ({ error: 'שגיאה בהוספת קבצי המדיה' }));
              throw new Error(error.error || 'שגיאה בהוספת קבצי המדיה');
            }
          } else {
            // User cancelled
            showSidebarNotification('הפעולה בוטלה', 'info');
            setIsUploading(false);
            return;
          }
        } else if (!addMediaResponse.ok) {
          const error = await addMediaResponse.json().catch(() => ({ error: 'שגיאה בהוספת קבצי המדיה' }));
          throw new Error(error.error || 'שגיאה בהוספת קבצי המדיה');
        }
        
        // Only restore transcriptions if user explicitly selected some
        if (selectedIds && selectedIds.size > 0) {
          showSidebarNotification('משחזר תמלולים לפרויקט...', 'loading', false);
          
          const response = await fetch(buildApiUrl(`/api/projects/${existingProjectId}/restore-transcriptions`), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              selectedTranscriptionIds: Array.from(selectedIds)
            })
          });
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'שגיאה בשחזור התמלולים' }));
            throw new Error(error.error || 'שגיאה בשחזור התמלולים');
          }
          
          const result = await response.json();
          showSidebarNotification('הקבצים והתמלולים נוספו בהצלחה לפרויקט הקיים', 'success');
        } else {
          // Just adding media without restoring transcriptions
          showSidebarNotification('הקבצים נוספו בהצלחה לפרויקט הקיים', 'success');
        }
        
        // Refresh projects to get updated media list
        await loadProjects();
        
        // Find and select the existing project
        const existingProject = projects.find(p => p.projectId === existingProjectId);
        if (existingProject) {
          setCurrentProject(existingProject);
          if (existingProject.mediaFiles && existingProject.mediaFiles.length > 0) {
            await setCurrentMediaById(existingProject.projectId, existingProject.mediaFiles[0]);
          }
        }
      } catch (error: any) {
        console.error('Error adding media/restoring transcriptions:', error);
        showSidebarNotification(error.message || 'שגיאה בהוספת הקבצים לפרויקט', 'error');
      } finally {
        setIsUploading(false);
      }
      return;
    }
    
    // Create new project with transcriptions
    showSidebarNotification('יוצר פרויקט ומשחזר תמלולים...', 'loading', false);
    
    try {
      // Create new FormData
      const newFormData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      newFormData.append('folderName', folderName);
      newFormData.append('computerId', computerId);
      newFormData.append('computerName', computerName);
      newFormData.append('force', 'true');
      newFormData.append('restoreArchived', 'true');
      newFormData.append('selectedTranscriptionIds', JSON.stringify(Array.from(selectedIds)));
      
      const fileNames = files.map(f => f.name);
      newFormData.append('fileNames', JSON.stringify(fileNames));
      
      files.forEach(file => {
        newFormData.append('files', file);
      });
      
      const newResult = await createProjectFromFolder(newFormData);
      
      if (newResult && !newResult.error) {
        showSidebarNotification(`הפרויקט "${folderName}" נוצר בהצלחה עם התמלולים המשוחזרים`, 'success');
        setCurrentProject(newResult);
        if (newResult.mediaFiles && newResult.mediaFiles.length > 0) {
          await setCurrentMediaById(newResult.projectId, newResult.mediaFiles[0]);
        }
      } else if (newResult && newResult.error === 'storage_limit' && newResult.storageDetails) {
        const { currentUsedMB, limitMB, requestedMB } = newResult.storageDetails;
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'error');
      } else {
        showSidebarNotification('שגיאה ביצירת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error creating project with selected transcriptions:', error);
      showSidebarNotification('שגיאה ביצירת הפרויקט', 'error');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDuplicateConfirm = async (confirm: boolean) => {
    if (!duplicateConfirm) return;
    
    if (confirm) {
      // Re-submit with force flag
      const { projectId, files } = duplicateConfirm;
      
      // Recreate FormData
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Files are already filtered media files stored as an array
      const mediaFiles = files; // Already an array of File objects
      
      const fileNames = mediaFiles.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      mediaFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Show loading notification
      setIsUploading(true);
      showSidebarNotification('מוסיף קבצי מדיה לפרויקט...', 'loading', false);
      
      // Add with force flag
      const result = await addMediaToProject(projectId, formData, true);
      
      if (result && result.success) {
        showSidebarNotification('קבצי המדיה נוספו בהצלחה', 'success');
        
        // Auto-select the first new media
        if (result.newMediaIds && result.newMediaIds.length > 0) {
          const firstNewMediaId = result.newMediaIds[0];
          await setCurrentMediaById(projectId, firstNewMediaId);
        }
      } else {
        showSidebarNotification('שגיאה בהוספת קבצי המדיה', 'error');
      }
      
      setIsUploading(false);
    }
    
    // Clear duplicate confirmation state
    setDuplicateConfirm(null);
  };
  
  // Helper functions for statistics
  const getTotalTranscriptions = () => {
    return orphanedCount; // Show orphaned transcriptions count instead
  };

  const getStorageColor = (percent: number) => {
    if (percent < 50) return '#4CAF50';
    if (percent < 70) return '#66BB6A';
    if (percent < 85) return '#388E3C';
    return '#1B5E20';
  };
  
  const getTotalDuration = () => {
    // Calculate total duration from all media files
    let totalSeconds = 0;
    projects.forEach(project => {
      if (project.mediaInfo) {
        project.mediaInfo.forEach(media => {
          totalSeconds += media.duration || 0;
        });
      }
    });
    
    // Format duration as HH:MM:SS
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    // Always return in HH:MM:SS format, default to 00:00:00 if no duration
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleStatClick = (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => {
    if (props.onOpenManagementModal) {
      props.onOpenManagementModal(tab);
    }
  };
  
  const handleProjectDelete = async (projectId: string, deleteTranscriptions: boolean) => {
    if (props.onProjectDelete) {
      return props.onProjectDelete(projectId, deleteTranscriptions);
    }
    // Default implementation if no handler provided
    try {
      const response = await fetch(buildApiUrl(`/api/projects/${projectId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showSidebarNotification('הפרויקט נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה במחיקת הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showSidebarNotification('שגיאה במחיקת הפרויקט', 'error');
    }
  };
  
  const handleMediaDelete = async (projectId: string, mediaId: string, deleteTranscriptions: boolean) => {
    if (props.onMediaDelete) {
      return props.onMediaDelete(projectId, mediaId, deleteTranscriptions);
    }
    // Default implementation if no handler provided
    try {
      const response = await fetch(buildApiUrl(`/api/projects/${projectId}/media/${mediaId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleteTranscription: deleteTranscriptions })
      });
      
      if (response.ok) {
        showSidebarNotification('קובץ המדיה נמחק בהצלחה', 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה במחיקת קובץ המדיה', 'error');
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      showSidebarNotification('שגיאה במחיקת קובץ המדיה', 'error');
    }
  };
  
  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[TranscriptionSidebar] handleFilesSelected called');
    console.log('[TranscriptionSidebar] Event:', event);
    console.log('[TranscriptionSidebar] Event target:', event.target);
    const files = event.target.files;
    console.log('[TranscriptionSidebar] Files selected:', files?.length || 0);
    if (!files || files.length === 0) {
      console.log('[TranscriptionSidebar] No files selected, returning');
      showSidebarNotification('לא נבחרו קבצים', 'error');
      return;
    }
    
    try {
      // Extract folder name from path
      let folderName = 'New Project';
      if (files[0] && 'webkitRelativePath' in files[0]) {
        const path = (files[0] as any).webkitRelativePath;
        folderName = path.split('/')[0];
      }
      
      // Filter for media files only
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        file.type.startsWith('video/')
      );
      
      if (mediaFiles.length === 0) {
        showSidebarNotification('לא נמצאו קבצי מדיה בתיקייה שנבחרה', 'error');
        return;
      }
      
      // Create FormData for upload
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Unknown';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      formData.append('folderName', folderName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Send filenames separately to preserve UTF-8 encoding
      const fileNames = mediaFiles.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      mediaFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Show loading notification
      setIsUploading(true);
      showSidebarNotification('טוען פרויקט...', 'loading', false);
      
      // Use the store method to create project
      console.log('[TranscriptionSidebar] About to call createProjectFromFolder with formData:', formData);
      let result = await createProjectFromFolder(formData);
      console.log('[TranscriptionSidebar] createProjectFromFolder returned:', result);
      
      // Check if it's a duplicate project response
      if (result && result.isDuplicateProject) {
        // Check if there are also archived transcriptions
        if (result.hasArchivedTranscriptions) {
          // Store both duplicate and archived info - handle duplicate first, then archived
          setDuplicateProjectConfirm({
            type: result.duplicateType,
            existingProject: result.existingProject,
            missingInProject: result.missingInProject,
            files: mediaFiles,
            folderName,
            // Store archived info to handle after duplicate decision
            archivedTranscriptions: result.archivedTranscriptions,
            hasArchivedTranscriptions: true
          });
        } else {
        setIsUploading(false);
        hideSidebarNotification();
        
          // Store the duplicate project info without archived transcriptions
          setDuplicateProjectConfirm({
            type: result.duplicateType,
            existingProject: result.existingProject,
            missingInProject: result.missingInProject,
            files: mediaFiles,
            folderName,
            hasArchivedTranscriptions: false
          });
        }
        
        setIsUploading(false);
        hideSidebarNotification();
        console.log('[TranscriptionSidebar] Duplicate project detected:', result);
        return;
      }
      
      // Check if archived transcriptions were found (without duplicate)
      if (result && result.hasArchivedTranscriptions && !result.projectId) {
        // Archived transcriptions found but project not created yet
        // We need to recreate the request with force flag to create the project
        console.log('[TranscriptionSidebar] Archived transcriptions found, creating project with force flag');
        
        // Recreate formData with force flag
        const newFormData = new FormData();
        newFormData.append('folderName', folderName);
        newFormData.append('computerId', localStorage.getItem('computerId') || generateComputerId());
        newFormData.append('computerName', localStorage.getItem('computerName') || 'Unknown');
        newFormData.append('force', 'true'); // Force creation despite archived transcriptions
        newFormData.append('fileNames', JSON.stringify(fileNames));
        
        mediaFiles.forEach(file => {
          newFormData.append('files', file);
        });
        
        // Create project with force flag
        const forcedResult = await createProjectFromFolder(newFormData);
        
        if (forcedResult && !forcedResult.error) {
          showSidebarNotification('נמצאו תמלולים ארכיביים. ניתן לשחזר אותם מחלון ניהול הפרויקטים', 'info');
          result = forcedResult; // Use the forced result for the rest of the logic
        } else {
          showSidebarNotification('שגיאה ביצירת הפרויקט', 'error');
          setIsUploading(false);
          return;
        }
      }
      
      // Check if it's an error response
      if (result && result.error === 'storage_limit' && result.storageDetails) {
        const { currentUsedMB, limitMB, requestedMB } = result.storageDetails;
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'info');
        console.log('[TranscriptionSidebar] Storage limit reached:', result.storageDetails);
      } else if (result && !result.error) {
        showSidebarNotification(`הפרויקט "${folderName}" נוצר בהצלחה`, 'success');
        console.log('[TranscriptionSidebar] Project created successfully:', result);
        
        // Auto-select the new project and its first media
        console.log('[TranscriptionSidebar] Auto-selecting new project:', result.projectId);
        setCurrentProject(result);
        
        if (result.mediaFiles && result.mediaFiles.length > 0) {
          const firstMediaId = result.mediaFiles[0];
          console.log('[TranscriptionSidebar] Auto-selecting first media:', firstMediaId);
          await setCurrentMediaById(result.projectId, firstMediaId);
        }
      } else {
        // Generic error - check store error for more details
        const storeError = error || 'שגיאה ביצירת הפרויקט';
        showSidebarNotification(storeError, 'info');
        console.log('[TranscriptionSidebar] Project creation failed');
      }
      
    } catch (error: any) {
      // This should rarely happen now since we're not throwing in the store
      console.log('[TranscriptionSidebar] Unexpected error:', error.message);
      showSidebarNotification('שגיאה לא צפויה', 'info');
    } finally {
      setIsUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
      
      // Hide loading notification after a delay if still showing
      if (sidebarNotification?.type === 'loading') {
        setTimeout(() => hideSidebarNotification(), 500);
      }
    }
  };
  
  const generateComputerId = () => {
    const fingerprint = [
      navigator.platform,
      navigator.language,
      navigator.hardwareConcurrency,
      screen.width,
      screen.height
    ].join('-');
    return btoa(fingerprint).substring(0, 16);
  };
  
  const handleSingleMediaUpload = async (file: File, projectName: string) => {
    console.log('[TranscriptionSidebar] handleSingleMediaUpload called with:', file.name, projectName);
    
    try {
      // Show loading notification
      showSidebarNotification('מעלה קובץ מדיה...', 'loading');
      
      // Create FormData
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Web Single Upload';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      // Add the single file to FormData
      formData.append('files', file);
      formData.append('folderName', projectName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Use existing createProjectFromFolder method
      const response = await createProjectFromFolder(formData);
      
      if (response.success) {
        console.log('[TranscriptionSidebar] Single media project created:', response.projectId);
        showSidebarNotification(`פרויקט "${projectName}" נוצר בהצלחה`, 'success');
        
        // Refresh project list
        await fetchProjects();
        
        // Auto-select the new project
        const newProject = projects.find(p => p.projectId === response.projectId);
        if (newProject) {
          setCurrentProject(newProject);
        }
      } else {
        throw new Error(response.message || 'Failed to create project');
      }
    } catch (error: any) {
      console.error('[TranscriptionSidebar] Single media upload error:', error);
      
      // Handle duplicate project error
      if (error.response?.data?.isDuplicate) {
        const existingProject = error.response.data.existingProject;
        showSidebarNotification(
          `פרויקט עם אותם קבצים כבר קיים: ${existingProject.name}`,
          'error'
        );
      } else {
        showSidebarNotification(
          error.message || 'שגיאה בהעלאת הקובץ',
          'error'
        );
      }
      throw error; // Re-throw to let modal handle it
    }
  };
  
  return (
    <>
      <div className="transcription-sidebar-content">
        {/* Upload button at top of sidebar */}
      <div className="sidebar-upload-section">
        <button 
          className="sidebar-upload-button"
          onClick={handleFolderUpload}
          title="הוסף פרויקט חדש"
        >
          <span className="upload-plus">+</span>
          <span className="upload-text">פרויקט חדש</span>
        </button>
        <button 
          className="sidebar-media-button"
          onClick={() => setShowSingleMediaModal(true)}
          title="הוסף מדיה בודדת"
        >
          <span className="media-icon">🎵</span>
          <span className="media-text">הוסף מדיה</span>
        </button>
      </div>
      
      <div className="sidebar-stats">
        <h3 className="sidebar-stats-title">סטטיסטיקות</h3>
        <div className="sidebar-stats-grid">
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('projects')}>
            <div className="sidebar-stat-number">{projects.length}</div>
            <div className="sidebar-stat-label">פרויקטים</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('transcriptions')}>
            <div className="sidebar-stat-number">{getTotalTranscriptions()}</div>
            <div className="sidebar-stat-label">תמלולים</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('duration')}>
            <div className="sidebar-stat-number">{getTotalDuration()}</div>
            <div className="sidebar-stat-label">משך כולל</div>
          </div>
          <div className="sidebar-stat-item clickable" onClick={() => handleStatClick('progress')}>
            <div className="sidebar-stat-number">-</div>
            <div className="sidebar-stat-label">התקדמות</div>
          </div>
        </div>
      </div>

      {/* Storage Display */}
      {storageInfo && (
        <div className="sidebar-storage" title="אחסון">
          <div className="storage-info-display">
            <div className="storage-text-compact">
              <div className="storage-size-display">
                <span className="storage-used">{storageInfo.quotaUsedMB}MB</span>
                <span className="storage-separator"> / </span>
                <span className="storage-total">{storageInfo.quotaLimitMB}MB</span>
              </div>
            </div>
            <div className="storage-progress-bar-compact">
              <div 
                className="storage-progress-fill"
                style={{
                  width: `${Math.min(storageInfo.usedPercent, 100)}%`,
                  backgroundColor: getStorageColor(storageInfo.usedPercent)
                }}
              />
              <div className="storage-progress-text">
                {Math.round(storageInfo.usedPercent)}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Inline Notification Area */}
      {sidebarNotification && (
        <div className={`sidebar-notification sidebar-notification-${sidebarNotification.type}`}>
          {sidebarNotification.type === 'loading' && (
            <div className="notification-progress-bar">
              <div className="notification-progress-fill" />
            </div>
          )}
          <div className="notification-message">
            {sidebarNotification.message}
          </div>
        </div>
      )}
      
      <div className="project-list">
        {projects.length === 0 && !isLoading ? (
          <div className="empty-projects">
            <p>אין פרויקטים</p>
            <p className="hint">העלה תיקייה עם קבצי מדיה כדי ליצור פרויקט חדש</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.length > 0 && (
              <h3 className="projects-title">פרויקטים ({projects.length})</h3>
            )}
            {projects.map(project => (
              <div 
                key={project.projectId} 
                className={`project-item ${currentProject?.projectId === project.projectId ? 'active' : ''}`}
                onClick={async () => {
                  setCurrentProject(project);
                  // DISABLED: Auto-load first media causes issues after restoration
                  // Users should manually select which media to work on
                  // if (project.mediaFiles && project.mediaFiles.length > 0) {
                  //   const firstMediaId = project.mediaFiles[0];
                  //   await setCurrentMediaById(project.projectId, firstMediaId);
                  // }
                }}
              >
                <div className="project-header">
                  <span className="project-name">{project.displayName}</span>
                </div>
                <div className="project-meta">
                  <div className="media-info">
                    <span className="media-count">{project.totalMedia} קבצים</span>
                    <span className="separator">·</span>
                    <button 
                      className="add-media-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMediaClick(project.projectId);
                      }}
                      title="הוסף קובץ"
                      disabled={isUploading}
                    >
                      הוסף קובץ
                    </button>
                  </div>
                  <span className="project-date">
                    {new Date(project.lastModified).toLocaleDateString('he-IL')}
                  </span>
                </div>
                {currentProject?.projectId === project.projectId && (
                  <div className="media-list">
                    {project.mediaFiles.map((mediaId, index) => (
                      <div 
                        key={`sidebar-${project.projectId}-${mediaId}-${index}`} 
                        className={`media-item ${currentMediaId === mediaId ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentMediaById(project.projectId, mediaId);
                        }}
                      >
                        <span className="media-name">קובץ {index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*"
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in React types
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      
      {/* Hidden file inputs for each project */}
      {projects.map(project => (
        <input
          key={`add-media-${project.projectId}`}
          ref={el => {
            if (el) addMediaInputRefs.current[project.projectId] = el;
          }}
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={(e) => handleAddMediaSelected(e, project.projectId)}
          style={{ display: 'none' }}
        />
      ))}
      </div>
      
      {/* Move duplicate dialogs outside sidebar content to allow full-screen overlay */}
      {duplicateConfirm && (
        <div className="duplicate-confirm-overlay">
          <div className="duplicate-confirm-dialog">
            <h3>קובץ כפול</h3>
            <p>
              קובץ זה כבר קיים בפרויקט:
              <br />
              <strong>{duplicateConfirm.existingMedia.name}</strong>
              <br />
              גודל: {(duplicateConfirm.existingMedia.size / 1024 / 1024).toFixed(2)} MB
              {duplicateConfirm.existingMedia.duration > 0 && (
                <>
                  <br />
                  משך: {Math.floor(duplicateConfirm.existingMedia.duration / 60)}:{String(Math.floor(duplicateConfirm.existingMedia.duration % 60)).padStart(2, '0')}
                </>
              )}
            </p>
            <p>האם להוסיף בכל זאת?</p>
            <div className="duplicate-confirm-buttons">
              <button 
                className="confirm-btn"
                onClick={() => handleDuplicateConfirm(true)}
              >
                הוסף בכל זאת
              </button>
              <button 
                className="cancel-btn"
                onClick={() => handleDuplicateConfirm(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      
      
      {duplicateProjectConfirm && (
        <div className="duplicate-confirm-overlay">
          <div className="duplicate-confirm-dialog">
            <h3>פרויקט דומה זוהה</h3>
            {duplicateProjectConfirm.type === 'exact' ? (
              <>
                <p>
                  פרויקט עם אותם קבצים בדיוק כבר קיים:
                  <br />
                  <strong>{duplicateProjectConfirm.existingProject.displayName}</strong>
                  <br />
                  נוצר ב: {new Date(duplicateProjectConfirm.existingProject.createdAt).toLocaleDateString('he-IL')}
                  <br />
                  מכיל {duplicateProjectConfirm.existingProject.totalMedia} קבצים
                </p>
                <p>מה ברצונך לעשות?</p>
                <div className="duplicate-confirm-buttons">
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('useExisting')}
                  >
                    השתמש בפרויקט הקיים
                  </button>
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                  >
                    צור פרויקט חדש בכל זאת
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => handleDuplicateProjectConfirm('cancel')}
                  >
                    ביטול
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  פרויקט קיים חסר חלק מהקבצים:
                  <br />
                  <strong>{duplicateProjectConfirm.existingProject.displayName}</strong>
                  <br />
                  חסרים {duplicateProjectConfirm.missingInProject?.length || 0} קבצים:
                </p>
                <ul style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto', 
                  margin: '10px 0',
                  padding: '10px 20px',
                  textAlign: 'right',
                  direction: 'rtl',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(32, 201, 151, 0.2)'
                }}>
                  {duplicateProjectConfirm.missingInProject?.map((fileName, index) => (
                    <li key={index} style={{ 
                      color: '#20c997', 
                      marginBottom: '6px',
                      padding: '4px 0',
                      borderBottom: index < (duplicateProjectConfirm.missingInProject?.length || 0) - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                    }}>
                      {fileName}
                    </li>
                  ))}
                </ul>
                <p>מה תרצה לעשות?</p>
                <div className="duplicate-confirm-buttons">
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('addMissing')}
                    style={{ fontSize: '13px' }}
                  >
                    הוסף רק קבצים חסרים
                  </button>
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                    style={{ fontSize: '13px' }}
                  >
                    צור פרויקט חדש
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => handleDuplicateProjectConfirm('cancel')}
                  >
                    ביטול
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Single Media Upload Modal */}
      <SingleMediaUploadModal
        isOpen={showSingleMediaModal}
        onClose={() => setShowSingleMediaModal(false)}
        onUpload={handleSingleMediaUpload}
      />
      
    </>
  );
});

TranscriptionSidebar.displayName = 'TranscriptionSidebar';

export default TranscriptionSidebar;