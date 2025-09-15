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
  playlistIndex?: number;
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
  autoConfigureAfterCheck?: boolean;

  // Playlist specific fields
  isPlaylist?: boolean;
  playlistInfo?: PlaylistInfo;
  originalPlaylistUrl?: string; // Store original playlist URL
  playlistVideoId?: string; // For individual videos from playlist
  isSelected?: boolean; // Whether this video is selected for download
  downloadStatus?: 'not-downloaded' | 'downloaded' | 'unavailable';
  playlistIndex?: number; // Original index in playlist (1-based)
  playlistUrl?: string; // Original playlist URL
  totalVideosInPlaylist?: number; // Total videos in the playlist
}

interface UrlUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: UrlConfig[], downloadNow: boolean, projectName: string, target: 'new' | string, playlistCookieFile?: File) => Promise<void>;
  target: 'new' | string; // 'new' for new project, or projectId for existing
  projectName?: string; // Name of existing project if adding to existing
  continuePlaylist?: { // Data for continuing a playlist download
    projectId: string;
    projectName: string;
    playlistUrl: string;
    playlistTitle: string;
    downloadedIndices: number[];
    mediaPlaylistIndices?: { [mediaId: string]: number }; // Map of mediaId to playlist index
    playlistData?: { // Data from playlist.json
      playlistUrl: string;
      playlistTitle: string;
      totalVideos: number;
      downloadedVideos: {
        [index: string]: {
          mediaId: string;
          title: string;
          index: number;
          originalUrl: string;
        };
      };
    };
    totalVideos: number;
    existingMediaIds: string[];
  };
}

