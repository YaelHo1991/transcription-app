'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useProjectStore from '@/lib/stores/projectStore';
import './TranscriptionSidebar.css';
import { buildApiUrl } from '@/utils/api';
import UrlUploadModal from './UrlUploadModal';
import DownloadProgressModal from '../DownloadProgressModal/DownloadProgressModal';

export interface TranscriptionSidebarProps {
  onOpenManagementModal?: (tab: 'projects' | 'transcriptions' | 'duration' | 'progress') => void;
  onProjectDelete?: (projectId: string, deleteTranscriptions: boolean) => Promise<void>;
  onMediaDelete?: (projectId: string, mediaId: string, deleteTranscriptions: boolean) => Promise<void>;
  onGetActionHandlers?: (handlers: {
    handleFolderUpload: () => void;
    handleSingleMediaClick: () => void;
    handleUrlDownload: () => void;
  }) => void;
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
    type: 'info' | 'success' | 'error' | 'loading' | 'download';
    progress?: number;
    batchId?: string;
    onClick?: () => void;
  } | null>(null);
  
  // URL modal state
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState('');
  const [downloadProjectName, setDownloadProjectName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [playlistContinueData, setPlaylistContinueData] = useState<any>(null); // Data for continuing playlist downloads
  const [urlAddData, setUrlAddData] = useState<{ projectId: string; projectName: string } | null>(null); // Data for adding URL to existing project
  const [urlModalTarget, setUrlModalTarget] = useState<'new' | string>('new');
  const [urlModalProjectName, setUrlModalProjectName] = useState<string | undefined>(undefined);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const downloadPollingRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Editing state for project names
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  // Project tabs state
  const [activeProjectTab, setActiveProjectTab] = useState<'active' | 'empty'>('active');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    projectId: string;
    x: number;
    y: number;
  } | null>(null);

  // Drag & Drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const dragCounter = useRef(0);
  
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
    renameProject,
    setError
  } = useProjectStore();
  
  console.log('[TranscriptionSidebar] Store accessed successfully');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const singleMediaInputRef = useRef<HTMLInputElement>(null);
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
      // Also clear download polling if active
      if (downloadPollingRef.current) {
        clearInterval(downloadPollingRef.current);
        downloadPollingRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Expose the refresh method and action handlers to parent component
  useImperativeHandle(ref, () => ({
    refreshStorage: loadStorageInfo,
    handleFolderUpload,
    handleSingleMediaClick,
    handleUrlDownload
  }));
  
  // Also expose globally for easy access
  useEffect(() => {
    (window as any).refreshSidebarStorage = loadStorageInfo;
    return () => {
      delete (window as any).refreshSidebarStorage;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Set mounted state and expose action handlers
  useEffect(() => {
    console.log('[TranscriptionSidebar] Component mounted');
    console.log('[TranscriptionSidebar] Initial isLoading:', isLoading);
    console.log('[TranscriptionSidebar] Initial projects:', projects.length);
    setIsMounted(true);

    // Expose action handlers to parent if callback provided
    if (props.onGetActionHandlers) {
      props.onGetActionHandlers({
        handleFolderUpload,
        handleSingleMediaClick,
        handleUrlDownload
      });
    }
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

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    console.log('[TranscriptionSidebar] Right-click detected on project:', projectId);
    console.log('[TranscriptionSidebar] Mouse position:', { x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();

    // Set context menu with position
    const menuState = {
      projectId,
      x: e.clientX,
      y: e.clientY
    };

    console.log('[TranscriptionSidebar] Setting context menu state:', menuState);
    setContextMenu(menuState);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (action: 'rename' | 'addMedia' | 'addUrl', projectId: string) => {
    closeContextMenu();

    switch (action) {
      case 'rename':
        const project = projects.find(p => p.projectId === projectId);
        if (project) {
          handleStartEditProject(projectId, project.displayName);
        }
        break;
      case 'addMedia':
        handleAddMediaClick(projectId);
        break;
      case 'addUrl':
        // Set the target project for URL addition using the same pattern as playlist continuation
        const targetProject = projects.find(p => p.projectId === projectId);
        console.log('[handleContextMenuAction] addUrl for projectId:', projectId);
        console.log('[handleContextMenuAction] targetProject found:', targetProject);
        if (targetProject) {
          console.log('[handleContextMenuAction] Setting urlAddData with projectId:', projectId);
          // Use the same pattern as playlist continuation
          setUrlAddData({
            projectId: projectId,
            projectName: targetProject.displayName
          });
          setShowUrlModal(true);
        }
        break;
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  const handleFolderUpload = () => {
    console.log('[TranscriptionSidebar] handleFolderUpload called');
    console.log('[TranscriptionSidebar] folderInputRef.current:', folderInputRef.current);

    // Use setTimeout to ensure the DOM is ready
    setTimeout(() => {
      if (folderInputRef.current) {
        console.log('[TranscriptionSidebar] Clicking folder input');
        folderInputRef.current.click();
      } else {
        console.error('[TranscriptionSidebar] folderInputRef.current is still null');
        // Try using the file input instead
        if (fileInputRef.current) {
          console.log('[TranscriptionSidebar] Using fileInputRef instead');
          fileInputRef.current.setAttribute('webkitdirectory', '');
          fileInputRef.current.setAttribute('directory', '');
          fileInputRef.current.click();
        } else {
          showSidebarNotification('שגיאה בפתיחת חלון בחירת תיקייה', 'error');
        }
      }
    }, 100);
  };
  
  // Function to track download progress in sidebar notification
  const startDownloadProgressTracking = (batchId: string, projectName: string) => {
    // Clear any existing polling
    if (downloadPollingRef.current) {
      clearInterval(downloadPollingRef.current);
      downloadPollingRef.current = null;
    }

    // Fetch progress function (reusing logic from DownloadProgressModal)
    const fetchProgress = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/projects/batch-download/${batchId}/progress`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch progress: ${response.status}`);
        }

        const data = await response.json();
        
        // Calculate overall progress
        let overallProgress = 0;
        if (data && data.totalFiles > 0) {
          let totalProgress = 0;
          const mediaIndices = Object.keys(data.progress || {}).map(Number);
          
          for (const mediaIndex of mediaIndices) {
            const mediaProgress = data.progress[mediaIndex];
            if (mediaProgress.status === 'completed') {
              totalProgress += 100;
            } else if (mediaProgress.status === 'failed') {
              totalProgress += 0;
            } else {
              totalProgress += mediaProgress.progress || 0;
            }
          }
          
          overallProgress = Math.round(totalProgress / data.totalFiles);
        }

        // Update notification based on status
        if (data.status === 'completed') {
          setSidebarNotification({
            message: `ההורדה הושלמה: ${projectName}`,
            type: 'success',
            progress: 100
          });
          
          // Clear polling
          if (downloadPollingRef.current) {
            clearInterval(downloadPollingRef.current);
            downloadPollingRef.current = null;
          }
          
          // Reload projects to show the new one
          loadProjects();
          
          // Auto-hide after 3 seconds
          setTimeout(() => {
            hideSidebarNotification();
          }, 3000);
        } else if (data.status === 'failed') {
          setSidebarNotification({
            message: `ההורדה נכשלה: ${projectName}`,
            type: 'error'
          });
          
          // Clear polling
          if (downloadPollingRef.current) {
            clearInterval(downloadPollingRef.current);
            downloadPollingRef.current = null;
          }
        } else {
          // Still downloading
          console.log('[Download Progress] Setting notification with progress:', overallProgress);
          setSidebarNotification({
            message: `מוריד: ${projectName} (${overallProgress}%)`,
            type: 'download',
            progress: overallProgress,
            batchId,
            onClick: () => {
              setCurrentBatchId(batchId);
              setDownloadProjectName(projectName);
              setShowDownloadProgress(true);
            }
          });
        }
      } catch (error) {
        console.error('[Download Progress] Error fetching progress:', error);
      }
    };

    // Initial fetch
    fetchProgress();
    
    // Poll every 2 seconds
    downloadPollingRef.current = setInterval(fetchProgress, 2000);
  };

  const handleUrlDownload = () => {
    console.log('[TranscriptionSidebar] Opening URL download modal for NEW project');
    // Clear any existing URL add data to ensure we create a new project
    setUrlAddData(null);
    setUrlModalTarget('new');
    setUrlModalProjectName(undefined);
    setShowUrlModal(true);
  };
  
  const handleUrlSubmit = async (urls: any[], downloadNow: boolean, projectName: string, targetFromModal: 'new' | string, playlistCookieFile?: File) => {
    console.log('[handleUrlSubmit] Received target from modal:', targetFromModal);
    console.log('[handleUrlSubmit] Project name:', projectName);
    console.log('[handleUrlSubmit] Download now:', downloadNow);

    // Use the target passed directly from the modal
    const target = targetFromModal;

    console.log('[handleUrlSubmit] FINAL TARGET for backend:', target);

    // Determine the actual project name to use for notifications
    let actualProjectName = projectName;
    if (target !== 'new') {
      // Find the existing project to get its actual display name
      const existingProject = projects.find(p => p.projectId === target);
      if (existingProject) {
        actualProjectName = existingProject.displayName;
        console.log('[handleUrlSubmit] Using existing project name:', actualProjectName);
      }
    }

    // Now close the modal
    setShowUrlModal(false);

    if (!downloadNow) {
      setPlaylistContinueData(null); // Clear continue data
      return;
    }

    // Clear the playlist continue data, URL add data, and reset urlModalTarget after use
    setPlaylistContinueData(null);
    setUrlAddData(null); // Clear URL add data after submission
    setUrlModalTarget('new'); // Reset to default after submission
    setUrlModalProjectName(undefined);

    // Show immediate notification that download is starting with progress and clickable link
    setSidebarNotification({
      message: `מתחיל הורדה: ${actualProjectName}`,
      type: 'download',
      progress: 0,
      onClick: () => setShowDownloadProgress(true)
    });
    
    try {
      console.log('[handleUrlSubmit] About to call batch-download with:');
      console.log('  - urls:', urls);
      console.log('  - projectName:', projectName);
      console.log('  - target:', target);
      console.log('  - target type:', typeof target);
      console.log('  - target === "new":', target === 'new');

      // Create FormData to handle cookie files
      const formData = new FormData();
      formData.append('projectName', projectName);
      // Ensure target is never undefined - default to 'new'
      const targetValue = target || 'new';
      formData.append('target', targetValue);
      console.log('[handleUrlSubmit] FormData target appended:', targetValue, '(original was:', target, ')');
      
      // If playlist cookie file is provided, add it for all playlist URLs
      if (playlistCookieFile) {
        formData.append('playlistCookieFile', playlistCookieFile);
      }
      
      // Add URLs and individual cookie files
      const urlsData: any[] = [];
      urls.forEach((url, index) => {
        const urlData = {
          url: url.url || url,
          quality: url.selectedQuality || url.quality,
          downloadType: url.downloadType,
          mediaName: url.mediaName,
          // Include playlist-specific metadata if present
          ...(url.playlistIndex !== undefined && {
            playlistIndex: url.playlistIndex,
            playlistUrl: url.playlistUrl,
            totalVideosInPlaylist: url.totalVideosInPlaylist
          })
        };
        urlsData.push(urlData);
        
        // Add individual cookie file if present (for non-playlist URLs)
        if (url.cookieFile && !playlistCookieFile) {
          formData.append(`cookieFile_${index}`, url.cookieFile);
        }
      });
      
      formData.append('urls', JSON.stringify(urlsData));
      
      const response = await fetch(buildApiUrl('/api/projects/batch-download'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null || 'dev-anonymous'}`
        },
        body: formData
      });
      
      console.log('[handleUrlSubmit] Response status:', response.status);
      
      if (response.ok) {
        const { batchId } = await response.json();
        console.log('[handleUrlSubmit] Got batchId:', batchId);
        setCurrentBatchId(batchId);
        setDownloadProjectName(actualProjectName);

        // Update the notification with the batchId now that we have it
        setSidebarNotification({
          message: `מתחיל הורדה: ${actualProjectName}`,
          type: 'download',
          progress: 0,
          batchId,
          onClick: () => {
            setCurrentBatchId(batchId);
            setDownloadProjectName(actualProjectName);
            setShowDownloadProgress(true);
          }
        });
        
        // Start tracking progress updates
        startDownloadProgressTracking(batchId, actualProjectName);
        
        // Don't open modal automatically - let user click notification to see details
        // setShowDownloadProgress(true);
      } else {
        const errorText = await response.text();
        console.error('Failed to start batch download. Status:', response.status, 'Response:', errorText);
        showSidebarNotification('שגיאה בהתחלת ההורדה', 'error');
      }
    } catch (error) {
      console.error('Error starting batch download:', error);
      showSidebarNotification('שגיאה בהתחלת ההורדה', 'error');
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
    const confirmData = duplicateProjectConfirm; // Store data before clearing
    
    // Immediately clear the modal to ensure it closes
    setDuplicateProjectConfirm(null);
    
    if (action === 'create') {
      // Create anyway with force flag
      const { files, folderName } = confirmData;
      
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
        
        // Refresh project list to get complete metadata (file sizes, names, etc.)
        await loadProjects();
        
        setCurrentProject(newProject);
        
        if (newProject.mediaFiles && newProject.mediaFiles.length > 0) {
          await setCurrentMediaById(newProject.projectId, newProject.mediaFiles[0]);
        }
      } else {
        showSidebarNotification('שגיאה ביצירת הפרויקט', 'error');
      }
      
      setIsUploading(false);
      
    } else if (action === 'addMissing' && confirmData.type === 'partial') {
      // Add only missing files to existing project
      const { existingProject, missingInProject, files, folderName } = confirmData;
      
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
    } else if (action === 'useExisting') {
      // Use existing project (for complete duplicates)
      if (confirmData.hasArchivedTranscriptions && confirmData.archivedTranscriptions && existingProject) {
        
        const { files, folderName } = confirmData;
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
        
        // Refresh project list to get complete metadata (file sizes, names, etc.)
        await loadProjects();
        
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
    
    // Clear duplicate confirmation state immediately to close modal
    const confirmData = duplicateConfirm;
    setDuplicateConfirm(null);
    
    if (confirm) {
      // Re-submit with force flag
      const { projectId, files } = confirmData;
      
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

  // Filter projects based on active tab
  const getFilteredProjects = () => {
    if (activeProjectTab === 'active') {
      return projects.filter(project => project.mediaFiles && project.mediaFiles.length > 0);
    } else {
      return projects.filter(project => !project.mediaFiles || project.mediaFiles.length === 0);
    }
  };

  const filteredProjects = getFilteredProjects();
  const activeProjectsCount = projects.filter(project => project.mediaFiles && project.mediaFiles.length > 0).length;
  const emptyProjectsCount = projects.filter(project => !project.mediaFiles || project.mediaFiles.length === 0).length;
  
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
        
        // Refresh project list to get complete metadata (file sizes, names, etc.)
        await loadProjects();
        
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
  
  const handleSingleMediaClick = () => {
    // Open the file browser
    if (singleMediaInputRef.current) {
      singleMediaInputRef.current.click();
    }
  };

  const handleSingleMediaSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Generate unique timestamp-based folder name with full timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Always use full timestamp to ensure uniqueness
    const folderName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    
    console.log(`[TranscriptionSidebar] ${files.length} media file(s) selected`);
    
    try {
      // Show loading notification with file count
      const loadingMessage = files.length === 1 
        ? 'מעלה קובץ מדיה...' 
        : `מעלה ${files.length} קבצי מדיה...`;
      showSidebarNotification(loadingMessage, 'loading');
      
      // Create FormData
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || generateComputerId();
      const computerName = localStorage.getItem('computerName') || 'Web Multi Upload';
      
      if (!localStorage.getItem('computerId')) {
        localStorage.setItem('computerId', computerId);
      }
      
      // Add all files to FormData
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('folderName', folderName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Use existing createProjectFromFolder method
      const response = await createProjectFromFolder(formData);
      
      // Handle duplicate project detection
      if (response && response.isDuplicateProject) {
        console.log('[TranscriptionSidebar] Duplicate project detected:', response);
        showSidebarNotification('הפרויקט כבר קיים - נבחר אותו', 'info');
        
        // Select the existing project
        if (response.existingProject) {
          setCurrentProject(response.existingProject);
          if (response.existingProject.mediaFiles && response.existingProject.mediaFiles.length > 0) {
            await setCurrentMediaById(response.existingProject.projectId, response.existingProject.mediaFiles[0]);
          }
        }
        
        // Reset the file input
        if (singleMediaInputRef.current) {
          singleMediaInputRef.current.value = '';
        }
        return;
      }
      
      // Handle successful project creation
      if (response && response.projectId) {
        console.log('[TranscriptionSidebar] Media project created:', response.projectId);
        const successMessage = files.length === 1 
          ? 'פרויקט נוצר בהצלחה' 
          : `פרויקט נוצר בהצלחה עם ${files.length} קבצים`;
        showSidebarNotification(successMessage, 'success');
        
        // Refresh project list
        await loadProjects();
        
        // Set the new project for editing
        setEditingProjectId(response.projectId);
        setEditingProjectName(folderName);
        
        // Auto-select the new project
        setTimeout(() => {
          const newProject = projects.find(p => p.projectId === response.projectId);
          if (newProject) {
            setCurrentProject(newProject);
          }
        }, 100);
      } else if (response && response.error === 'storage_limit' && response.storageDetails) {
        // Handle storage limit error
        const { currentUsedMB, limitMB, requestedMB } = response.storageDetails;
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'error');
      } else {
        // Handle other errors
        const errorMessage = response?.error || response?.message || 'העלאה נכשלה. אנא נסה שנית.';
        showSidebarNotification(errorMessage, 'error');
      }
    } catch (error: any) {
      console.error('[TranscriptionSidebar] Media upload error:', error);
      showSidebarNotification(
        error.message || 'שגיאה בהעלאת הקבצים',
        'error'
      );
    }
    
    // Clear the input for next use
    event.target.value = '';
  };
  
  // Drag & Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragging(false);
      setDragOverProject(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current = 0;
    setIsDragging(false);
    setDragOverProject(null);
    
    const items = Array.from(e.dataTransfer.items);
    if (items.length === 0) return;
    
    // Check if it's a folder drop
    const entries = await Promise.all(
      items.map(item => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)
    );
    
    const hasFolder = entries.some(entry => entry && entry.isDirectory);
    
    if (hasFolder) {
      // Handle folder drop
      const folderEntry = entries.find(entry => entry && entry.isDirectory);
      if (!folderEntry) return;
      
      await handleFolderDrop(folderEntry);
    } else {
      // Handle file(s) drop
      const files = Array.from(e.dataTransfer.files);
      const mediaFiles = files.filter(file => 
        file.type.startsWith('audio/') || file.type.startsWith('video/')
      );
      
      if (mediaFiles.length === 0) {
        showSidebarNotification('אנא גרור קבצי מדיה בלבד (אודיו או וידאו)', 'error');
        return;
      }
      
      // Create new project with timestamp name
      await handleMediaFilesDrop(mediaFiles);
    }
  };
  
  const handleProjectDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverProject(projectId);
  };
  
  const handleProjectDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverProject(null);
  };
  
  const handleProjectDrop = async (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current = 0;
    setIsDragging(false);
    setDragOverProject(null);
    
    const files = Array.from(e.dataTransfer.files);
    const mediaFiles = files.filter(file => 
      file.type.startsWith('audio/') || file.type.startsWith('video/')
    );
    
    if (mediaFiles.length === 0) {
      showSidebarNotification('אנא גרור קבצי מדיה בלבד (אודיו או וידאו)', 'error');
      return;
    }
    
    // Add media to existing project
    await handleAddMediaToProject(projectId, mediaFiles);
  };

  // Project Edit Handlers
  const handleStartEditProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingProjectName(currentName);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveProjectName(projectId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleSaveProjectName = async (projectId: string) => {
    const newName = editingProjectName.trim();
    
    // Don't save if name is empty
    if (!newName) {
      handleCancelEdit();
      return;
    }
    
    // Don't save if name hasn't changed
    const currentProject = projects.find(p => p.projectId === projectId);
    if (currentProject && currentProject.displayName === newName) {
      handleCancelEdit();
      return;
    }
    
    try {
      // Call rename function from store (to be implemented)
      const success = await renameProject(projectId, newName);
      if (success) {
        showSidebarNotification(`שם הפרויקט שונה בהצלחה ל-"${newName}"`, 'success');
        handleCancelEdit();
      } else {
        showSidebarNotification('שגיאה בשינוי שם הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error renaming project:', error);
      showSidebarNotification('שגיאה בשינוי שם הפרויקט', 'error');
    }
  };
  
  const handleFolderDrop = async (folderEntry: any) => {
    showSidebarNotification('קורא תיקייה...', 'loading', false);
    
    const files: File[] = [];
    const readDirectory = async (dirEntry: any) => {
      const reader = dirEntry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        reader.readEntries((entries: any[]) => resolve(entries));
      });
      
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve) => {
            entry.file((file: File) => resolve(file));
          });
          if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
            files.push(file);
          }
        } else if (entry.isDirectory) {
          await readDirectory(entry);
        }
      }
    };
    
    await readDirectory(folderEntry);
    
    if (files.length === 0) {
      showSidebarNotification('לא נמצאו קבצי מדיה בתיקייה', 'error');
      return;
    }
    
    // Create project with folder name
    const folderName = folderEntry.name;
    const formData = new FormData();
    formData.append('folderName', folderName);
    formData.append('computerId', 'drag-drop');
    formData.append('computerName', 'Drag & Drop');
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const result = await createProjectFromFolder(formData);
      
      // Check if it's a duplicate project response
      if (result && result.isDuplicateProject) {
        setDuplicateProjectConfirm({
          type: result.duplicateType,
          existingProject: result.existingProject,
          missingInProject: result.missingInProject,
          files: files,
          folderName,
          hasArchivedTranscriptions: result.hasArchivedTranscriptions || false,
          archivedTranscriptions: result.archivedTranscriptions
        });
        return;
      }
      
      // Check if it's an error response
      if (result && result.error === 'storage_limit') {
        const { currentUsedMB, limitMB, requestedMB } = result.storageDetails || {};
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'error');
      } else if (result && result.projectId) {
        showSidebarNotification(`פרויקט "${folderName}" נוצר בהצלחה`, 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה ביצירת פרויקט', 'error');
      }
    } catch (error) {
      showSidebarNotification('שגיאה ביצירת פרויקט', 'error');
    }
  };
  
  const handleMediaFilesDrop = async (files: File[]) => {
    // Generate timestamp name
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const folderName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    
    const formData = new FormData();
    formData.append('folderName', folderName);
    formData.append('computerId', 'drag-drop');
    formData.append('computerName', 'Drag & Drop');
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      showSidebarNotification('מעלה קבצים...', 'loading', false);
      const result = await createProjectFromFolder(formData);
      
      // Check if it's a duplicate project response
      if (result && result.isDuplicateProject) {
        hideSidebarNotification();
        setDuplicateProjectConfirm({
          type: result.duplicateType,
          existingProject: result.existingProject,
          missingInProject: result.missingInProject,
          files: files,
          folderName,
          hasArchivedTranscriptions: result.hasArchivedTranscriptions || false,
          archivedTranscriptions: result.archivedTranscriptions
        });
        return;
      }
      
      // Check if it's an error response
      if (result && result.error === 'storage_limit') {
        const { currentUsedMB, limitMB, requestedMB } = result.storageDetails || {};
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showSidebarNotification(message, 'error');
      } else if (result && result.projectId) {
        showSidebarNotification(`פרויקט נוצר בהצלחה`, 'success');
        await loadProjects();
      } else {
        showSidebarNotification('שגיאה ביצירת פרויקט', 'error');
      }
    } catch (error) {
      showSidebarNotification('שגיאה ביצירת פרויקט', 'error');
    }
  };
  
  const handleAddMediaToProject = async (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      showSidebarNotification('מוסיף מדיה לפרויקט...', 'loading', false);
      await addMediaToProject(projectId, formData);
      
      // Find the project name for the success message
      const project = projects.find(p => p.projectId === projectId);
      const projectName = project?.displayName || 'הפרויקט';
      
      showSidebarNotification(`מדיה נוספה בהצלחה לפרויקט "${projectName}"`, 'success');
      await loadProjects();
    } catch (error) {
      showSidebarNotification('שגיאה בהוספת מדיה', 'error');
    }
  };
  
  const handleContinuePlaylist = async (project: any) => {
    // First, fetch the full project metadata including playlist information
    try {
      const url = buildApiUrl(`/api/projects/${project.projectId}/metadata`);
      console.log('Fetching playlist metadata from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const metadata = await response.json();
        
        // Set the playlist continue data with project and metadata info
        setPlaylistContinueData({
          projectId: project.projectId,
          projectName: project.displayName,
          playlistUrl: metadata.playlistMetadata?.playlistUrl,
          playlistTitle: metadata.playlistMetadata?.playlistTitle,
          downloadedIndices: metadata.playlistMetadata?.downloadedIndices || [],
          mediaPlaylistIndices: metadata.mediaPlaylistIndices || {}, // Pass the actual media->index mapping
          playlistData: metadata.playlistData || null, // Pass the playlist.json data
          totalVideos: metadata.playlistMetadata?.totalVideosInPlaylist,
          existingMediaIds: project.mediaFiles || []
        });
        
        // Open the URL modal in continue mode
        setShowUrlModal(true);
        
        console.log('Continue playlist for project:', project.projectId);
        console.log('Playlist metadata:', metadata.playlistMetadata);
      } else {
        showSidebarNotification('לא ניתן לטעון מידע על הרשימה', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch playlist metadata:', error);
      showSidebarNotification('שגיאה בטעינת מידע הרשימה', 'error');
    }
  };
  
  return (
    <>
      <div
        className={`transcription-sidebar-content ${isDragging ? 'dragging-over' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>

      {/* Hidden file input for media (supports multiple files) */}
      <input
        ref={singleMediaInputRef}
        type="file"
        accept="audio/*,video/*"
        multiple
        onChange={handleSingleMediaSelected}
        style={{ display: 'none' }}
      />

      <div className="sidebar-stats">
        {/* Storage Display */}
        {storageInfo && (
          <div className="stats-storage-display" title="אחסון">
            <div className="stats-storage-text">
              <div className="storage-size-display">
                <span className="storage-used">{storageInfo.quotaUsedMB}MB</span>
                <span className="storage-separator"> / </span>
                <span className="storage-total">{storageInfo.quotaLimitMB}MB</span>
              </div>
            </div>
            <div className="stats-storage-progress-bar">
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
        )}

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

      {/* Project Tabs */}
      <div className="project-tabs">
        <button
          className={`project-tab ${activeProjectTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveProjectTab('active')}
        >
          <span className="tab-text">פרויקטים פעילים</span>
          <span className="tab-count">({activeProjectsCount})</span>
        </button>
        <button
          className={`project-tab ${activeProjectTab === 'empty' ? 'active' : ''}`}
          onClick={() => setActiveProjectTab('empty')}
        >
          <span className="tab-text">פרויקטים ריקים</span>
          <span className="tab-count">({emptyProjectsCount})</span>
        </button>
      </div>

      {/* Inline Notification Area */}
      {sidebarNotification && (
        <div 
          className={`sidebar-notification sidebar-notification-${sidebarNotification.type} ${sidebarNotification.onClick ? 'clickable' : ''}`}
          onClick={sidebarNotification.onClick}
        >
          {(sidebarNotification.type === 'loading' || sidebarNotification.type === 'download') && (
            <div className="notification-progress-bar">
              <div 
                className="notification-progress-fill" 
                style={{
                  width: sidebarNotification.progress !== undefined ? `${sidebarNotification.progress}%` : '0%'
                }}
              />
            </div>
          )}
          <div className="notification-message">
            {sidebarNotification.message}
            {sidebarNotification.type === 'download' && sidebarNotification.onClick && (
              <span className="notification-link"> - לחץ לפרטים</span>
            )}
          </div>
        </div>
      )}
      
      <div className="project-list">
        {filteredProjects.length === 0 && !isLoading ? (
          <div className="empty-projects">
            {activeProjectTab === 'active' ? (
              <>
                <p>אין פרויקטים פעילים</p>
                <p className="hint">העלה תיקייה עם קבצי מדיה כדי ליצור פרויקט חדש</p>
              </>
            ) : (
              <>
                <p>אין פרויקטים ריקים</p>
                <p className="hint">פרויקטים ריקים הם פרויקטים ללא קבצי מדיה</p>
              </>
            )}
          </div>
        ) : (
          <div className="projects-list">
            {filteredProjects.map(project => (
              <div
                key={project.projectId}
                className={`project-item ${currentProject?.projectId === project.projectId ? 'active' : ''} ${dragOverProject === project.projectId ? 'drag-over-project' : ''}`}
                onClick={async (e) => {
                  // Don't handle left click if it's actually a right click
                  if (e.button === 2) return;

                  setCurrentProject(project);

                  // If this is a playlist project, fetch additional metadata
                  if (project.displayName?.startsWith('YouTube -')) {
                    try {
                      const response = await fetch(buildApiUrl(`/api/projects/${project.projectId}/metadata`), {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-anonymous'}`,
                        }
                      });
                      if (response.ok) {
                        const metadata = await response.json();
                        // Update the current project with metadata
                        const updatedProject = { ...project, playlistMetadata: metadata.playlistMetadata, mediaPlaylistIndices: metadata.mediaPlaylistIndices };
                        setCurrentProject(updatedProject);
                      }
                    } catch (error) {
                      console.error('Failed to fetch playlist metadata:', error);
                    }
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, project.projectId)}
                onDragOver={(e) => handleProjectDragOver(e, project.projectId)}
                onDragLeave={handleProjectDragLeave}
                onDrop={(e) => handleProjectDrop(e, project.projectId)}
              >
                <div className="project-header">
                  {editingProjectId === project.projectId ? (
                    <div className="project-name-edit">
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, project.projectId)}
                        onBlur={() => handleSaveProjectName(project.projectId)}
                        className="project-name-input"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <div className="project-name-display">
                      <span className="project-name">{project.displayName}</span>
                    </div>
                  )}
                </div>
                <div className="project-meta">
                  <div className="media-info">
                    <span className="media-count">{project.totalMedia} קבצים</span>
                  </div>
                </div>
                {currentProject?.projectId === project.projectId && (
                  <div className="media-list">
                    {project.mediaFiles.map((mediaId, index) => {
                      // Use currentProject for metadata if this is the current project
                      const projectWithMetadata = currentProject?.projectId === project.projectId ? currentProject : project;
                      
                      // For playlist projects, check if we have playlist metadata
                      const isPlaylistProject = projectWithMetadata.displayName?.startsWith('YouTube -');
                      let displayName = `קובץ ${index + 1}`;

                      // If this is a playlist project and we have metadata, show the original playlist index
                      if (isPlaylistProject && projectWithMetadata.mediaPlaylistIndices) {
                        // Try to get the original playlist index for this media
                        const playlistIndex = projectWithMetadata.mediaPlaylistIndices[mediaId];
                        if (playlistIndex !== undefined) {
                          displayName = `${playlistIndex}. קובץ ${index + 1}`;
                        }
                      }
                      
                      return (
                        <div 
                          key={`sidebar-${project.projectId}-${mediaId}-${index}`} 
                          className={`media-item ${currentMediaId === mediaId ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMediaById(project.projectId, mediaId);
                          }}
                        >
                          <span className="media-name">{displayName}</span>
                        </div>
                      );
                    })}
                    
                    {/* Add Continue Playlist button for playlist projects */}
                    {currentProject?.displayName?.startsWith('YouTube -') && currentProject?.playlistMetadata && (
                      <button 
                        className="continue-playlist-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContinuePlaylist(currentProject);
                        }}
                        title="המשך הורדה מהפלייליסט"
                      >
                        המשך הורדה
                      </button>
                    )}
                  </div>
                )}

                {/* Project Date Section - At bottom of each project */}
                <div className="project-date-section">
                  <span className="project-date">
                    {new Date(project.lastModified).toLocaleDateString('he-IL')}
                  </span>
                </div>
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


      {/* Context Menu - using portal to ensure it renders at top level */}
      {console.log('[TranscriptionSidebar] Rendering context menu:', contextMenu)}
      {contextMenu && typeof document !== 'undefined' ? createPortal(
        <div
          style={{
            position: 'fixed',
            left: Math.max(10, Math.min(contextMenu.x - 100, window.innerWidth - 200)) + 'px',
            top: Math.min(contextMenu.y, window.innerHeight - 150) + 'px',
            zIndex: 999999,
            background: 'rgba(20, 30, 40, 0.98)',
            padding: '6px',
            border: '2px solid rgba(32, 201, 151, 0.4)',
            borderRadius: '8px',
            minWidth: '180px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              textAlign: 'right',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => handleContextMenuAction('rename', contextMenu.projectId)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            שנה שם
          </button>
          <button
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              textAlign: 'right',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => handleContextMenuAction('addMedia', contextMenu.projectId)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            הוסף קובץ מדיה
          </button>
          <button
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              textAlign: 'right',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              console.log('[Context Menu] Add URL clicked for project:', contextMenu.projectId);
              handleContextMenuAction('addUrl', contextMenu.projectId);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            הוסף URL
          </button>
        </div>,
        document.body
      ) : null}

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
                    style={{ 
                      background: '#20c997',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#17a085';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#20c997';
                    }}
                  >
                    השתמש בפרויקט הקיים
                  </button>
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                    style={{ 
                      background: '#20c997',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#17a085';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#20c997';
                    }}
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
                    style={{ 
                      fontSize: '13px',
                      background: '#20c997',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#17a085';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#20c997';
                    }}
                  >
                    הוסף רק קבצים חסרים
                  </button>
                  <button 
                    className="confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                    style={{ 
                      fontSize: '13px',
                      background: '#20c997',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#17a085';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#20c997';
                    }}
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
      
      {showUrlModal && (
        <>
          {(() => {
            console.log('[TranscriptionSidebar] Rendering UrlUploadModal with:');
            console.log('  - urlAddData:', urlAddData);
            console.log('  - playlistContinueData:', playlistContinueData);
            const finalTarget = playlistContinueData
              ? playlistContinueData.projectId
              : (urlAddData ? urlAddData.projectId : 'new');
            console.log('  - FINAL target passed to modal:', finalTarget);
            return null;
          })()}
          <UrlUploadModal
            isOpen={showUrlModal}
            onClose={() => {
              setShowUrlModal(false);
              setPlaylistContinueData(null); // Clear continue data when closing
              setUrlAddData(null); // Clear URL add data when closing
              setUrlModalTarget('new'); // Reset to default when closing without submission
              setUrlModalProjectName(undefined);
            }}
            onSubmit={handleUrlSubmit}
            target={playlistContinueData
              ? playlistContinueData.projectId
              : (urlAddData ? urlAddData.projectId : 'new')}
            projectName={playlistContinueData?.projectName
              || urlAddData?.projectName
              || urlModalProjectName}
            continuePlaylist={playlistContinueData} // Pass the continue data
          />
        </>
      )}
      
      {showDownloadProgress && currentBatchId && (
        <DownloadProgressModal
          isOpen={showDownloadProgress}
          onClose={() => {
            setShowDownloadProgress(false);
            // Clear playlist continue data to force fresh metadata on next "המשך הורדה" click
            setPlaylistContinueData(null);
            // Refresh projects when closing to ensure we have latest data
            loadProjects();
          }}
          batchId={currentBatchId}
          projectName={downloadProjectName}
        />
      )}
      
    </>
  );
});

TranscriptionSidebar.displayName = 'TranscriptionSidebar';

export default TranscriptionSidebar;