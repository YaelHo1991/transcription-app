'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useProjectStore from '@/lib/stores/projectStore';
import NewTranscriptionModal from '@/components/NewTranscriptionModal';

interface Project {
  id: string;
  title: string;
  client?: string;
  company: string;
  workType: 'transcription' | 'proofreading' | 'export';
  status: string;
  createdAt: string;
  pages?: number;
  files?: number;
  duration?: string;
}

interface CompanyGroup {
  name: string;
  projects: Project[];
  totalProjects: number;
  totalPages: number;
  latestDate?: string;
}

export default function TranscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showNewTranscriptionModal, setShowNewTranscriptionModal] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  
  // Real project data from store
  const { projects, loadProjects, isLoading, setCurrentProject, setCurrentMediaById, createProjectFromFolder, addMediaToProject, renameProject } = useProjectStore();
  
  // Mock data for proofreading and export sections (unchanged for now)
  const [proofreadingByCompany, setProofreadingByCompany] = useState<CompanyGroup[]>([]);
  const [exportByCompany, setExportByCompany] = useState<CompanyGroup[]>([]);
  
  // Editing state for project names
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const permissions = localStorage.getItem('permissions') || '';
    
    if (!token) {
      router.push('/login?system=transcription');
      return;
    }

    // Check if user has any transcription permissions
    const hasTranscriptionAccess = 
      permissions.includes('D') || 
      permissions.includes('E') || 
      permissions.includes('F');
    
    if (!hasTranscriptionAccess) {
      router.push('/login?system=transcription');
      return;
    }

    loadRealProjects();
  }, [router]);

  // Hebrew filename decoder (from TextEditor)
  const decodeHebrewFilename = (name: string): string => {
    if (!name) return '';
    try {
      // Handle various encoding formats
      if (name.includes('%')) {
        return decodeURIComponent(name);
      }
      
      if (name.match(/\\u[\da-fA-F]{4}/)) {
        return name.replace(/\\u([\da-fA-F]{4})/g, (match, grp) => {
          return String.fromCharCode(parseInt(grp, 16));
        });
      }
      
      return name;
    } catch (error) {
      console.error('Error decoding Hebrew filename:', error);
      return name;
    }
  };

  // Project navigation handler
  const navigateToProject = (project: any) => {
    setCurrentProject(project);
    if (project.mediaFiles && project.mediaFiles.length > 0) {
      setCurrentMediaById(project.projectId, project.mediaFiles[0]);
    }
    router.push(`/transcription/transcription?project=${project.projectId}`);
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // State for project creation
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  // Duplicate project confirmation state
  const [duplicateProjectConfirm, setDuplicateProjectConfirm] = useState<{
    type: 'exact' | 'partial';
    existingProject: any;
    missingInProject?: string[];
    files: File[];
    folderName: string;
  } | null>(null);
  
  // Drag & Drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const dragCounter = useRef(0);
  
  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });
  
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  // Helper function to format time in HH:MM:SS format (always show hours)
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    // Always show hours, even if 0
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper function to calculate total project duration from MediaInfo
  const getTotalProjectDuration = (project: Project): number => {
    // First try using mediaInfo array if available
    if (project.mediaInfo && project.mediaInfo.length > 0) {
      return project.mediaInfo.reduce((total, media) => total + (media.duration || 0), 0);
    }
    // Fallback to mediaDurations if mediaInfo not available
    if (project.mediaDurations) {
      return Object.values(project.mediaDurations).reduce((total, duration) => total + duration, 0);
    }
    return 0;
  };


  const handleFolderUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    (input as any).webkitdirectory = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        await handleFilesSelected(files);
      }
    };
    input.click();
  };

  const handleMediaUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        await handleFilesSelected(files);
      }
    };
    input.click();
  };

  const handleDuplicateProjectConfirm = async (action: 'create' | 'addMissing' | 'useExisting' | 'cancel') => {
    if (!duplicateProjectConfirm) return;
    
    const { existingProject, files, folderName } = duplicateProjectConfirm;
    
    if (action === 'create') {
      // Create anyway with force flag
      const formData = new FormData();
      formData.append('folderName', folderName);
      formData.append('computerId', localStorage.getItem('computerId') || 'main-page-' + Date.now());
      formData.append('computerName', localStorage.getItem('computerName') || 'Main Page Upload');
      formData.append('force', 'true'); // Force creation
      
      const fileNames = files.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      setIsCreatingProject(true);
      const newProject = await createProjectFromFolder(formData);
      
      if (newProject && newProject.projectId) {
        await loadProjects();
        setCurrentProject(newProject);
        if (newProject.mediaFiles && newProject.mediaFiles.length > 0) {
          await setCurrentMediaById(newProject.projectId, newProject.mediaFiles[0]);
        }
      }
      setIsCreatingProject(false);
      setDuplicateProjectConfirm(null);
      
    } else if (action === 'addMissing' && duplicateProjectConfirm.type === 'partial') {
      // Add missing files to existing project
      const missingFiles = files.filter(f => 
        duplicateProjectConfirm.missingInProject?.includes(f.name)
      );
      
      if (missingFiles.length > 0) {
        const formData = new FormData();
        missingFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const result = await addMediaToProject(existingProject.projectId, formData);
        if (result && result.success) {
          await loadProjects();
        }
      }
      setDuplicateProjectConfirm(null);
      
    } else if (action === 'useExisting') {
      // Use existing project
      setCurrentProject(existingProject);
      if (existingProject.mediaFiles && existingProject.mediaFiles.length > 0) {
        await setCurrentMediaById(existingProject.projectId, existingProject.mediaFiles[0]);
      }
      setDuplicateProjectConfirm(null);
      
    } else {
      // Cancel
      setDuplicateProjectConfirm(null);
    }
  };

  const handleFilesSelected = async (files: FileList) => {
    if (!files || files.length === 0) {
      showNotification('לא נבחרו קבצים', 'error');
      return;
    }
    
    setIsCreatingProject(true);
    
    try {
      // Extract folder name from path or generate one
      let folderName = '';
      
      // Check if it's a folder upload
      if (files[0] && 'webkitRelativePath' in files[0]) {
        const path = (files[0] as any).webkitRelativePath;
        if (path) {
          folderName = path.split('/')[0];
        }
      }
      
      // If no folder name from path, generate timestamp-based name
      if (!folderName) {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-').replace(/-/g, '_');
        const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        folderName = `${timestamp}_${randomNum}`;
      }
      
      // Filter for media files only
      const mediaFiles = Array.from(files).filter(file => 
        file.type.startsWith('audio/') || 
        file.type.startsWith('video/') ||
        // Also check by extension for files with no MIME type
        /\.(mp3|mp4|wav|m4a|aac|ogg|webm|mkv|avi|mov|flac)$/i.test(file.name)
      );
      
      if (mediaFiles.length === 0) {
        showNotification('לא נמצאו קבצי מדיה בקבצים שנבחרו', 'error');
        setIsCreatingProject(false);
        return;
      }
      
      // Create FormData for upload
      const formData = new FormData();
      const computerId = localStorage.getItem('computerId') || 'main-page-' + Date.now();
      const computerName = localStorage.getItem('computerName') || 'Main Page Upload';
      
      formData.append('folderName', folderName);
      formData.append('computerId', computerId);
      formData.append('computerName', computerName);
      
      // Send filenames separately to preserve UTF-8 encoding
      const fileNames = mediaFiles.map(f => f.name);
      formData.append('fileNames', JSON.stringify(fileNames));
      
      mediaFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // Create project using store method
      const project = await createProjectFromFolder(formData);
      
      // Check if it's a duplicate project
      if (project && project.isDuplicateProject) {
        setDuplicateProjectConfirm({
          type: project.duplicateType,
          existingProject: project.existingProject,
          missingInProject: project.missingInProject,
          files: mediaFiles,
          folderName
        });
        setIsCreatingProject(false);
        return;
      }
      
      if (project && project.projectId) {
        // Reload projects to update the list
        await loadProjects();
        
        // Set current project but DON'T navigate
        setCurrentProject(project);
        if (project.mediaFiles && project.mediaFiles.length > 0) {
          await setCurrentMediaById(project.projectId, project.mediaFiles[0]);
        }
        // Don't navigate - stay on main page
        // router.push(`/transcription/transcription?project=${project.projectId}`);
      } else {
        // Handle error cases
        if (!project) {
          showNotification('שגיאה ביצירת פרויקט. בדוק את חיבור השרת.', 'error');
        } else if (project.error === 'storage_limit') {
          showNotification('חריגה ממגבלת האחסון. אנא פנה למנהל המערכת.', 'error');
        } else if (project.hasArchivedTranscriptions) {
          showNotification('נמצאו תמלולים ארכיביים עבור קבצים אלה.', 'info');
        } else {
          showNotification('לא ניתן ליצור פרויקט. אנא נסה שוב.', 'error');
        }
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showNotification('שגיאה ביצירת פרויקט', 'error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const loadRealProjects = async () => {
    try {
      await loadProjects(); // Load real projects from store
    } catch (error) {
      console.error('Error loading projects:', error);
    }

    // Mock data for proofreading and export sections (unchanged for now)
    const mockProofreadingGroups: CompanyGroup[] = [
      {
        name: 'האוניברסיטה העברית',
        totalProjects: 2,
        totalPages: 28,
        latestDate: '15/01',
        projects: [
          {
            id: '6',
            title: 'הרצאה - פיזיקה קוונטית',
            company: 'האוניברסיטה העברית',
            workType: 'proofreading',
            status: 'review',
            createdAt: '2024-01-15',
            pages: 18
          }
        ]
      }
    ];

    const mockExportGroups: CompanyGroup[] = [
      {
        name: 'רדיו דיגיטלי',
        totalProjects: 1,
        totalPages: 0,
        latestDate: '15/01',
        projects: [
          {
            id: '8',
            title: 'תוכנית בוקר - 15.01',
            company: 'רדיו דיגיטלי',
            workType: 'export',
            status: 'ready',
            createdAt: '2024-01-15'
          }
        ]
      }
    ];

    setProofreadingByCompany(mockProofreadingGroups);
    setExportByCompany(mockExportGroups);
    setLoading(false);
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
        showNotification('אנא גרור קבצי מדיה בלבד (אודיו או וידאו)', 'error');
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
      showNotification('אנא גרור קבצי מדיה בלבד (אודיו או וידאו)', 'error');
      return;
    }
    
    // Add media to existing project
    await handleAddMediaToProject(projectId, mediaFiles);
  };

  const handleFolderDrop = async (folderEntry: any) => {
    const files: File[] = [];
    
    const readDirectory = async (directoryEntry: any) => {
      const reader = directoryEntry.createReader();
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
      showNotification('לא נמצאו קבצי מדיה בתיקייה', 'error');
      return;
    }
    
    // Create project with folder name
    const folderName = folderEntry.name;
    const formData = new FormData();
    formData.append('folderName', folderName);
    formData.append('computerId', 'drag-drop');
    formData.append('computerName', 'Drag & Drop');
    
    const fileNames = files.map(f => f.name);
    formData.append('fileNames', JSON.stringify(fileNames));
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      setIsCreatingProject(true);
      const result = await createProjectFromFolder(formData);
      
      console.log('[Main Page] Create project result:', result);
      
      // Check if it's a duplicate project response
      if (result && result.isDuplicateProject) {
        console.log('[Main Page] Duplicate detected, showing modal');
        setDuplicateProjectConfirm({
          type: result.duplicateType,
          existingProject: result.existingProject,
          missingInProject: result.missingInProject,
          files: files,
          folderName,
        });
        setIsCreatingProject(false);
        return;
      }
      
      // Check if it's an error response
      if (result && result.error === 'storage_limit') {
        const { currentUsedMB, limitMB, requestedMB } = result.storageDetails || {};
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showNotification(message, 'error');
      } else if (result && result.projectId) {
        showNotification(`פרויקט "${folderName}" נוצר בהצלחה`, 'success');
        await loadProjects();
      } else {
        showNotification('שגיאה ביצירת פרויקט', 'error');
      }
    } catch (error) {
      console.error('[Main Page] Error creating project:', error);
      showNotification('שגיאה ביצירת פרויקט', 'error');
    } finally {
      setIsCreatingProject(false);
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
    
    const fileNames = files.map(f => f.name);
    formData.append('fileNames', JSON.stringify(fileNames));
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      setIsCreatingProject(true);
      const result = await createProjectFromFolder(formData);
      
      console.log('[Main Page] Create project from media result:', result);
      
      if (result && result.isDuplicateProject) {
        console.log('[Main Page] Duplicate detected for media files, showing modal');
        setDuplicateProjectConfirm({
          type: result.duplicateType,
          existingProject: result.existingProject,
          missingInProject: result.missingInProject,
          files: files,
          folderName,
        });
        setIsCreatingProject(false);
        return;
      }
      
      if (result && result.error === 'storage_limit') {
        const { currentUsedMB, limitMB, requestedMB } = result.storageDetails || {};
        const message = `אין מספיק מקום אחסון. השתמשת ב-${currentUsedMB}MB מתוך ${limitMB}MB. נדרש ${requestedMB}MB נוסף`;
        showNotification(message, 'error');
      } else if (result && result.projectId) {
        showNotification(`פרויקט חדש נוצר בהצלחה`, 'success');
        await loadProjects();
      } else {
        showNotification('שגיאה ביצירת פרויקט', 'error');
      }
    } catch (error) {
      console.error('[Main Page] Error creating project from media:', error);
      showNotification('שגיאה ביצירת פרויקט', 'error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleAddMediaToProject = async (projectId: string, files: File[]) => {
    const formData = new FormData();
    
    const fileNames = files.map(f => f.name);
    formData.append('fileNames', JSON.stringify(fileNames));
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const result = await addMediaToProject(projectId, formData);
      
      if (result && result.success) {
        const project = projects.find(p => p.projectId === projectId);
        const projectName = project ? decodeHebrewFilename(project.displayName) : 'הפרויקט';
        showNotification(`${files.length} קבצים נוספו ל${projectName}`, 'success');
        await loadProjects();
      } else {
        showNotification('שגיאה בהוספת מדיה לפרויקט', 'error');
      }
    } catch (error) {
      showNotification('שגיאה בהוספת מדיה לפרויקט', 'error');
    }
  };

  // Project Rename Handlers
  const handleStartEditProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingProjectName(currentName);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveProjectName(projectId);
    } else if (e.key === 'Escape') {
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
    const project = projects.find(p => p.projectId === projectId);
    if (project && newName === project.displayName) {
      handleCancelEdit();
      return;
    }
    
    try {
      const success = await renameProject(projectId, newName);
      if (success) {
        showNotification(`שם הפרויקט שונה בהצלחה ל-"${newName}"`, 'success');
        handleCancelEdit();
      } else {
        showNotification('שגיאה בשינוי שם הפרויקט', 'error');
      }
    } catch (error) {
      console.error('Error renaming project:', error);
      showNotification('שגיאה בשינוי שם הפרויקט', 'error');
    }
  };

  const toggleCompany = (companyKey: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyKey)) {
      newExpanded.delete(companyKey);
    } else {
      newExpanded.add(companyKey);
    }
    setExpandedCompanies(newExpanded);
  };

  const renderCompanyGroup = (group: CompanyGroup, workType: string) => {
    const companyKey = `${workType}-${group.name}`;
    const isExpanded = expandedCompanies.has(companyKey);

    return (
      <div key={companyKey} className="company-group">
        <div className="company-header" onClick={() => toggleCompany(companyKey)}>
          <div className="company-info">
            <div className="company-icon">🏢</div>
            <div className="company-details">
              <div className="company-name">{group.name}</div>
              <div className="company-stats">
                <span className="company-stat">{group.totalProjects} פרויקטים</span>
                {group.totalPages > 0 && (
                  <span className="company-stat">{group.totalPages} עמודים</span>
                )}
                {group.latestDate && (
                  <span className="company-stat">עדכון: {group.latestDate}</span>
                )}
              </div>
            </div>
          </div>
          <button className="company-toggle">
            <span className="toggle-text">{isExpanded ? 'הסתר' : 'הצג'} פרטים</span>
          </button>
        </div>

        {isExpanded && (
          <div className="company-projects expanded">
            {group.projects.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-title">{project.title}</div>
                <div className="project-details">
                  {project.client && (
                    <div><strong>לקוח:</strong> {project.client}</div>
                  )}
                  {project.pages && (
                    <div><strong>עמודים:</strong> {project.pages}</div>
                  )}
                  {project.files && (
                    <div><strong>קבצים:</strong> {project.files}</div>
                  )}
                  {project.duration && (
                    <div><strong>משך:</strong> {project.duration}</div>
                  )}
                </div>
                <div className="project-actions">
                  {workType === 'transcription' && (
                    <button className="btn btn-primary">התחל תמלול</button>
                  )}
                  {workType === 'proofreading' && (
                    <button className="btn btn-primary">התחל הגהה</button>
                  )}
                  {workType === 'export' && (
                    <button className="btn btn-primary">ייצא</button>
                  )}
                  <button className="btn btn-secondary">פרטים</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const totalTranscription = projects.length;
  const totalProofreading = proofreadingByCompany.reduce((sum, g) => sum + g.totalProjects, 0);
  const totalExport = exportByCompany.reduce((sum, g) => sum + g.totalProjects, 0);

  return (
    <div className="container">
      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{totalTranscription}</div>
          <div className="stat-label">עבודות תמלול</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✏️</div>
          <div className="stat-value">{totalProofreading}</div>
          <div className="stat-label">עבודות הגהה</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-value">{totalExport}</div>
          <div className="stat-label">עבודות ייצוא</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{totalTranscription + totalProofreading + totalExport}</div>
          <div className="stat-label">סה"כ עבודות</div>
        </div>
      </div>

      {/* Main Work Sections Grid */}
      <div className="main-grid">
        {/* Transcription Section */}
        <div 
          className={`work-section transcription-section ${isDragging ? 'drag-over' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Link href="/transcription/transcription" className="section-header">
            <div className="section-icon">📝</div>
            <div>
              <div className="section-title">תמלול</div>
              <div className="section-count">{totalTranscription} עבודות</div>
            </div>
          </Link>
          
          {/* Notification */}
          {notification.visible && (
            <div className={`main-page-notification notification-${notification.type}`}>
              {notification.message}
            </div>
          )}

          <div className="work-section-content">
            {isCreatingProject ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>יוצר פרויקט חדש...</p>
              </div>
            ) : isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>טוען פרויקטים...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>אין פרויקטי תמלול כרגע</h3>
                <p>פרויקטים חדשים יופיעו כאן</p>
              </div>
            ) : (
              projects.map(project => (
                <div 
                  key={project.projectId} 
                  className={`real-project-card ${dragOverProject === project.projectId ? 'drag-over-project' : ''}`}
                  onClick={() => navigateToProject(project)}
                  onDragOver={(e) => handleProjectDragOver(e, project.projectId)}
                  onDragLeave={handleProjectDragLeave}
                  onDrop={(e) => handleProjectDrop(e, project.projectId)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartEditProject(project.projectId, project.displayName);
                  }}
                >
                  <div className="project-header-info">
                    {editingProjectId === project.projectId ? (
                      <div className="project-name-edit-main">
                        <input
                          type="text"
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, project.projectId)}
                          onBlur={() => handleSaveProjectName(project.projectId)}
                          onClick={(e) => e.stopPropagation()}
                          className="project-name-input-main"
                          autoFocus
                          dir="rtl"
                        />
                      </div>
                    ) : (
                      <div className="project-name-hebrew" title="לחץ פעמיים לעריכת שם">
                        {decodeHebrewFilename(project.displayName)}
                      </div>
                    )}
                  </div>
                  <div className="project-details">
                    <div>{project.totalMedia} קבצים • {project.size ? formatFileSize(project.size) : '0 B'}</div>
                    <div>משך כולל: {formatTime(getTotalProjectDuration(project))}</div>
                  </div>
                  <div className="project-actions">
                    <button className="btn btn-primary" onClick={(e) => {
                      e.stopPropagation();
                      navigateToProject(project);
                    }}>
                      פתח פרויקט
                    </button>
                    {editingProjectId !== project.projectId && (
                      <button 
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditProject(project.projectId, project.displayName);
                        }}
                        title="ערוך שם פרויקט"
                      >
                        ערוך
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="column-action">
            <div className="main-page-transcription-buttons">
              <button 
                className="main-page-add-folder-btn"
                onClick={handleFolderUpload}
                title="העלה תיקיה עם קבצי מדיה"
              >
                <span>+</span>
                <span>תיקיה</span>
              </button>
              <button 
                className="main-page-add-media-btn"
                onClick={handleMediaUpload}
                title="העלה קבצי מדיה בודדים"
              >
                <span>+</span>
                <span>מדיה</span>
              </button>
            </div>
          </div>
        </div>

        {/* Proofreading Section */}
        <div className="work-section proofreading-section">
          <Link href="/transcription/proofreading" className="section-header">
            <div className="section-icon">✏️</div>
            <div>
              <div className="section-title">הגהה</div>
              <div className="section-count">{totalProofreading} עבודות</div>
            </div>
          </Link>

          <div className="work-section-content">
            {proofreadingByCompany.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✏️</div>
                <h3>אין עבודות הגהה כרגע</h3>
                <p>עבודות הגהה חדשות יופיעו כאן</p>
              </div>
            ) : (
              proofreadingByCompany.map(group => renderCompanyGroup(group, 'proofreading'))
            )}
          </div>
          
          <div className="column-action">
            <button className="btn-add-project">
              <span>✏️</span>
              <span>הגהה חדשה</span>
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div className="work-section export-section">
          <Link href="/transcription/export" className="section-header">
            <div className="section-icon">📤</div>
            <div>
              <div className="section-title">ייצוא</div>
              <div className="section-count">{totalExport} עבודות</div>
            </div>
          </Link>

          <div className="work-section-content">
            {exportByCompany.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📤</div>
                <h3>אין עבודות ייצוא כרגע</h3>
                <p>עבודות ייצוא חדשות יופיעו כאן</p>
              </div>
            ) : (
              exportByCompany.map(group => renderCompanyGroup(group, 'export'))
            )}
          </div>
          
          <div className="column-action">
            <button className="btn-add-project">
              <span>📤</span>
              <span>ייצוא חדש</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Transcription Modal */}
      <NewTranscriptionModal 
        isOpen={showNewTranscriptionModal}
        onClose={() => setShowNewTranscriptionModal(false)}
      />

      {/* Duplicate Project Confirmation Modal */}
      {duplicateProjectConfirm && (
        <div className="main-duplicate-confirm-overlay">
          <div className="main-duplicate-confirm-dialog">
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
                <div className="main-duplicate-confirm-buttons">
                  <button 
                    className="main-confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('useExisting')}
                  >
                    השתמש בפרויקט הקיים
                  </button>
                  <button 
                    className="main-confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                  >
                    צור פרויקט חדש בכל זאת
                  </button>
                  <button 
                    className="main-cancel-btn"
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
                <ul className="main-missing-files-list">
                  {duplicateProjectConfirm.missingInProject?.map((fileName, index) => (
                    <li key={index} className="main-missing-file-item">
                      {fileName}
                    </li>
                  ))}
                </ul>
                <p>מה תרצה לעשות?</p>
                <div className="main-duplicate-confirm-buttons">
                  <button 
                    className="main-confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('addMissing')}
                  >
                    הוסף רק קבצים חסרים
                  </button>
                  <button 
                    className="main-confirm-btn"
                    onClick={() => handleDuplicateProjectConfirm('create')}
                  >
                    צור פרויקט חדש
                  </button>
                  <button 
                    className="main-cancel-btn"
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
    </div>
  );
}