const UrlUploadModal: React.FC<UrlUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  target,
  projectName,
  continuePlaylist
}) => {
  console.log('[UrlUploadModal] Component mounted/updated with target:', target, 'projectName:', projectName);

  // Log whenever target changes
  useEffect(() => {
    console.log('[UrlUploadModal] Target prop changed to:', target, 'projectName:', projectName);
  }, [target]);

  const [urls, setUrls] = useState<UrlConfig[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingButton, setLoadingButton] = useState<'download' | 'create' | null>(null);
  const [error, setError] = useState('');
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [showPlaylistConfirmation, setShowPlaylistConfirmation] = useState<string | null>(null);
  const [showPlaylistChoice, setShowPlaylistChoice] = useState<string | null>(null); // Show choice dialog for playlist
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState<Set<string>>(new Set());
  const [playlistInitialized, setPlaylistInitialized] = useState(false);
  const [playlistVideoQualities, setPlaylistVideoQualities] = useState<{[key: string]: 'high' | 'medium' | 'low' | 'audio'}>({});
  const [globalPlaylistQuality, setGlobalPlaylistQuality] = useState<'high' | 'medium' | 'low' | 'audio'>('high');
  const [showQualityDropdown, setShowQualityDropdown] = useState<string | null>(null);
  const [playlistCookieFile, setPlaylistCookieFile] = useState<File | null>(null);
  const [showPlaylistCookieUpload, setShowPlaylistCookieUpload] = useState(false);
  
  const cookieInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const playlistCookieInputRef = useRef<HTMLInputElement | null>(null);
  const urlCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to extract video-only URL from playlist URL
  const extractVideoOnlyUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);

      // For YouTube, remove the list parameter
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        urlObj.searchParams.delete('list');
        urlObj.searchParams.delete('index');
        return urlObj.toString();
      }

      // For other platforms, return as-is (they might not have playlist parameters)
      return url;
    } catch {
      return url;
    }
  };

  // Helper function to detect platform from URL
  const getPlatformFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').toLowerCase();

      // Check for known platforms
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'YouTube';
      } else if (hostname.includes('instagram.com')) {
        return 'Instagram';
      } else if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
        return 'Facebook';
      } else if (hostname.includes('tiktok.com')) {
        return 'TikTok';
      } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return 'X';
      } else if (hostname.includes('vimeo.com')) {
        return 'Vimeo';
      } else if (hostname.includes('dailymotion.com')) {
        return 'Dailymotion';
      } else if (hostname.includes('twitch.tv')) {
        return 'Twitch';
      } else if (hostname.includes('reddit.com')) {
        return 'Reddit';
      } else if (hostname.includes('soundcloud.com')) {
        return 'SoundCloud';
      } else if (hostname.includes('spotify.com')) {
        return 'Spotify';
      }

      // If unknown, try to use the main domain name
      const domainParts = hostname.split('.');
      if (domainParts.length >= 2) {
        // Capitalize first letter of domain
        const domain = domainParts[domainParts.length - 2];
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      return 'Media';
    } catch {
      return 'Media';
    }
  };

  // Initialize with one empty URL config when modal opens
  useEffect(() => {
    if (isOpen && urls.length === 0) {
      // Check if we're in continue mode
      if (continuePlaylist) {
        // Set the project name from the existing project
        setProjectNameInput(continuePlaylist.projectName);

        // Create a URL config for the playlist URL with playlist info already loaded
        const playlistUrlId = `url-${Date.now()}`;
        const playlistUrlConfig: UrlConfig = {
          id: playlistUrlId,
          url: continuePlaylist.playlistUrl,
          selectedQuality: 'high',
          downloadType: 'video',
          qualityOptions: [],
          status: 'editing',
          urlStatus: 'playlist',
          urlCheckMessage: `📝 רשימת השמעה: ${continuePlaylist.playlistData?.totalVideos || 0} סרטונים`,
          isLoadingQuality: false,
          requiresCookies: false,
          cookieUploaded: false,
          showQualityPanel: false,
          showCookiePanel: false,
          isPlaylist: true,
          playlistInfo: continuePlaylist.playlistData ? {
            title: continuePlaylist.playlistData.playlistTitle || '',
            id: '',
            videoCount: continuePlaylist.playlistData.totalVideos || 0,
            videos: [] // We'll fetch this from the backend
          } : undefined,
          originalPlaylistUrl: continuePlaylist.playlistUrl
        };
        setUrls([playlistUrlConfig]);
        setActiveUrlId(playlistUrlId);

        // Directly show the playlist confirmation dialog for continue mode
        // We'll fetch the full playlist info when the confirmation is shown
        setShowPlaylistConfirmation(playlistUrlId);
      } else {
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
        setProjectNameInput(`Media - ${dateStr} ${timeStr}`);
        
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
    }
  }, [isOpen, continuePlaylist]);

  // Update project name based on detected platform when URLs change
  useEffect(() => {
    if (target === 'new' && urls.length > 0) {
      // Find the first URL with content
      const firstUrl = urls.find(u => u.url && u.url.trim());
      if (firstUrl && firstUrl.url) {
        const platform = getPlatformFromUrl(firstUrl.url);

        // Only update if the project name still has the default pattern
        if (projectNameInput.match(/^(Media|YouTube|Instagram|Facebook|TikTok|X|Vimeo|Dailymotion|Twitch|Reddit|SoundCloud|Spotify) - \d{2}\.\d{2}\.\d{2} \d{2}:\d{2}$/)) {
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
          setProjectNameInput(`${platform} - ${dateStr} ${timeStr}`);
        }
      }
    }
  }, [urls, target, projectNameInput]);

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
        setShowPlaylistChoice(null);
        setShowPlaylistConfirmation(null);

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

      // YouTube - extract video ID as temporary name
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        const videoIdMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
        if (videoIdMatch) {
          return `סרטון YouTube (${videoIdMatch[1]})`;
        }
        return 'סרטון YouTube';
      }

      // Instagram
      if (hostname.includes('instagram.com')) {
        return 'סרטון Instagram';
      }

      // Facebook
      if (hostname.includes('facebook.com')) {
        return 'סרטון Facebook';
      }

      // Default: show domain name
      return `סרטון מ-${hostname}`;
    } catch {
      return 'סרטון';
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
            // Check if this was from "download only video" from playlist
            const shouldAutoConfigure = urlConfig.autoConfigureAfterCheck;
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'public',
              requiresCookies: false,
              urlCheckMessage: '',
              mediaName: result.title || extractMediaName(urlConfig.url), // Use the title from backend
              showQualityPanel: !shouldAutoConfigure,  // Don't show panel if auto-configuring
              status: shouldAutoConfigure ? 'configured' : 'editing', // Auto-configure if from playlist
              selectedQuality: 'high', // Default to high quality
              downloadType: 'video', // Default to video
              autoConfigureAfterCheck: false // Reset flag
            });
            // Fetch quality options for public content
            fetchQualityOptions(urlConfig);
          } else if (result.status === 'protected') {
            // Check if this was from "download only video" from playlist
            const shouldAutoConfigure = urlConfig.autoConfigureAfterCheck;
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'protected',
              requiresCookies: true,
              urlCheckMessage: '🔒 תוכן מוגן - Cookies יטופל בהורדה',
              mediaName: result.title || extractMediaName(urlConfig.url), // Use the title from backend or extract from URL
              showQualityPanel: !shouldAutoConfigure,  // Don't show panel if auto-configuring
              status: shouldAutoConfigure ? 'configured' : 'editing', // Auto-configure if from playlist
              selectedQuality: 'high', // Default to high quality
              downloadType: 'video', // Default to video
              autoConfigureAfterCheck: false // Reset flag
            });
            // Fetch quality options for protected content too
            fetchQualityOptions(urlConfig);
          } else if (result.status === 'playlist') {
            // Handle playlist detection - show choice dialog first
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'playlist',
              requiresCookies: false,
              urlCheckMessage: `📝 רשימת השמעה: ${result.videoCount} סרטונים`,
              mediaName: result.title || urlConfig.mediaName,
              isPlaylist: true,
              playlistInfo: result.playlist,
              originalPlaylistUrl: urlConfig.url
            });
            // Show choice dialog instead of directly showing playlist confirmation
            setShowPlaylistChoice(urlConfig.id);
          } else if (result.status === 'protected-playlist') {
            updateUrlConfig(urlConfig.id, {
              urlStatus: 'protected-playlist',
              requiresCookies: true,
              urlCheckMessage: '🔒📝 רשימת השמעה פרטית',
              mediaName: result.title || 'רשימת השמעה פרטית',
              isPlaylist: true,
              playlistInfo: result.playlist,
              originalPlaylistUrl: urlConfig.url
            });
            // Show choice dialog for protected playlists too
            if (result.playlist) {
              setShowPlaylistChoice(urlConfig.id);
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

          // If we're in continue mode and check fails, still show playlist
          if (continuePlaylist && urlConfig.isPlaylist) {
            // Keep the playlist status and show confirmation
            setShowPlaylistConfirmation(urlConfig.id);
            return;
          }

          // If check fails, assume public and show quality options
          updateUrlConfig(urlConfig.id, {
            urlStatus: 'public',
            requiresCookies: false,
            urlCheckMessage: ''
          });
          fetchQualityOptions(urlConfig);
        }
      } catch (error) {
        console.log('URL check failed:', error);

        // If we're in continue mode and check fails, still show playlist
        if (continuePlaylist && urlConfig.isPlaylist) {
          // Keep the playlist status and show confirmation
          setShowPlaylistConfirmation(urlConfig.id);
          return;
        }

        // If check fails, assume public and show quality options
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
  const handlePlaylistConfirm = async (playlistUrlId: string) => {
    const playlistUrlConfig = urls.find(u => u.id === playlistUrlId);
    if (!playlistUrlConfig || !playlistUrlConfig.playlistInfo) return;

    // Create individual URL configs for each selected video in the playlist
    const videoConfigs: UrlConfig[] = playlistUrlConfig.playlistInfo.videos
      .filter(video => selectedPlaylistVideos.has(video.id))
      .map((video, filteredIndex) => {
        const quality = playlistVideoQualities[video.id] || globalPlaylistQuality || 'high';
        const isAudio = quality === 'audio';
        // Use playlistIndex from video info if available, otherwise use array position + 1
        const actualPlaylistIndex = video.playlistIndex ||
          (playlistUrlConfig.playlistInfo.videos.findIndex(v => v.id === video.id) + 1);

        return {
          id: `${playlistUrlId}-video-${actualPlaylistIndex}`,
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
          // Add playlist-specific metadata
          playlistIndex: actualPlaylistIndex, // Use actual playlist index from yt-dlp
          playlistUrl: playlistUrlConfig.url, // Store the original playlist URL
          totalVideosInPlaylist: playlistUrlConfig.playlistInfo.videos.length,
          
          // Playlist-specific fields
          isPlaylist: false,
          originalPlaylistUrl: playlistUrlConfig.originalPlaylistUrl,
          playlistVideoId: video.id,
          isSelected: true,
          downloadStatus: 'not-downloaded'
        };
      });
    
    // Use playlist title as project name with detected platform
    const platform = getPlatformFromUrl(playlistUrlConfig.url);
    const playlistProjectName = `${platform} - ${playlistUrlConfig.playlistInfo.title}`;
    
    // Close the modal immediately
    onClose();
    
    // Start download directly with playlist videos
    await onSubmit(videoConfigs, true, playlistProjectName);
    
    // Reset state
    setShowPlaylistConfirmation(null);
    setActiveUrlId(null);
    setPlaylistInitialized(false);
    setSelectedPlaylistVideos(new Set());
    setPlaylistVideoQualities({});
    setUrls([]);
  };

  const handlePlaylistCancel = (playlistUrlId: string) => {
    // Just remove the playlist URL and close dialog
    setUrls(prev => prev.filter(u => u.id !== playlistUrlId));
    setShowPlaylistConfirmation(null);
  };

  // Handle playlist choice - download entire playlist
  const handleDownloadEntirePlaylist = (urlId: string) => {
    setShowPlaylistChoice(null);
    // Show the playlist confirmation dialog
    setShowPlaylistConfirmation(urlId);
  };

  // Handle playlist choice - download only video
  const handleDownloadOnlyVideo = (urlId: string) => {
    const urlConfig = urls.find(u => u.id === urlId);
    if (!urlConfig) return;

    // Extract video-only URL
    const videoOnlyUrl = extractVideoOnlyUrl(urlConfig.url);

    // Update the URL config to be a regular video, not a playlist
    updateUrlConfig(urlId, {
      url: videoOnlyUrl,
      isPlaylist: false,
      playlistInfo: undefined,
      originalPlaylistUrl: undefined, // Clear this to make it a regular URL
      urlStatus: 'unchecked',
      urlCheckMessage: '',
      mediaName: '', // Clear the playlist name to force re-fetch
      status: 'editing', // Start in editing mode
      showQualityPanel: false, // Reset quality panel
      autoConfigureAfterCheck: true // Flag to auto-configure after URL check
    });

    // Close the choice dialog
    setShowPlaylistChoice(null);

    // Trigger a new URL check to get the individual video title
    // Use a ref to get the latest state
    setTimeout(() => {
      // Get the latest URL config from state
      setUrls(currentUrls => {
        const updatedConfig = currentUrls.find(u => u.id === urlId);
        if (updatedConfig) {
          // Trigger the check with the updated URL
          checkUrlStatus({ ...updatedConfig, url: videoOnlyUrl, autoConfigureAfterCheck: true });
        }
        return currentUrls; // Return unchanged
      });
    }, 100);
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
    // Filter URLs: only include configured URLs
    const configuredUrls = urls.filter(u => {
      // Must have status 'configured' to be included
      return u.status === 'configured' && u.url;
    });
    
    if (configuredUrls.length === 0) {
      setError('נא להגדיר לפחות כתובת URL אחת או לבחור סרטונים מהרשימה');
      return;
    }
    
    // Pass playlistCookieFile if this is a playlist download
    const isPlaylistDownload = urls.some(u => u.isPlaylist);
    
    // Pass the configured URLs and target to parent component
    // Parent will handle closing the modal
    await onSubmit(configuredUrls, downloadNow, projectNameInput, target, isPlaylistDownload ? playlistCookieFile || undefined : undefined);
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

      // If we're in continue mode and don't have videos yet, mark as initialized to prevent loops
      if (continuePlaylist && playlistUrl && (!playlistUrl.playlistInfo?.videos || playlistUrl.playlistInfo.videos.length === 0)) {
        // Mark as initialized immediately to prevent infinite loop
        setPlaylistInitialized(true);
        // Fetch the playlist info to get the videos
        checkUrlStatus(playlistUrl);
        return; // Wait for the playlist info to be fetched
      }

      if (playlistUrl?.playlistInfo?.videos) {
        // If we're in continue mode, only select videos that haven't been downloaded
        if (continuePlaylist && continuePlaylist.playlistData?.downloadedVideos) {
          // Use playlist.json data for most accurate tracking
          const downloadedIndices = new Set(Object.keys(continuePlaylist.playlistData.downloadedVideos).map(Number));
          const undownloadedVideos = playlistUrl.playlistInfo.videos
            .filter((_, index) => !downloadedIndices.has(index + 1)) // Use 1-based index
            .map(v => v.id);
          setSelectedPlaylistVideos(new Set(undownloadedVideos));
        } else if (continuePlaylist && continuePlaylist.mediaPlaylistIndices) {
          // Fallback to mediaPlaylistIndices method
          const existingIndices = new Set(Object.values(continuePlaylist.mediaPlaylistIndices));
          const undownloadedVideos = playlistUrl.playlistInfo.videos
            .filter((_, index) => !existingIndices.has(index + 1)) // Use 1-based index
            .map(v => v.id);
          setSelectedPlaylistVideos(new Set(undownloadedVideos));
        } else if (continuePlaylist && continuePlaylist.downloadedIndices) {
          // Fallback to old method if nothing else is available
          const downloadedSet = new Set(continuePlaylist.downloadedIndices);
          const undownloadedVideos = playlistUrl.playlistInfo.videos
            .filter((_, index) => !downloadedSet.has(index + 1)) // Use 1-based index
            .map(v => v.id);
          setSelectedPlaylistVideos(new Set(undownloadedVideos));
        } else {
          // Select all videos by default for new playlists
          setSelectedPlaylistVideos(new Set(playlistUrl.playlistInfo.videos.map(v => v.id)));
        }
        setPlaylistInitialized(true);
      }
    } else if (!showPlaylistConfirmation && playlistInitialized) {
      setPlaylistInitialized(false);
      setSelectedPlaylistVideos(new Set());
    }
  }, [showPlaylistConfirmation, urls, playlistInitialized, continuePlaylist]);

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
                        <span className="media-name">{urlConfig.mediaName || `קובץ ${index + 1}`}</span>
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
                          <span className="media-name">{urlConfig.mediaName || extractMediaName(urlConfig.url)}</span>
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
              {target === 'new' ? 'הורד וצור פרויקט' : 'הוסף לפרויקט'}
            </button>
            <button
              className="url-cancel-button"
              onClick={onClose}
            >
              ביטול
            </button>
          </div>
        </div>

        {/* Playlist Choice Dialog - Ask if user wants playlist or just video */}
        {showPlaylistChoice && (() => {
          const urlConfig = urls.find(u => u.id === showPlaylistChoice);
          if (!urlConfig) return null;

          return (
            <div className="playlist-confirm-overlay">
              <div className="playlist-confirm-dialog" style={{ maxWidth: '500px' }}>
                <div className="playlist-header">
                  <h3>זוהתה רשימת השמעה</h3>
                </div>

                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                    הכתובת שהזנת מכילה רשימת השמעה עם {urlConfig.playlistInfo?.videoCount || 'מספר'} סרטונים.
                  </p>
                  <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                    האם ברצונך להוריד את כל הרשימה או רק את הסרטון הנוכחי?
                  </p>
                </div>

                <div className="modal-buttons" style={{ justifyContent: 'center', gap: '15px' }}>
                  <button
                    className="submit-button"
                    onClick={() => handleDownloadEntirePlaylist(showPlaylistChoice)}
                    style={{ minWidth: '150px' }}
                  >
                    הורד את כל הרשימה
                  </button>
                  <button
                    className="submit-button"
                    onClick={() => handleDownloadOnlyVideo(showPlaylistChoice)}
                    style={{ minWidth: '150px' }}
                  >
                    הורד רק את הסרטון
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => {
                      setUrls(prev => prev.filter(u => u.id !== showPlaylistChoice));
                      setShowPlaylistChoice(null);
                    }}
                    style={{ minWidth: '80px' }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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
                
                <div className="playlist-select-all" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
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
                
                {/* Cookie Upload Section for Protected Playlists */}
                {(showPlaylistCookieUpload || playlistCookieFile) && (
                  <div className="playlist-cookie-upload-section">
                    <div className="cookie-upload-header">
                      <span className="cookie-icon">🍪</span>
                      <span className="cookie-title">
                        {playlistCookieFile ? 'קובץ Cookies הועלה' : 'העלה קובץ Cookies עבור תוכן מוגן'}
                      </span>
                    </div>
                    {!playlistCookieFile ? (
                      <>
                        <p className="cookie-help-text">
                          חלק מהסרטונים ברשימה זו עשויים להיות מוגנים. העלה קובץ cookies.txt כדי לגשת אליהם.
                        </p>
                        <div className="cookie-upload-buttons">
                          <input
                            ref={playlistCookieInputRef}
                            type="file"
                            accept=".txt"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPlaylistCookieFile(file);
                                setShowPlaylistCookieUpload(false);
                              }
                            }}
                          />
                          <button
                            className="cookie-upload-button"
                            onClick={() => playlistCookieInputRef.current?.click()}
                          >
                            📁 בחר קובץ Cookies
                          </button>
                          <a
                            href="https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cookie-help-link"
                          >
                            איך להשיג קובץ Cookies?
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="cookie-uploaded-info">
                        <span className="success-icon">✓</span>
                        <span className="file-name">{playlistCookieFile.name}</span>
                        <button
                          className="remove-cookie-button"
                          onClick={() => setPlaylistCookieFile(null)}
                        >
                          הסר
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="playlist-video-list">
                  {playlistInfo.videos.map((video, index) => {
                    // Use playlistIndex from video info if available, otherwise use array position + 1
                    const videoIndex = video.playlistIndex || (index + 1);
                    // Check if this video is already downloaded using playlist.json data first
                    let isDownloaded = false;
                    
                    // Debug logging
                    if (index < 3) { // Log first 3 videos for debugging
                      console.log(`[UrlUploadModal] Video ${videoIndex}:`, {
                        hasPlaylistData: !!continuePlaylist?.playlistData,
                        downloadedVideos: continuePlaylist?.playlistData?.downloadedVideos,
                        isIndexInDownloaded: continuePlaylist?.playlistData?.downloadedVideos ? 
                          videoIndex.toString() in continuePlaylist.playlistData.downloadedVideos : false,
                        mediaPlaylistIndices: continuePlaylist?.mediaPlaylistIndices,
                        downloadedIndices: continuePlaylist?.downloadedIndices,
                        videoTitle: video.title
                      });
                    }
                    
                    if (continuePlaylist?.playlistData?.downloadedVideos) {
                      // Use playlist.json data for most accurate tracking
                      isDownloaded = videoIndex.toString() in continuePlaylist.playlistData.downloadedVideos;
                      if (index < 3) {
                        console.log(`[UrlUploadModal] Video ${videoIndex} isDownloaded:`, isDownloaded);
                      }
                    } else {
                      // Fallback to old methods
                      const existingIndices = continuePlaylist?.mediaPlaylistIndices ? 
                        new Set(Object.values(continuePlaylist.mediaPlaylistIndices)) : 
                        new Set(continuePlaylist?.downloadedIndices || []);
                      isDownloaded = existingIndices.has(videoIndex);
                      if (index < 3) {
                        console.log(`[UrlUploadModal] Video ${videoIndex} fallback isDownloaded:`, isDownloaded, 'indices:', Array.from(existingIndices));
                      }
                    }
                    
                    return (
                      <div key={video.id} className={`playlist-video-item ${isDownloaded ? 'downloaded' : ''}`}>
                        <span className="video-number">{videoIndex}.</span>
                        <label htmlFor={`video-${video.id}`} className="video-label">
                          <span className="video-title">
                            {video.title || 'Unknown Video'}
                            {isDownloaded && <span className="downloaded-badge"> ✓ הורד</span>}
                          </span>
                        </label>
                      
                      {selectedPlaylistVideos.has(video.id) && !isDownloaded && (
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
                          checked={isDownloaded ? false : selectedPlaylistVideos.has(video.id)}
                          onChange={(e) => !isDownloaded && handleVideoToggle(video.id, e.target.checked)}
                          disabled={isDownloaded}
                          className="video-checkbox"
                          title={isDownloaded ? 'הסרטון כבר הורד - מחק מהפרויקט כדי להוריד שוב' : ''}
                        />
                      </div>
                    );
                  })}
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