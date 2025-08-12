/**
 * Configuration file for the transcription application
 */

// API Configuration
const API_BASE_URL = 'http://localhost:8080';
const API_URL = API_BASE_URL + '/api';

// Make them available globally
window.API_BASE_URL = API_BASE_URL;
window.API_URL = API_URL;

// Media Configuration
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'wma'];
const SUPPORTED_VIDEO_FORMATS = ['mp4', 'avi', 'mov', 'webm', 'mkv'];
const SUPPORTED_HELPER_FORMATS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'];

// Auto-save Configuration
const AUTO_SAVE_INTERVAL = 120000; // 2 minutes

// Media Player Configuration
const DEFAULT_PLAYBACK_RATE = 1.0;
const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

// Keyboard Shortcuts
const KEYBOARD_SHORTCUTS = {
    'Space': 'Play/Pause',
    'ArrowLeft': 'Rewind 5 seconds',
    'ArrowRight': 'Forward 5 seconds',
    'Ctrl+S': 'Save transcription',
    'Ctrl+H': 'Toggle helper files',
    'Ctrl+B': 'Toggle sidebar',
    'Alt+ArrowLeft': 'Previous media',
    'Alt+ArrowRight': 'Next media'
};

// Export configuration
window.APP_CONFIG = {
    API_URL,
    API_BASE_URL,
    SUPPORTED_AUDIO_FORMATS,
    SUPPORTED_VIDEO_FORMATS,
    SUPPORTED_HELPER_FORMATS,
    AUTO_SAVE_INTERVAL,
    DEFAULT_PLAYBACK_RATE,
    PLAYBACK_RATES,
    KEYBOARD_SHORTCUTS
};