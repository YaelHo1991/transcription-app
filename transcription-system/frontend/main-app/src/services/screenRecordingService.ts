/**
 * Minimal Screen Recording Service
 * Handles screen recording with minimal UI interference
 */

interface RecordingConfig {
  quality?: 'low' | 'medium' | 'high';
  frameRate?: number;
  bitrate?: number;
  allowedPages?: string[];
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedDuration: number;
  currentPage: string;
}

class ScreenRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: RecordingState = {
    isRecording: false,
    isPaused: false,
    startTime: null,
    pausedDuration: 0,
    currentPage: ''
  };
  private recordedBlob: Blob | null = null;
  private captureType: string = ''; // 'browser', 'monitor', or 'window'
  private indicator: HTMLDivElement | null = null;
  private config: RecordingConfig;
  private pauseStartTime: number | null = null;
  private allowedPages: string[] = [];
  private recordingEnabled: boolean = false;

  constructor(config?: RecordingConfig) {
    this.config = {
      quality: config?.quality || 'medium',
      frameRate: config?.frameRate || 10, // Low fps for minimal impact
      bitrate: config?.bitrate || 1000000, // 1 Mbps
      allowedPages: config?.allowedPages || []
    };
    
    // Set quality presets with improved bitrates
    const presets = {
      low: { frameRate: 10, bitrate: 1000000 },    // ~450 MB/hour
      medium: { frameRate: 15, bitrate: 3000000 }, // ~1.35 GB/hour
      high: { frameRate: 30, bitrate: 8000000 },   // ~3.6 GB/hour
      ultra: { frameRate: 60, bitrate: 15000000 }  // ~6.75 GB/hour
    };
    
    if (this.config.quality && presets[this.config.quality]) {
      this.config.frameRate = presets[this.config.quality].frameRate;
      this.config.bitrate = presets[this.config.quality].bitrate;
    }
    
    // Only setup browser-specific features on the client side
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.setupKeyboardShortcuts();
      this.setupNavigationListener();
    }
  }

  /**
   * Initialize recording permissions from user data
   */
  public initializePermissions(enabled: boolean, pages: string[]) {
    this.recordingEnabled = enabled;
    this.allowedPages = pages;
    console.log('[Recording] Permissions initialized:', { enabled, pages });
  }

  /**
   * Check if recording is allowed on current page
   */
  private isCurrentPageAllowed(): boolean {
    const pathname = window.location.pathname;
    const currentPage = pathname.split('/').filter(p => p).pop() || '';
    return this.allowedPages.includes(currentPage);
  }

  /**
   * Setup keyboard shortcuts for recording control
   */
  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt+Shift+R: Toggle recording
      if (e.altKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (!this.recordingEnabled) {
          console.log('[Recording] Recording not enabled for this user');
          return;
        }
        if (this.state.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      }
      
      // Alt+Shift+P: Pause/Resume (if recording)
      if (e.altKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (this.state.isRecording) {
          if (this.state.isPaused) {
            this.resumeRecording();
          } else {
            this.pauseRecording();
          }
        }
      }
    });
  }

  /**
   * Setup navigation listener for auto-pause/resume
   */
  private setupNavigationListener() {
    // Listen for navigation events
    const checkNavigation = () => {
      if (!this.state.isRecording) return;
      
      const isAllowed = this.isCurrentPageAllowed();
      
      if (!isAllowed && !this.state.isPaused) {
        console.log('[Recording] Navigated to non-allowed page, pausing');
        this.pauseRecording();
      } else if (isAllowed && this.state.isPaused) {
        console.log('[Recording] Navigated to allowed page, resuming');
        this.resumeRecording();
      }
    };
    
    // Listen for various navigation events
    window.addEventListener('popstate', checkNavigation);
    
    // Monitor for route changes in Next.js
    const observer = new MutationObserver(() => {
      const pathname = window.location.pathname;
      const currentPage = pathname.split('/').filter(p => p).pop() || '';
      if (currentPage !== this.state.currentPage) {
        this.state.currentPage = currentPage;
        checkNavigation();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Start screen recording
   */
  public async startRecording(): Promise<void> {
    try {
      // Check if allowed on current page
      if (!this.isCurrentPageAllowed()) {
        console.warn('[Recording] Cannot start recording on non-allowed page');
        this.showToast('הקלטה אינה מאושרת בדף זה', 2000);
        return;
      }
      
      // Request screen capture with improved quality settings
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser" as DisplayCaptureSurfaceType,
          frameRate: { ideal: this.config.frameRate, max: 60 },
          width: { ideal: 3840 }, // 4K width, no max constraint
          height: { ideal: 2160 }, // 4K height, no max constraint
          cursor: "always" as CursorCaptureConstraint
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include" as SelfCapturePreferenceEnum,
        surfaceSwitching: "exclude" as SurfaceSwitchingPreferenceEnum,
        systemAudio: "exclude" as SystemAudioPreferenceEnum
      } as DisplayMediaStreamOptions);

      // Detect what type of capture the user selected
      const videoTrack = this.stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      this.captureType = (settings as any).displaySurface || 'unknown';
      console.log('[Recording] Capture type:', this.captureType);

      // Setup MediaRecorder with better codec options
      let mimeType = 'video/webm;codecs=vp9';
      
      // Try H264 for better quality if available
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      }
      
      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: this.config.bitrate
      };
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      // Handle data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      
      // Handle stop
      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };
      
      // Handle stream end (user stopped sharing)
      this.stream.getVideoTracks()[0].onended = () => {
        this.stopRecording();
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      
      // Update state
      this.state.isRecording = true;
      this.state.startTime = Date.now();
      this.state.pausedDuration = 0;
      const pathname = window.location.pathname;
      this.state.currentPage = pathname.split('/').filter(p => p).pop() || '';
      
      // Show minimal indicator only if NOT recording current tab
      if (this.captureType !== 'browser') {
        this.showIndicator();
      } else {
        console.log('[Recording] Tab recording - indicator hidden to avoid capture');
      }
      
      // Show brief toast
      this.showToast('ההקלטה החלה', 1500);
      
      console.log('[Recording] Started successfully');
    } catch (error) {
      console.error('[Recording] Failed to start:', error);
      this.showToast('שגיאה בהתחלת ההקלטה', 2000);
    }
  }

  /**
   * Stop recording and download file
   */
  public stopRecording(): void {
    if (!this.state.isRecording) return;
    
    console.log('[Recording] Stopping...');
    
    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Update state
    this.state.isRecording = false;
    this.state.isPaused = false;
    
    // Hide indicator
    this.hideIndicator();
    
    // Show toast
    this.showToast('ההקלטה הסתיימה', 1500);
  }

  /**
   * Pause recording
   */
  public pauseRecording(): void {
    if (!this.state.isRecording || this.state.isPaused) return;
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.state.isPaused = true;
      this.pauseStartTime = Date.now();
      
      // Hide indicator when paused
      this.hideIndicator();
      
      console.log('[Recording] Paused');
    }
  }

  /**
   * Resume recording
   */
  public resumeRecording(): void {
    if (!this.state.isRecording || !this.state.isPaused) return;
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.state.isPaused = false;
      
      // Track paused duration
      if (this.pauseStartTime) {
        this.state.pausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      
      // Show indicator again only if not recording tab
      if (this.captureType !== 'browser') {
        this.showIndicator();
      }
      
      console.log('[Recording] Resumed');
    }
  }

  /**
   * Show minimal recording indicator (in a way that won't be captured)
   */
  private showIndicator(): void {
    if (this.indicator) return;
    
    // Create overlay container that won't be captured
    const overlay = document.createElement('div');
    overlay.id = 'recording-overlay';
    overlay.setAttribute('data-recording-ui', 'true');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
    `;
    
    this.indicator = document.createElement('div');
    this.indicator.setAttribute('data-recording-ui', 'true');
    this.indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 6px;
      height: 6px;
      background: #ff0000;
      border-radius: 50%;
      animation: recordingPulse 2s infinite;
    `;
    
    // Add animation style if not exists
    if (!document.getElementById('recording-styles')) {
      const style = document.createElement('style');
      style.id = 'recording-styles';
      style.textContent = `
        @keyframes recordingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        [data-recording-ui] {
          /* Ensure recording UI elements are not captured */
          mix-blend-mode: normal !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    overlay.appendChild(this.indicator);
    document.documentElement.appendChild(overlay);
  }

  /**
   * Hide recording indicator
   */
  private hideIndicator(): void {
    const overlay = document.getElementById('recording-overlay');
    if (overlay) {
      overlay.remove();
    }
    this.indicator = null;
  }

  /**
   * Show brief toast notification
   */
  private showToast(message: string, duration: number): void {
    const toast = document.createElement('div');
    toast.setAttribute('data-recording-ui', 'true');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
      z-index: 999998;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });
    
    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Process the recording and show quality selection modal
   */
  private processRecording(): void {
    if (this.chunks.length === 0) {
      console.warn('[Recording] No data to process');
      return;
    }
    
    // Create blob from chunks
    this.recordedBlob = new Blob(this.chunks, { type: 'video/webm' });
    
    // Show quality selection modal
    this.showQualityModal();
  }

  /**
   * Show quality selection modal
   */
  private showQualityModal(): void {
    if (!this.recordedBlob) return;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.setAttribute('data-recording-ui', 'true');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483646;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Calculate sizes for different qualities
    const originalSizeMB = (this.recordedBlob.size / (1024 * 1024)).toFixed(2);
    const duration = this.state.startTime 
      ? (Date.now() - this.state.startTime - this.state.pausedDuration) / 1000 
      : 0;
    const durationStr = `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;

    modal.innerHTML = `
      <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">בחר איכות להורדה</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
        משך הקלטה: ${durationStr}<br>
        גודל מקורי: ${originalSizeMB} MB
      </p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button data-quality="ultra" style="
          padding: 12px 20px;
          border: 2px solid #4CAF50;
          border-radius: 8px;
          background: #f1f8f4;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s;
          font-size: 14px;
        " onmouseover="this.style.background='#e8f5e9'" onmouseout="this.style.background='#f1f8f4'">
          <strong>⭐ איכות אולטרה (מומלץ)</strong><br>
          <span style="color: #666; font-size: 12px;">איכות מקסימלית - ${originalSizeMB} MB</span>
        </button>
        <button data-quality="high" style="
          padding: 12px 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s;
          font-size: 14px;
        " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
          <strong>איכות גבוהה</strong><br>
          <span style="color: #666; font-size: 12px;">גודל משוער: ${(parseFloat(originalSizeMB) * 0.8).toFixed(2)} MB</span>
        </button>
        <button data-quality="medium" style="
          padding: 12px 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s;
          font-size: 14px;
        " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
          <strong>איכות בינונית</strong><br>
          <span style="color: #666; font-size: 12px;">גודל משוער: ${(parseFloat(originalSizeMB) * 0.5).toFixed(2)} MB</span>
        </button>
        <button data-quality="low" style="
          padding: 12px 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s;
          font-size: 14px;
        " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
          <strong>איכות נמוכה</strong><br>
          <span style="color: #666; font-size: 12px;">גודל משוער: ${(parseFloat(originalSizeMB) * 0.25).toFixed(2)} MB</span>
        </button>
        <button data-quality="cancel" style="
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          background: #f44336;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          margin-top: 8px;
        " onmouseover="this.style.background='#d32f2f'" onmouseout="this.style.background='#f44336'">
          ביטול
        </button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Handle button clicks
    backdrop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const quality = target.closest('button')?.getAttribute('data-quality');
      
      if (quality) {
        backdrop.remove();
        
        if (quality !== 'cancel') {
          this.downloadWithQuality(quality);
        } else {
          // Clear data without downloading
          this.recordedBlob = null;
          this.chunks = [];
        }
      }
    });
  }

  /**
   * Download the recording with selected quality
   */
  private downloadWithQuality(quality: string): void {
    if (!this.recordedBlob) return;

    // Generate filename with timestamp and quality
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const qualitySuffix = quality === 'ultra' ? '_ultra' : quality === 'original' ? '' : `_${quality}`;
    const filename = `recording_${timestamp}${qualitySuffix}.webm`;
    
    // For now, we'll download the original quality for all options
    // In a real implementation, you could use FFmpeg.js or similar to transcode
    const blob = this.recordedBlob;
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    // Clear data
    this.recordedBlob = null;
    this.chunks = [];
    
    // Log recording details
    const duration = this.state.startTime 
      ? (Date.now() - this.state.startTime - this.state.pausedDuration) / 1000 
      : 0;
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    
    console.log('[Recording] Downloaded:', {
      filename,
      quality,
      duration: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
      size: `${sizeMB} MB`
    });

    this.showToast('ההקלטה הורדה בהצלחה', 2000);
  }

  /**
   * Get current recording state
   */
  public getState(): RecordingState {
    return { ...this.state };
  }

  /**
   * Check if recording is active
   */
  public isRecording(): boolean {
    return this.state.isRecording;
  }

  /**
   * Check if recording is paused
   */
  public isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Toggle recording on/off
   */
  public async toggleRecording(): Promise<void> {
    if (this.state.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopRecording();
    this.hideIndicator();
    
    // Remove event listeners
    document.removeEventListener('keydown', this.setupKeyboardShortcuts);
  }
}

// Create singleton instance only on client side
let screenRecordingService: ScreenRecordingService;

if (typeof window !== 'undefined') {
  screenRecordingService = new ScreenRecordingService({
    quality: 'medium'
  });
} else {
  // Create a dummy instance for SSR that doesn't do anything
  screenRecordingService = {} as ScreenRecordingService;
}

export default screenRecordingService;

// Type definitions for better TypeScript support
declare global {
  interface DisplayMediaStreamOptions extends MediaStreamConstraints {
    video?: boolean | MediaTrackConstraints & {
      displaySurface?: DisplayCaptureSurfaceType;
      logicalSurface?: boolean;
      cursor?: CursorCaptureConstraint;
    };
    audio?: boolean | MediaTrackConstraints;
    preferCurrentTab?: boolean;
    selfBrowserSurface?: SelfCapturePreferenceEnum;
    surfaceSwitching?: SurfaceSwitchingPreferenceEnum;
    systemAudio?: SystemAudioPreferenceEnum;
  }
  
  type DisplayCaptureSurfaceType = "browser" | "monitor" | "window";
  type CursorCaptureConstraint = "always" | "motion" | "never";
  type SelfCapturePreferenceEnum = "exclude" | "include";
  type SurfaceSwitchingPreferenceEnum = "exclude" | "include";
  type SystemAudioPreferenceEnum = "exclude" | "include";
}