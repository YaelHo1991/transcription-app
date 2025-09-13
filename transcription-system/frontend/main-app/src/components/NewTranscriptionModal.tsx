'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useProjectStore from '@/lib/stores/projectStore';
import UrlUploadModal from '@/app/transcription/transcription/components/TranscriptionSidebar/UrlUploadModal';
import DownloadProgressModal from '@/app/transcription/transcription/components/DownloadProgressModal/DownloadProgressModal';
import { buildApiUrl } from '@/utils/api';
import './NewTranscriptionModal.css';

// Type extensions for webkit directory support
interface FileInputElement extends HTMLInputElement {
  webkitdirectory?: boolean;
}

interface FileWithPath extends File {
  webkitRelativePath?: string;
}

interface NewTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTranscriptionModal({ isOpen, onClose }: NewTranscriptionModalProps) {
  const router = useRouter();
  const { createProjectFromFolder, addMediaToProject, setCurrentProject, setCurrentMediaById } = useProjectStore();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState('');
  const [downloadProjectName, setDownloadProjectName] = useState('');

  if (!isOpen) return null;

  const handleSingleMediaUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadSingleFile(file);
      }
    };
    input.click();
  };

  const handleFolderUpload = () => {
    const input = document.createElement('input') as FileInputElement;
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        await uploadFolder(files);
      }
    };
    input.click();
  };

  const uploadSingleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file); // Backend expects 'files' not 'mediaFiles'
      formData.append('folderName', file.name.split('.')[0]);

      const project = await createProjectFromFolder(formData);
      if (project && project.projectId) {
        // Navigate to transcription interface
        setCurrentProject(project);
        if (project.mediaFiles && project.mediaFiles.length > 0) {
          setCurrentMediaById(project.projectId, project.mediaFiles[0]);
        }
        router.push(`/transcription/transcription?project=${project.projectId}`);
        onClose();
      }
    } catch (error) {
      console.error('Error uploading single file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFolder = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      // Get folder name from first file path
      const firstFile = files[0] as FileWithPath;
      const pathParts = (firstFile.webkitRelativePath || firstFile.name).split('/');
      const folderName = pathParts[0];
      
      formData.append('folderName', folderName);
      files.forEach(file => {
        formData.append('files', file); // Backend expects 'files' not 'mediaFiles'
      });

      const project = await createProjectFromFolder(formData);
      if (project && project.projectId) {
        // Navigate to transcription interface
        setCurrentProject(project);
        if (project.mediaFiles && project.mediaFiles.length > 0) {
          setCurrentMediaById(project.projectId, project.mediaFiles[0]);
        }
        router.push(`/transcription/transcription?project=${project.projectId}`);
        onClose();
      }
    } catch (error) {
      console.error('Error uploading folder:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmptyProject = () => {
    // Navigate directly to transcription interface without project
    router.push('/transcription/transcription');
    onClose();
  };

  const handleUrlDownload = () => {
    setShowUrlModal(true);
  };

  const handleUrlSubmit = async (urls: any[], downloadNow: boolean, projectName: string) => {
    setShowUrlModal(false);
    
    if (!downloadNow) {
      // Just close for now if not downloading immediately
      return;
    }
    
    // Start batch download
    try {
      const response = await fetch(buildApiUrl('/api/projects/batch-download'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null || 'dev-anonymous'}`
        },
        body: JSON.stringify({
          urls,
          projectName,
          target: 'new'
        })
      });
      
      if (response.ok) {
        const { batchId } = await response.json();
        setCurrentBatchId(batchId);
        setDownloadProjectName(projectName);
        setShowDownloadProgress(true);
        onClose(); // Close the new transcription modal
      } else {
        console.error('Failed to start batch download');
      }
    } catch (error) {
      console.error('Error starting batch download:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Process dropped items
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length === 1) {
      await uploadSingleFile(files[0]);
    } else if (files.length > 1) {
      await uploadFolder(files);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="new-transcription-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>תמלול חדש</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>

          <div className="modal-content">
            {isUploading ? (
              <div className="uploading-state">
                <div className="spinner"></div>
                <p>מעלה קבצים...</p>
              </div>
            ) : (
              <>
                <div 
                  className={`drop-zone ${dragActive ? 'active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="drop-zone-content">
                    <div className="drop-icon">📁</div>
                    <p>גרור קבצים לכאן או בחר אפשרות מתחת</p>
                  </div>
                </div>

                <div className="options-grid">
                  <button 
                    className="option-card single-media"
                    onClick={handleSingleMediaUpload}
                  >
                    <div className="option-icon">🎵</div>
                    <div className="option-title">העלאה בודדת</div>
                    <div className="option-description">העלה קובץ מדיה בודד</div>
                  </button>

                  <button 
                    className="option-card folder-upload"
                    onClick={handleFolderUpload}
                  >
                    <div className="option-icon">📂</div>
                    <div className="option-title">העלאת תיקיה</div>
                    <div className="option-description">העלה תיקיה עם מספר קבצים</div>
                  </button>

                  <button 
                    className="option-card url-download"
                    onClick={handleUrlDownload}
                  >
                    <div className="option-icon">🌐</div>
                    <div className="option-title">הורדה מ-URL</div>
                    <div className="option-description">הורד מדיה מיוטיוב או אתרים אחרים</div>
                  </button>

                  <button 
                    className="option-card empty-project"
                    onClick={handleEmptyProject}
                  >
                    <div className="option-icon">📄</div>
                    <div className="option-title">פרויקט ריק</div>
                    <div className="option-description">התחל פרויקט חדש ללא מדיה</div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showUrlModal && (
        <UrlUploadModal
          isOpen={showUrlModal}
          onClose={() => setShowUrlModal(false)}
          onSubmit={handleUrlSubmit}
          target="new"
        />
      )}
      {showDownloadProgress && (
        <DownloadProgressModal
          isOpen={showDownloadProgress}
          onClose={() => setShowDownloadProgress(false)}
          batchId={currentBatchId}
          projectName={downloadProjectName}
        />
      )}
    </>
  );
}