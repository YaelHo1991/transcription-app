'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { buildApiUrl } from '@/utils/api';
import './UrlUploadModal.css';

interface PlaylistVideoInfo {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  uploader?: string;
  uploadDate?: string;
}

interface PlaylistInfo {
  title: string;
  id: string;
  description?: string;
  uploader?: string;
  videoCount: number;
  videos: PlaylistVideoInfo[];
}

interface UrlConfig {
  id: string;
  url: string;
  mediaName?: string;
  cookieFile?: File;
  selectedQuality: 'high' | 'medium' | 'low';
  downloadType: 'video' | 'audio';
  qualityOptions: Array<{
    quality: 'high' | 'medium' | 'low';
    resolution: string;
    estimatedSize: string;
  }>;
  status: 'editing' | 'configured' | 'error';
  urlStatus: 'unchecked' | 'checking' | 'public' | 'protected' | 'invalid' | 'playlist' | 'protected-playlist';
  urlCheckMessage: string;
  isLoadingQuality: boolean;
  requiresCookies: boolean;
  cookieUploaded: boolean;
  showQualityPanel?: boolean;
  showCookiePanel?: boolean;
  
  // Playlist specific fields
  isPlaylist?: boolean;
  playlistInfo?: PlaylistInfo;
  originalPlaylistUrl?: string; // Store original playlist URL
  playlistVideoId?: string; // For individual videos from playlist
  isSelected?: boolean; // Whether this video is selected for download
  downloadStatus?: 'not-downloaded' | 'downloaded' | 'unavailable';
}

interface UrlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: UrlConfig[], downloadNow: boolean, projectName: string) => Promise<void>;
  target: 'new' | string; // 'new' for new project, or projectId for existing
  projectName?: string; // Name of existing project if adding to existing
}

