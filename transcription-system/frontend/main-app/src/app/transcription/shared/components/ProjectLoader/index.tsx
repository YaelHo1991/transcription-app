'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProjectUploadModal } from './ProjectUploadModal';
import { useProjectManager } from './useProjectManager';
import { UploadParams } from './types';
import styles from './styles.module.css';

interface ProjectLoaderProps {
  onMediaLoad?: (mediaUrl: string, fileName?: string, mediaId?: string, projectId?: string) => void;
  onTranscriptionLoad?: (transcription: any) => void;
  getCurrentTranscription?: () => any;
}

export function ProjectLoader({ onMediaLoad, onTranscriptionLoad, getCurrentTranscription }: ProjectLoaderProps) {
  console.log('[ProjectLoader] Component mounted/rendered');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const uploadButtonRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);
  const {
    projects,
    currentProject,
    currentMedia,
    loading,
    error,
    uploadProject,
    selectProject,
    selectMedia,
    navigateMedia,
    loadTranscription,
    saveTranscription,
    reload
  } = useProjectManager();
  
  // Load projects only once on mount
  useEffect(() => {
    console.log('[ProjectLoader] Mount effect - hasLoadedProjects:', hasLoadedProjects);
    if (!hasLoadedProjects) {
      console.log('[ProjectLoader] Calling reload to fetch projects');
      reload();
      setHasLoadedProjects(true);
    }
  }, [hasLoadedProjects, reload]);
  
  // Create a stable reference to saveTranscription using useRef
  const saveTranscriptionRef = useRef(saveTranscription);
  useEffect(() => {
    saveTranscriptionRef.current = saveTranscription;
  }, [saveTranscription]);
  
  // Create a stable reference to loadTranscription using useRef
  const loadTranscriptionRef = useRef(loadTranscription);
  useEffect(() => {
    loadTranscriptionRef.current = loadTranscription;
  }, [loadTranscription]);
  
  // Listen for save events from TextEditor
  useEffect(() => {
    const handleSaveEvent = async (event: CustomEvent) => {
      if (event.detail) {
        // Use media ID from event detail to ensure proper isolation
        const mediaId = event.detail.mediaId;
        const projectId = event.detail.projectId;
        
        if (!mediaId) {
          console.error('[ProjectLoader] No media ID in save event - cannot save');
          const errorEvent = new CustomEvent('saveTranscriptionError', {
            detail: { error: 'No media ID provided' }
          });
          document.dispatchEvent(errorEvent);
          return;
        }
        
        console.log('[ProjectLoader] Received save event with explicit media ID:', mediaId, 'project:', projectId);
        console.log('[ProjectLoader] Save data:', {
          mediaId: mediaId,
          projectId: projectId,
          blocks: event.detail.blocks?.length || 0,
          speakers: event.detail.speakers?.length || 0,
          remarks: event.detail.remarks?.length || 0
        });
        
        try {
          // Use the ref to get the latest saveTranscription function
          await saveTranscriptionRef.current(mediaId, {
            blocks: event.detail.blocks || [],
            speakers: event.detail.speakers || [],
            remarks: event.detail.remarks || []
          });
          console.log('[ProjectLoader] Manual save completed successfully for media:', mediaId);
          
          // Dispatch success event back to TextEditor
          const successEvent = new CustomEvent('saveTranscriptionSuccess');
          document.dispatchEvent(successEvent);
        } catch (error) {
          console.error('[ProjectLoader] Manual save failed:', error);
          
          // Dispatch error event back to TextEditor
          const errorEvent = new CustomEvent('saveTranscriptionError', {
            detail: { error: error.message || 'Save failed' }
          });
          document.dispatchEvent(errorEvent);
        }
      } else {
        console.error('[ProjectLoader] Cannot save - no event detail');
      }
    };
    
    document.addEventListener('saveTranscription', handleSaveEvent as EventListener);
    return () => {
      document.removeEventListener('saveTranscription', handleSaveEvent as EventListener);
    };
  }, []); // Empty dependency array - stable event handler

  const handleUpload = async (params: UploadParams) => {
    const project = await uploadProject(params);
    setShowUploadModal(false);
    
    // After successful upload, select first media (will trigger useEffect)
    if (project && project.mediaFiles && project.mediaFiles.length > 0) {
      selectMedia(project.mediaFiles[0]);
    }
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Filter for media files only
    const mediaFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/') || 
      file.type.startsWith('video/')
    );

    if (mediaFiles.length > 0) {
      // Extract folder name from first file path
      let projectName = 'פרויקט חדש';
      if ('webkitRelativePath' in mediaFiles[0]) {
        const path = (mediaFiles[0] as any).webkitRelativePath;
        projectName = path.split('/')[0];
      }

      // Get userId from localStorage token
      const token = localStorage.getItem('token');
      let userId = 'anonymous';
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id || payload.userId || 'anonymous';
        } catch (error) {
          console.error('Failed to parse token:', error);
        }
      }

      // Upload directly
      handleUpload({
        userId,
        folderName: projectName,
        files: mediaFiles
      });
    }

    // Reset the input
    event.target.value = '';
  };

  const handleNavigate = (direction: 'next' | 'previous') => {
    navigateMedia(direction);
  };
  
  // Watch for currentMedia changes and load it
  useEffect(() => {
    // Cancel any pending transcription load
    let cancelled = false;
    
    // Debounce to prevent rapid API calls
    const debounceTimer = setTimeout(() => {
      console.log('[ProjectLoader] Main useEffect running (debounced), currentMedia:', currentMedia, 'currentProject:', currentProject);
    
      // Skip if no changes or no handlers
      if (!onMediaLoad || !onTranscriptionLoad) {
        console.log('[ProjectLoader] No handlers provided, skipping');
        return;
      }
      
      // Get stable IDs
      const mediaId = currentMedia?.mediaId || currentMedia?.id;
      const projectId = currentProject?.projectId;
      
      // Clear loading if no media
      if (!currentMedia || !mediaId || !projectId) {
        console.log('[ProjectLoader] No media/project selected, clearing transcription');
        onTranscriptionLoad(null);
        return;
      }
      
      // Save current transcription before loading new one
      const saveBeforeLoad = async () => {
        // Check if we have a current transcription to save
        const prevMediaId = sessionStorage.getItem('lastMediaId');
        if (prevMediaId && prevMediaId !== mediaId) {
          // Check if the transcription was modified (not just loaded)
          const isModified = sessionStorage.getItem('transcriptionModified') === 'true';
          console.log('[ProjectLoader] Checking if should save - modified flag:', isModified, 'prevMediaId:', prevMediaId, 'newMediaId:', mediaId);
          
          if (isModified) {
            // Get the CURRENT blocks from sessionStorage (updated by TextEditor)
            const currentBlocksJson = sessionStorage.getItem('currentTranscriptionBlocks');
            let currentBlocks = [];
            if (currentBlocksJson) {
              try {
                currentBlocks = JSON.parse(currentBlocksJson);
              } catch (e) {
                console.error('[ProjectLoader] Failed to parse current blocks from sessionStorage');
              }
            }
            
            // If no blocks in sessionStorage, try to get from getCurrentTranscription
            if (currentBlocks.length === 0 && getCurrentTranscription) {
              const currentTranscription = getCurrentTranscription();
              if (currentTranscription && currentTranscription.blocks) {
                currentBlocks = currentTranscription.blocks;
              }
            }
            
            if (currentBlocks.length > 0) {
              console.log('[ProjectLoader] Saving modified transcription for previous media:', prevMediaId, 'blocks:', currentBlocks.length);
              // Get speakers and remarks from the transcription state
              const currentTranscription = getCurrentTranscription ? getCurrentTranscription() : {};
              
              // Trigger save through event
              const saveEvent = new CustomEvent('saveTranscription', {
                detail: {
                  blocks: currentBlocks,
                  speakers: currentTranscription.speakers || [],
                  remarks: currentTranscription.remarks || [],
                  mediaId: prevMediaId,  // Save to PREVIOUS media
                  projectId: projectId
                }
              });
              document.dispatchEvent(saveEvent);
              
              // Wait a bit for save to complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Clear the modified flag after saving
              sessionStorage.setItem('transcriptionModified', 'false');
            }
          } else {
            console.log('[ProjectLoader] No modifications to save for previous media:', prevMediaId);
          }
        }
        
        // Update last media ID
        sessionStorage.setItem('lastMediaId', mediaId);
      };
    
    // Add a small delay to prevent rapid API calls
    const loadWithDelay = async () => {
      await saveBeforeLoad();
      // Add a small delay to prevent 429 errors
      await new Promise(resolve => setTimeout(resolve, 200));
    };
    
    // Execute with delay
    loadWithDelay().then(() => {
      // Now load the new media
      console.log('[ProjectLoader] Loading media:', mediaId, 'project:', projectId);
      
      // Capture current media info in local constants for closure
      const mediaPath = currentMedia.serverPath || currentMedia.filePath;
      const mediaFileName = currentMedia.fileName || currentMedia.name;
      const capturedMedia = { ...currentMedia }; // Create a copy to avoid stale references
      
      if (mediaPath) {
        const mediaUrl = mediaPath.startsWith('http') ? mediaPath : 
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${mediaPath}`;
        console.log('[ProjectLoader] Loading media URL:', mediaUrl, 'mediaId:', mediaId, 'fileName:', mediaFileName);
        onMediaLoad(mediaUrl, mediaFileName, mediaId, projectId);
      }
      
      // Load transcription for this specific media
      console.log('[ProjectLoader] Loading transcription for mediaId:', mediaId, 'projectId:', projectId, 'fileName:', mediaFileName);
      
      // Use the ref to get the latest loadTranscription function
      loadTranscriptionRef.current(mediaId, projectId).then(transcription => {
      if (cancelled) {
        console.log('[ProjectLoader] Transcription load cancelled (media changed)');
        return;
      }
      
      console.log('[ProjectLoader] Transcription loaded for media:', mediaId, {
        blocks: transcription?.blocks?.length || 0,
        firstBlock: transcription?.blocks?.[0]?.text?.substring(0, 50) || 'empty',
        fileName: mediaFileName
      });
      
      // If no transcription, create default with media info
      if (!transcription || !transcription.blocks || transcription.blocks.length === 0) {
        // Use media ID in block ID to ensure uniqueness and correct filename
        transcription = {
          blocks: [{
            id: `block-${mediaId}-${Date.now()}-0`,
            text: `[${mediaFileName || 'media'}] - תמלול חדש`,
            timestamp: 0,
            duration: 0,
            speaker: '',
            isEdited: false
          }],
          speakers: [],
          remarks: []
        };
        console.log('[ProjectLoader] Created default transcription for:', mediaFileName, 'with mediaId:', mediaId);
      }
      
      // Only update if not cancelled
      if (!cancelled) {
        // Clear modified flag when loading new transcription
        sessionStorage.setItem('transcriptionModified', 'false');
        
        // Pass media info with transcription to avoid stale closures
        onTranscriptionLoad({
          ...transcription,
          mediaId: mediaId,
          fileName: mediaFileName
        });
      }
    }).catch(error => {
      if (cancelled) return;
      
      console.error('[ProjectLoader] Error loading transcription:', error);
      // Create default transcription on error - use media ID for unique block ID
      const defaultTranscription = {
        blocks: [{
          id: `block-${mediaId}-${Date.now()}-0`,
          text: `[${mediaFileName || 'media'}] - תמלול חדש`,
          timestamp: 0,
          duration: 0,
          speaker: '',
          isEdited: false
        }],
        speakers: [],
        remarks: []
      };
      // Pass media info with transcription
      onTranscriptionLoad({
        ...defaultTranscription,
        mediaId: mediaId,
        fileName: mediaFileName
      });
    });
    }); // End of loadWithDelay().then()
    }, 500); // 500ms debounce (increased to reduce rate limit issues)
    
    // Cleanup function to cancel pending loads and clear debounce
    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [currentMedia, currentProject, onMediaLoad, onTranscriptionLoad]); // Removed getCurrentTranscription to prevent infinite loop

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => uploadButtonRef.current?.click()}
          className={styles.iconButton}
          title="העלה פרויקט חדש"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v10m0 0l4-4m-4 4l-4-4"/>
            <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7"/>
          </svg>
        </button>
        <button 
          onClick={() => {
            console.log('[ProjectLoader] Manual reload triggered');
            reload();
          }}
          className={styles.iconButton}
          title="טען פרויקטים"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          טוען...
        </div>
      )}

      {/* Hidden file input for direct upload */}
      <input
        ref={uploadButtonRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default ProjectLoader;