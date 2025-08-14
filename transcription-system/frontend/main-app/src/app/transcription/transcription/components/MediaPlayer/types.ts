// MediaPlayer TypeScript type definitions

export interface MediaPlayerState {
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  isLoading: boolean;
}

export interface WaveformData {
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
  resolution: number;
}

export interface MediaFile {
  url: string;
  name: string;
  type: 'audio' | 'video';
}

export interface KeyboardShortcut {
  key: string;
  action: string;
  description: string;
  enabled: boolean;
  group?: string;
}

export interface AutoDetectSettings {
  enabled: boolean;
  mode: 'regular' | 'enhanced';
  firstPauseDelay: number;  // milliseconds
  secondPauseDelay: number; // milliseconds  
  autoResumeDelay: number;  // milliseconds
  rewindOnPause: boolean;
  rewindAmount: number;     // seconds
}

export interface PedalSettings {
  enabled: boolean;
  connected: boolean;
  deviceId?: string;
  buttonMappings: {
    left?: string;
    middle?: string;
    right?: string;
  };
}

export interface RewindOnPauseSettings {
  enabled: boolean;
  amount: number; // seconds
  source: 'keyboard' | 'pedal' | 'autodetect' | 'all';
}

export interface MediaPlayerSettings {
  shortcuts: KeyboardShortcut[];
  shortcutsEnabled: boolean;
  autoDetect: AutoDetectSettings;
  pedal: PedalSettings;
  rewindOnPause: RewindOnPauseSettings;
}

// Worker message types
export interface WorkerMessage {
  type: string;
  data?: any;
  id?: string;
}

export interface WaveformWorkerMessage extends WorkerMessage {
  type: 'ANALYZE' | 'CANCEL' | 'PROGRESS';
  audioBuffer?: ArrayBuffer;
  sampleRate?: number;
  progress?: number;
  peaks?: Float32Array;
}

export interface TimerWorkerMessage extends WorkerMessage {
  type: 'START' | 'STOP' | 'UPDATE' | 'TICK';
  interval?: number;
  currentTime?: number;
}

export interface AutoDetectWorkerMessage extends WorkerMessage {
  type: 'START_TYPING' | 'STOP_TYPING' | 'ENABLE' | 'DISABLE' | 'SET_MODE';
  mode?: 'regular' | 'enhanced';
  settings?: AutoDetectSettings;
  action?: 'pause' | 'resume';
}

// Global API interface for window.mediaPlayer
export interface MediaPlayerAPI {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  loadMedia: (url: string, filename: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  openSettings: () => void;
  closeSettings: () => void;
  isPlaying: () => boolean;
  getTimestamp: () => string;
}