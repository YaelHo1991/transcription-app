/**
 * Shared types for ProjectLoader component
 * Used across Transcription, Proofreading, and Export pages
 */

// Computer identification for multi-computer support
export interface ComputerInfo {
  computerId: string;
  computerName: string;
  lastSeen: Date;
}

// Media source tracking for multi-computer support
export interface MediaSource {
  computerId: string;
  computerName: string;
  path: string;
  lastSeen: Date;
}

// Media file information
export interface MediaFile {
  mediaId: string;
  name: string;
  type: 'local' | 'url' | 'server';
  sources: Record<string, MediaSource>;  // Multiple computer paths
  currentSource?: string;                // Current computer's source
  metadata: {
    size: number;
    duration?: string;
    format: string;
    fingerprint?: string;               // For identifying same file
  };
  serverStorage: {
    used: boolean;
    path?: string;
    uploadedAt?: Date;
  };
  notes: string[];                      // Track path changes, uploads, etc.
}

// Main project structure
export interface Project {
  projectId: string;
  userId: string;
  name: string;                         // Internal name
  displayName: string;                  // User-visible name
  mediaFiles: MediaFile[];
  createdAt: Date;
  lastModified: Date;
  lastAccessed: {
    transcription?: Date;
    proofreading?: Date;
    export?: Date;
  };
}

// Page-specific project extensions
export interface TranscriptionProject extends Project {
  transcriptionData?: {
    [mediaId: string]: {
      content: any[];
      speakers: any[];
      remarks: any[];
      versions: any[];
    };
  };
}

export interface ProofreadingProject extends Project {
  proofreadingData?: {
    [mediaId: string]: {
      originalContent: any[];
      corrections: any[];
      status: 'pending' | 'in-progress' | 'completed';
    };
  };
}

export interface ExportProject extends Project {
  exportData?: {
    [mediaId: string]: {
      template: string;
      settings: any;
      history: any[];
    };
  };
}

// User storage quota
export interface UserQuota {
  userId: string;
  quotaLimit: number;      // in bytes
  quotaUsed: number;       // in bytes
  quotaType: 'free' | 'basic' | 'pro' | 'custom';
  customLimit?: number;
}

// Upload parameters
export interface UploadParams {
  userId: string;
  folderName?: string;
  files: File[];
  computerId: string;
  computerName: string;
}

// Component props
export interface ProjectLoaderProps {
  context: 'transcription' | 'proofreading' | 'export';
  showMediaPlayer?: boolean;
  onProjectLoad: (project: Project) => void;
  onMediaSelect?: (media: MediaFile) => void;
  onError?: (error: Error) => void;
}

// Upload status
export interface UploadStatus {
  isUploading: boolean;
  progress: number;
  currentFile?: string;
  error?: string;
}

// Media status for missing files
export interface MediaStatus {
  mediaId: string;
  available: boolean;
  missingPath?: string;
  needsRelocate: boolean;
}