const UrlUploadModal: React.FC<UrlUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  target,
  projectName
}) => {
  const [urls, setUrls] = useState<UrlConfig[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingButton, setLoadingButton] = useState<'download' | 'create' | null>(null);
  const [error, setError] = useState('');
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [showPlaylistConfirmation, setShowPlaylistConfirmation] = useState<string | null>(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<Set<string>>(new Set());
  const [playlistInitialized, setPlaylistInitialized] = useState(false);
  const [playlistVideoQualities, setPlaylistVideoQualities] = useState<{[key: string]: 'high' | 'medium' | 'low' | 'audio'}>({});
  const [globalPlaylistQuality, setGlobalPlaylistQuality] = useState<'high' | 'medium' | 'low' | 'audio'>('high');
  const [showQualityDropdown, setShowQualityDropdown] = useState<string | null>(null);
  
  const cookieInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const urlCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with one empty URL config when modal opens
  useEffect(() => {
    if (isOpen && urls.length === 0) {
      // Generate default project name with date
      const now = new Date();
      const dateStr = now.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      }).replace(/\//g, '.');
      const timeStr = now.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setProjectNameInput(`YouTube - ${dateStr} ${timeStr}`);
      
      const newId = `url-${Date.now()}`;
      const newUrlConfig: UrlConfig = {
        id: newId,
        url: '',
        selectedQuality: 'high',
        downloadType: 'video',
        qualityOptions: [
          { quality: 'high', resolution: 'מיטבית', estimatedSize: '200-500 MB', format: 'mp4' },
          { quality: 'medium', resolution: '720p', estimatedSize: '100-250 MB', format: 'mp4' },
          { quality: 'low', resolution: '480p', estimatedSize: '50-150 MB', format: 'mp4' },
          { quality: 'audio' as 'high' | 'medium' | 'low', resolution: 'אודיו בלבד', estimatedSize: '10-30 MB', format: 'mp3' }
        ],
        status: 'editing',
        urlStatus: 'unchecked',
        urlCheckMessage: '',
        isLoadingQuality: false,
        requiresCookies: false,
        cookieUploaded: false,
        showQualityPanel: false,
        showCookiePanel: false
      };
      setUrls([newUrlConfig]);
      setActiveUrlId(newId);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setUrls([]);
        setCurrentUrl('');
        setError('');
        setActiveUrlId(null);
        setIsLoading(false);
        setLoadingButton(null);
        
        // Clear any pending timeouts
        if (urlCheckTimeoutRef.current) {
          clearTimeout(urlCheckTimeoutRef.current);
          urlCheckTimeoutRef.current = null;
        }
      }, 300);
    }
  }, [isOpen]);

  const addNewUrl = () => {
    const newId = `url-${Date.now()}`;
    const newUrlConfig: UrlConfig = {
      id: newId,
      url: '',
      selectedQuality: 'high',
      downloadType: 'video',
      qualityOptions: [
        { quality: 'high', resolution: 'מיטבית', estimatedSize: '200-500 MB', format: 'mp4' },
        { quality: 'medium', resolution: '720p', estimatedSize: '100-250 MB', format: 'mp4' },
        { quality: 'low', resolution: '480p', estimatedSize: '50-150 MB', format: 'mp4' },
        { quality: 'audio' as 'high' | 'medium' | 'low', resolution: 'אודיו בלבד', estimatedSize: '10-30 MB', format: 'mp3' }
      ],
      status: 'editing',
      urlStatus: 'unchecked',
      urlCheckMessage: '',
      isLoadingQuality: false,
      requiresCookies: false,
      cookieUploaded: false,
      showQualityPanel: false,
      showCookiePanel: false
    };
    setUrls(prev => [...prev, newUrlConfig]);
    setActiveUrlId(newId);
  };

  const updateUrlConfig = (id: string, updates: Partial<UrlConfig>) => {
    setUrls(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const removeUrl = (id: string) => {
    setUrls(prev => prev.filter(u => u.id !== id));
    if (activeUrlId === id) {
      setActiveUrlId(null);
    }
  };

  // Fetch quality options for a specific URL
  const fetchQualityOptions = async (urlConfig: UrlConfig) => {
    updateUrlConfig(urlConfig.id, { isLoadingQuality: true });
    
    try {
      const formData = new FormData();
      formData.append('url', urlConfig.url);
      if (urlConfig.cookieFile) {
        formData.append('cookieFile', urlConfig.cookieFile);
      }
      
      const response = await fetch(buildApiUrl('/api/projects/quality-options'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Quality options response:', result);
        
        if (result.options && Array.isArray(result.options)) {
          // The backend returns the options with estimatedSize already included
          // Add audio option separately if not already included
          const hasAudioOption = result.options.some((opt: any) => 
            opt.resolution === 'אודיו בלבד' || opt.format === 'mp3'
          );
          
          if (!hasAudioOption) {
            // Calculate audio size estimation (roughly 1MB per minute at 128kbps)
            const audioOption = {
              quality: 'audio' as 'high' | 'medium' | 'low',
              resolution: 'אודיו בלבד',
              estimatedSize: 'אודיו ~10-50 MB',
              format: 'mp3'
            };
            updateUrlConfig(urlConfig.id, { 
              qualityOptions: [...result.options, audioOption],
              isLoadingQuality: false 
            });
          } else {
            updateUrlConfig(urlConfig.id, { 
              qualityOptions: result.options,
              isLoadingQuality: false 
            });
          }
        }
      } else {
        // Fallback with default options
        updateUrlConfig(urlConfig.id, { 
          qualityOptions: [
            { quality: 'high', resolution: 'מיטבית', estimatedSize: '200-500 MB', format: 'mp4' },
            { quality: 'medium', resolution: '720p', estimatedSize: '100-250 MB', format: 'mp4' },
            { quality: 'low', resolution: '480p', estimatedSize: '50-150 MB', format: 'mp4' },
            { quality: 'audio' as 'high' | 'medium' | 'low', resolution: 'אודיו בלבד', estimatedSize: '10-30 MB', format: 'mp3' }
          ],
          isLoadingQuality: false 
        });
      }
    } catch (error) {
      console.log('Could not fetch quality options, using defaults');
      updateUrlConfig(urlConfig.id, { 
        qualityOptions: [
          { quality: 'high', resolution: 'מיטבית', estimatedSize: '200-500 MB', format: 'mp4' },
          { quality: 'medium', resolution: '720p', estimatedSize: '100-250 MB', format: 'mp4' },
          { quality: 'low', resolution: '480p', estimatedSize: '50-150 MB', format: 'mp4' },
          { quality: 'audio' as 'high' | 'medium' | 'low', resolution: 'אודיו בלבד', estimatedSize: '10-30 MB', format: 'mp3' }
        ],
        isLoadingQuality: false 
      });
    }
  };

  // Extract media name from URL
  const extractMediaName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // YouTube - just show the full URL for now, will be replaced with actual title after check
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return url;
      }
      
      // Default: show full URL
      return url;
    } catch {
      return url;
    }
  };

  // Check URL status when user stops typing
  const checkUrlStatus = async (urlConfig: UrlConfig) => {
    if (urlCheckTimeoutRef.current) {
      clearTimeout(urlCheckTimeoutRef.current);
    }
    
    // Basic URL validation
    try {
      new URL(urlConfig.url);
      // Extract media name from URL
      const mediaName = extractMediaName(urlConfig.url);
      updateUrlConfig(urlConfig.id, { mediaName });
    } catch {
      updateUrlConfig(urlConfig.id, {
        urlStatus: 'unchecked',
        requiresCookies: false,
        urlCheckMessage: '',
        mediaName: ''
      });
      return;
    }
    
    urlCheckTimeoutRef.current = setTimeout(async () => {
      updateUrlConfig(urlConfig.id, { urlStatus: 'checking' });
      
      try {
        const response = await fetch(buildApiUrl('/api/projects/check-url'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || 'dev-anonymous'}`
          },
          body: JSON.stringify({ url: urlConfig.url })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('URL check result:', result);
          
          if (result.status === 'public') {
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'public',
              requiresCookies: false,
              urlCheckMessage: '',
              mediaName: result.title || urlConfig.mediaName, // Use the title from backend
              showQualityPanel: true  // Auto-show quality panel for public content
            });
            // Fetch quality options for public content
            fetchQualityOptions(urlConfig);
          } else if (result.status === 'protected') {
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'protected',
              requiresCookies: true,
              urlCheckMessage: '🔒 נדרש קובץ Cookies עבור תוכן זה',
              mediaName: result.title || urlConfig.mediaName, // Use the title from backend
              showCookiePanel: true  // Auto-show cookie panel for protected content
            });
          } else if (result.status === 'playlist') {
            // Handle playlist detection - show confirmation
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'playlist',
              requiresCookies: false,
              urlCheckMessage: `📝 רשימת השמעה: ${result.videoCount} סרטונים`,
              mediaName: result.title || urlConfig.mediaName,
              isPlaylist: true,
              playlistInfo: result.playlist,
              originalPlaylistUrl: urlConfig.url
            });
            // Show playlist confirmation dialog
            setShowPlaylistConfirmation(urlConfig.id);
          } else if (result.status === 'protected-playlist') {
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'protected-playlist',
              requiresCookies: true,
              urlCheckMessage: '🔒📝 רשימת השמעה פרטית - נדרש קובץ Cookies',
              mediaName: result.title || 'רשימת השמעה פרטית',
              isPlaylist: true,
              playlistInfo: result.playlist,
              originalPlaylistUrl: urlConfig.url,
              showCookiePanel: true
            });
            // Show playlist confirmation dialog for protected playlists too
            if (result.playlist) {
              setShowPlaylistConfirmation(urlConfig.id);
            }
          } else if (result.status === 'invalid') {
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'invalid',
              requiresCookies: false,
              urlCheckMessage: '⚠ ' + (result.message || 'כתובת URL לא תקינה')
            });
          } else {
            // Default to public if status is unknown
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'public',
              requiresCookies: false,
              urlCheckMessage: '',
              mediaName: result.title || urlConfig.mediaName // Use the title from backend
            });
            fetchQualityOptions(urlConfig);
          }
        } else {
          // Log the error response
          const errorText = await response.text();
          console.error('URL check failed:', response.status, errorText);
          // If check fails, assume public and show quality options
          updateUrlConfig(urlConfig.id, {
            urlStatus: 'public',
            requiresCookies: false,
            urlCheckMessage: ''
          });
          fetchQualityOptions(urlConfig);
        }
      } catch (error) {
        // If check fails, assume public and show quality options
        console.log('URL check failed, assuming public:', error);
        updateUrlConfig(urlConfig.id, {
          urlStatus: 'public',
          requiresCookies: false,
          urlCheckMessage: ''
        });
        fetchQualityOptions(urlConfig);
      }
    }, 1000);
  };

  const handleUrlChange = (id: string, newUrl: string) => {
    updateUrlConfig(id, { url: newUrl });
    const urlConfig = urls.find(u => u.id === id);
    if (urlConfig && newUrl.trim()) {
      checkUrlStatus({ ...urlConfig, url: newUrl });
    } else if (!newUrl.trim()) {
      // Clear status when URL is empty
      updateUrlConfig(id, {
        urlStatus: 'unchecked',
        requiresCookies: false,
        urlCheckMessage: ''
      });
    }
  };

  const handleCookieFileChange = (id: string, file: File) => {
    updateUrlConfig(id, { 
      cookieFile: file,
      cookieUploaded: true,
      urlCheckMessage: '✓ קובץ Cookies הועלה בהצלחה',
      showQualityPanel: true,
      showCookiePanel: false
    });
    
    const urlConfig = urls.find(u => u.id === id);
    if (urlConfig) {
      fetchQualityOptions({ ...urlConfig, cookieFile: file });
    }
  };

  const handleQualitySelect = (id: string, quality: string) => {
    if (quality === 'audio') {
      updateUrlConfig(id, { 
        downloadType: 'audio',
        selectedQuality: 'high', // Use high quality for audio
        status: 'configured',
        showQualityPanel: false,
        showCookiePanel: false
      });
    } else {
      updateUrlConfig(id, { 
        downloadType: 'video',
        selectedQuality: quality as 'high' | 'medium' | 'low',
        status: 'configured',
        showQualityPanel: false,
        showCookiePanel: false
      });
    }
    setActiveUrlId(null);
    
    // Automatically add a new empty URL after quality selection
    setTimeout(() => {
      addNewUrl();
    }, 100);
  };

  const finalizeUrlConfig = (id: string) => {
    const urlConfig = urls.find(u => u.id === id);
    if (urlConfig && urlConfig.url) {
      updateUrlConfig(id, { 
        status: 'configured',
        showQualityPanel: false,
        showCookiePanel: false
      });
      setActiveUrlId(null);
    }
  };

  const editUrlConfig = (id: string) => {
    setActiveUrlId(id);
    updateUrlConfig(id, { status: 'editing' });
  };

  // Handle playlist expansion
  const handlePlaylistConfirm = (playlistUrlId: string) => {
    const playlistUrlConfig = urls.find(u => u.id === playlistUrlId);
    if (!playlistUrlConfig || !playlistUrlConfig.playlistInfo) return;

    // Remove the original playlist URL config
    const filteredUrls = urls.filter(u => u.id !== playlistUrlId);
    
    // Create individual URL configs for each selected video in the playlist
    const videoConfigs: UrlConfig[] = playlistUrlConfig.playlistInfo.videos
      .filter(video => selectedPlaylistVideos.has(video.id))
      .map((video, index) => {
        const quality = playlistVideoQualities[video.id] || globalPlaylistQuality || 'high';
        const isAudio = quality === 'audio';
        
        return {
          id: `${playlistUrlId}-video-${index}`,
          url: video.url,
          mediaName: video.title,
          cookieFile: playlistUrlConfig.cookieFile, // Inherit cookie file from playlist
          selectedQuality: isAudio ? 'high' : quality as 'high' | 'medium' | 'low',
          downloadType: isAudio ? 'audio' : 'video',
          qualityOptions: [],
          status: 'configured', // Mark as configured since quality is already selected
          urlStatus: 'unchecked',
          urlCheckMessage: '',
          isLoadingQuality: false,
          requiresCookies: playlistUrlConfig.requiresCookies,
          cookieUploaded: playlistUrlConfig.cookieUploaded,
          showQualityPanel: false,
          showCookiePanel: false,
          
          // Playlist-specific fields
          isPlaylist: false,
          originalPlaylistUrl: playlistUrlConfig.originalPlaylistUrl,
          playlistVideoId: video.id,
          isSelected: true,
          downloadStatus: 'not-downloaded'
        };
      });
    
    // Update the URLs array
    setUrls([...filteredUrls, ...videoConfigs]);
    setShowPlaylistConfirmation(null);
    setActiveUrlId(null);
    setPlaylistInitialized(false);
    setSelectedPlaylistVideos(new Set());
    setPlaylistVideoQualities({});
  };

  const handlePlaylistCancel = (playlistUrlId: string) => {
    // Just remove the playlist URL and close dialog
    setUrls(prev => prev.filter(u => u.id !== playlistUrlId));
    setShowPlaylistConfirmation(null);
  };

  const handleVideoToggle = (videoId: string) => {
    updateUrlConfig(videoId, { 
      isSelected: !urls.find(u => u.id === videoId)?.isSelected 
    });
  };

  const handleSelectAllVideos = (select: boolean) => {
    const playlistVideos = urls.filter(u => u.originalPlaylistUrl);
    playlistVideos.forEach(video => {
      updateUrlConfig(video.id, { isSelected: select });
    });
  };

  const handleSubmit = async (downloadNow: boolean) => {
    // Filter URLs: configured regular URLs + selected playlist videos
    const configuredUrls = urls.filter(u => {
      const hasUrl = u.status === 'configured' || (u.status === 'editing' && u.url);
      const isRegularUrl = !u.originalPlaylistUrl;
      const isSelectedPlaylistVideo = u.originalPlaylistUrl && u.isSelected;
      
      return hasUrl && (isRegularUrl || isSelectedPlaylistVideo);
    });
    
    if (configuredUrls.length === 0) {
      setError('נא להגדיר לפחות כתובת URL אחת או לבחור סרטונים מהרשימה');
      return;
    }
    
    // Pure data collector - immediately close modal and pass data to parent
    onClose();
    
    // Pass the configured URLs to parent component without any error handling
    // Parent will handle the background download and show progress modal
    await onSubmit(configuredUrls, downloadNow, projectNameInput);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (urlCheckTimeoutRef.current) {
        clearTimeout(urlCheckTimeoutRef.current);
      }
    };
  }, []);
  
  // Initialize playlist videos when confirmation dialog opens
  useEffect(() => {
    if (showPlaylistConfirmation && !playlistInitialized) {
      const playlistUrl = urls.find(u => u.id === showPlaylistConfirmation);
      if (playlistUrl?.playlistInfo) {
        setSelectedPlaylistVideos(new Set(playlistUrl.playlistInfo.videos.map(v => v.id)));
        setPlaylistInitialized(true);
      }
    } else if (!showPlaylistConfirmation && playlistInitialized) {
      setPlaylistInitialized(false);
      setSelectedPlaylistVideos(new Set());
    }
  }, [showPlaylistConfirmation, urls, playlistInitialized]);

  if (!isOpen) return null;

  // Check if we're in the browser
  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className="url-modal-overlay" onClick={onClose}>
      <div className="url-modal-content extended" onClick={(e) => e.stopPropagation()}>
        <div className="url-modal-header">
          <h2>
            {target === 'new' ? 'יצירת פרויקט מ-URL' : `הוספת מדיה לפרויקט: ${projectName}`}
          </h2>
          <button className="url-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="url-modal-form">
          {/* Project name input (only for new projects) */}
          {target === 'new' && (
            <div className="url-input-group" style={{ marginBottom: '20px' }}>
              <label>שם הפרויקט:</label>
              <input
                type="text"
                className="url-input"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                placeholder="הכנס שם פרויקט"
              />
            </div>
          )}
          
          <div className="url-list">
            {urls.map((urlConfig, index) => (
              <div key={urlConfig.id} className={`url-item ${urlConfig.status}`}>
                {urlConfig.status === 'configured' ? (
                  // Configured view - show URL with quality text and delete button in new row
                  <div className="url-item-configured">
                    <div className="url-content-wrapper">
                      <div className="media-name-wrapper full-width">
                        <span className="url-number">{index + 1}.</span>
                        <span className="media-name">{urlConfig.mediaName || 'Media'}</span>
                      </div>
                      
                      {/* Action buttons in new row below URL */}
                      <div className="url-action-buttons-row">
                        <span 
                          className="quality-text clickable"
                          onClick={() => {
                            updateUrlConfig(urlConfig.id, { 
                              status: 'editing',
                              showQualityPanel: true,
                              showCookiePanel: false
                            });
                          }}
                          title="לחץ לשינוי איכות"
                        >
                          {urlConfig.downloadType === 'audio' ? '🎵 אודיו בלבד' : 
                           `🎬 ${urlConfig.selectedQuality === 'high' ? 'מיטבית' : 
                           urlConfig.selectedQuality === 'medium' ? '720p' : '480p'}`}
                        </span>
                        
                        <button 
                          className="url-action-btn delete"
                          onClick={() => removeUrl(urlConfig.id)}
                          disabled={isLoading}
                          title="מחק"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Expanded view for editing URL
                  <div className="url-item-expanded">
                    {!urlConfig.url || urlConfig.url.trim() === '' ? (
                      // Show URL input when no URL entered yet
                      <div className="url-input-wrapper">
                        <span className="url-number">{index + 1}</span>
                        <input
                          type="text"
                          value={urlConfig.url}
                          onChange={(e) => handleUrlChange(urlConfig.id, e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          disabled={isLoading}
                          className="url-input"
                          dir="ltr"
                        />
                      </div>
                    ) : urlConfig.urlStatus === 'checking' ? (
                      // Show loading state while checking URL
                      <div className="url-content-wrapper">
                        <div className="media-name-wrapper full-width">
                          <span className="url-number">{index + 1}.</span>
                          <span className="media-name">בודק URL...</span>
                        </div>
                      </div>
                    ) : urlConfig.urlStatus !== 'unchecked' ? (
                      // Show media name ONLY after URL is checked (no buttons)
                      <div className="url-content-wrapper">
                        <div className="media-name-wrapper full-width">
                          <span className="url-number">{index + 1}.</span>
                          <span className="media-name">{urlConfig.mediaName || urlConfig.url}</span>
                        </div>
                      </div>
                    ) : (
                      // Show URL while it's being typed but not yet checked
                      <div className="url-content-wrapper">
                        <div className="media-name-wrapper full-width">
                          <span className="url-number">{index + 1}.</span>
                          <input
                            type="text"
                            value={urlConfig.url}
                            onChange={(e) => handleUrlChange(urlConfig.id, e.target.value)}
                            disabled={isLoading}
                            className="url-input inline-edit"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}
                    
                    {urlConfig.urlCheckMessage && urlConfig.urlStatus === 'invalid' && (
                      <div className={`url-status-message ${urlConfig.urlStatus}`}>
                        {urlConfig.urlCheckMessage}
                      </div>
                    )}

                    {/* Cookie File Panel (shown when cookie button clicked) */}
                    {urlConfig.showCookiePanel && urlConfig.requiresCookies && (
                      <div className="url-step cookie-step fade-in">
                        <label>קובץ Cookies נדרש:</label>
                        <div className="cookie-file-input-wrapper">
                          <button
                            type="button"
                            onClick={() => cookieInputRefs.current[urlConfig.id]?.click()}
                            className="cookie-file-button"
                            disabled={isLoading}
                          >
                            {urlConfig.cookieFile ? urlConfig.cookieFile.name : 'בחר קובץ Cookies'}
                          </button>
                          <input
                            ref={(el) => cookieInputRefs.current[urlConfig.id] = el}
                            type="file"
                            accept=".txt,.json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCookieFileChange(urlConfig.id, file);
                            }}
                            style={{ display: 'none' }}
                          />
                        </div>
                        <small className="cookie-hint">
                          <strong>איך להשיג קובץ Cookies?</strong><br/>
                          1. התקן תוסף "Get cookies.txt LOCALLY" בדפדפן<br/>
                          2. התחבר לאתר עם התוכן המוגן<br/>
                          3. לחץ על התוסף ובחר "Export as cookies.txt"<br/>
                          4. העלה את הקובץ כאן
                        </small>
                      </div>
                    )}

                    {/* Cookie uploaded message */}
                    {urlConfig.cookieUploaded && urlConfig.requiresCookies && (
                      <div className="cookie-uploaded-message fade-in">
                        ✓ קובץ Cookies הועלה בהצלחה
                        <button 
                          className="cookie-update-btn"
                          onClick={() => cookieInputRefs.current[urlConfig.id]?.click()}
                        >
                          עדכן קובץ
                        </button>
                        <input
                          ref={(el) => cookieInputRefs.current[urlConfig.id] = el}
                          type="file"
                          accept=".txt,.json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCookieFileChange(urlConfig.id, file);
                          }}
                          style={{ display: 'none' }}
                        />
                      </div>
                    )}

                    {/* Quality Selection Panel (shown when quality button clicked) */}
                    {urlConfig.showQualityPanel && (
                      <div className="url-step quality-step fade-in">
                        <label>בחר איכות והורדה:</label>
                        <div className="quality-options">
                          {urlConfig.qualityOptions.map((option, idx) => {
                            const isAudio = option.resolution === 'אודיו בלבד';
                            const isSelected = isAudio 
                              ? urlConfig.downloadType === 'audio'
                              : urlConfig.downloadType === 'video' && urlConfig.selectedQuality === option.quality;
                            
                            return (
                              <label 
                                key={`${urlConfig.id}-quality-${idx}`} 
                                className={`quality-option ${isSelected ? 'selected' : ''} ${urlConfig.isLoadingQuality ? 'loading' : ''} ${isAudio ? 'audio-option' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleQualitySelect(urlConfig.id, isAudio ? 'audio' : option.quality);
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`quality-${urlConfig.id}`}
                                  value={option.quality}
                                  checked={isSelected}
                                  onChange={() => {}}
                                  disabled={isLoading}
                                  style={{ display: 'none' }}
                                />
                                <div className="quality-info">
                                  <span className="quality-label">
                                    {isAudio ? '🎵' : '🎬'} {option.resolution}
                                  </span>
                                  <span className="quality-size">{option.estimatedSize}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>


          
          {/* Action Buttons */}
          <div className="url-modal-actions">
            <button
              className="url-submit-button primary"
              onClick={() => handleSubmit(true)}
              disabled={urls.filter(u => u.status === 'configured').length === 0}
            >
              הורד וצור פרויקט
            </button>
            <button
              className="url-cancel-button"
              onClick={onClose}
            >
              ביטול
            </button>
          </div>
        </div>
        
        {/* Playlist Confirmation Dialog */}
        {showPlaylistConfirmation && (() => {
          const playlistUrl = urls.find(u => u.id === showPlaylistConfirmation);
          const playlistInfo = playlistUrl?.playlistInfo;
          if (!playlistInfo) return null;
          
          const handleSelectAll = (checked: boolean) => {
            if (checked) {
              setSelectedPlaylistVideos(new Set(playlistInfo.videos.map(v => v.id)));
            } else {
              setSelectedPlaylistVideos(new Set());
            }
          };
          
          const handleVideoToggle = (videoId: string, checked: boolean) => {
            const newSelected = new Set(selectedPlaylistVideos);
            if (checked) {
              newSelected.add(videoId);
            } else {
              newSelected.delete(videoId);
            }
            setSelectedPlaylistVideos(newSelected);
          };
          
          return (
            <div className="playlist-confirm-overlay">
              <div className="playlist-confirm-dialog playlist-with-videos">
                <div className="playlist-header">
                  <h3>יצירת פרויקט מ-URL</h3>
                  <div className="playlist-title">שם הפרויקט: {playlistInfo.title}</div>
                </div>
                
                <div className="playlist-select-all">
                  <div className="global-quality-selector">
                    <select 
                      value={globalPlaylistQuality}
                      onChange={(e) => {
                        const quality = e.target.value as 'high' | 'medium' | 'low' | 'audio';
                        setGlobalPlaylistQuality(quality);
                        // Apply to all videos
                        const newQualities: {[key: string]: 'high' | 'medium' | 'low' | 'audio'} = {};
                        playlistInfo.videos.forEach(video => {
                          newQualities[video.id] = quality;
                        });
                        setPlaylistVideoQualities(newQualities);
                      }}
                      className="quality-select"
                    >
                      <option value="high">איכות גבוהה</option>
                      <option value="medium">איכות בינונית</option>
                      <option value="low">איכות נמוכה</option>
                      <option value="audio">אודיו בלבד</option>
                    </select>
                  </div>
                  
                  {(() => {
                    console.log('Cookie indicator check:', {
                      requiresCookies: playlistUrl.requiresCookies,
                      selectedVideosCount: selectedPlaylistVideos.size,
                      shouldShow: playlistUrl.requiresCookies && selectedPlaylistVideos.size > 0,
                      cookieUploaded: playlistUrl.cookieUploaded
                    });
                    return playlistUrl.requiresCookies && selectedPlaylistVideos.size > 0 && (
                      <div className="playlist-cookie-indicator-inline">
                        {playlistUrl.cookieUploaded ? (
                          <span className="cookie-indicator-inline uploaded" title="קובץ Cookie הועלה">
                            🍪
                          </span>
                        ) : (
                          <span className="cookie-indicator-inline required" title="דרוש קובץ Cookie">
                            ⚠️
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  
                  <label className="select-all-label">
                    <input 
                      type="checkbox"
                      checked={selectedPlaylistVideos.size === playlistInfo.videos.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="select-all-checkbox"
                    />
                    <span>בחר הכל</span>
                  </label>
                </div>
                
                <div className="playlist-video-list">
                  {playlistInfo.videos.map((video, index) => (
                    <div key={video.id} className="playlist-video-item">
                      <span className="video-number">{index + 1}.</span>
                      <label htmlFor={`video-${video.id}`} className="video-label">
                        <span className="video-title">{video.title || 'Unknown Video'}</span>
                      </label>
                      
                      {selectedPlaylistVideos.has(video.id) && (
                        <div className="video-quality-selector">
                          <button
                            className="quality-icon"
                            onClick={() => setShowQualityDropdown(showQualityDropdown === video.id ? null : video.id)}
                            title="בחר איכות"
                          >
                            {playlistVideoQualities[video.id] === 'audio' ? '🎵' : 
                             playlistVideoQualities[video.id] === 'low' ? '📹' :
                             playlistVideoQualities[video.id] === 'medium' ? '📺' : '🎬'}
                          </button>
                          {showQualityDropdown === video.id && (
                            <div className="quality-dropdown">
                              <button onClick={() => {
                                setPlaylistVideoQualities({...playlistVideoQualities, [video.id]: 'high'});
                                setShowQualityDropdown(null);
                              }}>🎬 גבוהה</button>
                              <button onClick={() => {
                                setPlaylistVideoQualities({...playlistVideoQualities, [video.id]: 'medium'});
                                setShowQualityDropdown(null);
                              }}>📺 בינונית</button>
                              <button onClick={() => {
                                setPlaylistVideoQualities({...playlistVideoQualities, [video.id]: 'low'});
                                setShowQualityDropdown(null);
                              }}>📹 נמוכה</button>
                              <button onClick={() => {
                                setPlaylistVideoQualities({...playlistVideoQualities, [video.id]: 'audio'});
                                setShowQualityDropdown(null);
                              }}>🎵 אודיו</button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <input 
                        type="checkbox"
                        id={`video-${video.id}`}
                        checked={selectedPlaylistVideos.has(video.id)}
                        onChange={(e) => handleVideoToggle(video.id, e.target.checked)}
                        className="video-checkbox"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="playlist-confirm-buttons">
                  <button 
                    className="confirm-button primary"
                    onClick={() => {
                      // Filter videos to only include selected ones
                      const filteredPlaylistInfo = {
                        ...playlistInfo,
                        videos: playlistInfo.videos.filter(v => selectedPlaylistVideos.has(v.id))
                      };
                      
                      // Temporarily update the URL with filtered videos
                      const tempUrl = urls.find(u => u.id === showPlaylistConfirmation);
                      if (tempUrl) {
                        tempUrl.playlistInfo = filteredPlaylistInfo;
                      }
                      
                      handlePlaylistConfirm(showPlaylistConfirmation);
                    }}
                  >
                    הורד נבחרים
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => handlePlaylistCancel(showPlaylistConfirmation)}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>,
    document.body
  );
};

export default UrlUploadModal;