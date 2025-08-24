export const autoDetectWorkerCode = `
// Auto-Detect Web Worker
// Handles typing detection and auto pause/resume logic

// State management
let settings = {
  enabled: false,
  mode: 'regular',
  firstPauseDelay: 500,
  secondPauseDelay: 1000,
  autoResumeDelay: 1500,
  rewindOnPause: true,
  rewindAmount: 0.5
};

let isTyping = false;
let isPaused = false;
let typingStartTime = 0;
let lastTypingTime = 0;
let pauseTimer = null;
let resumeTimer = null;
let autoResumeTimer = null;

// State for enhanced mode
let enhancedState = 'playing'; // 'playing' | 'first_pause' | 'typing_after_pause' | 'waiting_for_second_pause'
let enhancedTypingCount = 0;

// Clear all timers
function clearAllTimers() {
  if (pauseTimer !== null) {
    self.clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  
  if (resumeTimer !== null) {
    self.clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  
  if (autoResumeTimer !== null) {
    self.clearTimeout(autoResumeTimer);
    autoResumeTimer = null;
  }
}

// Regular mode logic
function handleRegularMode() {
  if (isTyping) {
    // User started typing
    if (!isPaused) {
      // Pause immediately when typing starts
      sendAction('pause');
      isPaused = true;
    }
    
    // Clear any resume timer
    if (resumeTimer !== null) {
      self.clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  } else {
    // User stopped typing
    if (isPaused) {
      // Schedule resume after delay
      clearAllTimers();
      
      resumeTimer = self.setTimeout(() => {
        sendAction('resume');
        isPaused = false;
        resumeTimer = null;
      }, settings.firstPauseDelay);
    }
  }
}

// Enhanced mode logic
function handleEnhancedMode() {
  const now = Date.now();
  
  switch (enhancedState) {
    case 'playing':
      if (isTyping) {
        // Start typing while playing - continue playing but start monitoring
        typingStartTime = now;
        lastTypingTime = now;
        enhancedTypingCount = 1;
      } else {
        // Stopped typing - check if we should pause
        const typingDuration = lastTypingTime - typingStartTime;
        
        if (typingDuration > 0) {
          // There was typing, schedule first pause
          pauseTimer = self.setTimeout(() => {
            sendAction('pause');
            isPaused = true;
            enhancedState = 'first_pause';
            pauseTimer = null;
            
            // Schedule auto-resume if no more typing
            autoResumeTimer = self.setTimeout(() => {
              if (!isTyping) {
                sendAction('resume');
                isPaused = false;
                enhancedState = 'playing';
              }
              autoResumeTimer = null;
            }, settings.autoResumeDelay);
            
          }, settings.firstPauseDelay);
        }
      }
      break;
      
    case 'first_pause':
      if (isTyping) {
        // Typing after first pause
        enhancedState = 'typing_after_pause';
        typingStartTime = now;
        lastTypingTime = now;
        
        // Cancel auto-resume
        if (autoResumeTimer !== null) {
          self.clearTimeout(autoResumeTimer);
          autoResumeTimer = null;
        }
      }
      break;
      
    case 'typing_after_pause':
      if (isTyping) {
        // Continue typing
        lastTypingTime = now;
      } else {
        // Stopped typing - wait for second pause
        enhancedState = 'waiting_for_second_pause';
        
        resumeTimer = self.setTimeout(() => {
          sendAction('resume');
          isPaused = false;
          enhancedState = 'playing';
          resumeTimer = null;
        }, settings.secondPauseDelay);
      }
      break;
      
    case 'waiting_for_second_pause':
      if (isTyping) {
        // Resumed typing before second pause
        enhancedState = 'typing_after_pause';
        lastTypingTime = now;
        
        // Cancel resume timer
        if (resumeTimer !== null) {
          self.clearTimeout(resumeTimer);
          resumeTimer = null;
        }
      }
      break;
  }
}

// Send action to main thread
function sendAction(action) {
  self.postMessage({
    type: 'ACTION',
    data: {
      action,
      timestamp: Date.now()
    }
  });
  
  // Send status update
  sendStatus();
}

// Send current status
function sendStatus() {
  self.postMessage({
    type: 'STATUS',
    data: {
      enabled: settings.enabled,
      mode: settings.mode,
      isTyping,
      isPaused,
      state: settings.mode === 'enhanced' ? enhancedState : (isPaused ? 'paused' : 'playing')
    }
  });
}

// Handle typing events
function handleTypingStart() {
  if (!settings.enabled) return;
  
  isTyping = true;
  lastTypingTime = Date.now();
  
  if (settings.mode === 'regular') {
    handleRegularMode();
  } else {
    handleEnhancedMode();
  }
  
  sendStatus();
}

function handleTypingStop() {
  if (!settings.enabled) return;
  
  isTyping = false;
  
  if (settings.mode === 'regular') {
    handleRegularMode();
  } else {
    handleEnhancedMode();
  }
  
  sendStatus();
}

// Reset state
function reset() {
  clearAllTimers();
  isTyping = false;
  isPaused = false;
  typingStartTime = 0;
  lastTypingTime = 0;
  enhancedState = 'playing';
  enhancedTypingCount = 0;
  sendStatus();
}

// Handle messages from main thread
self.onmessage = (event) => {
  const { type } = event.data;
  
  switch (type) {
    case 'UPDATE_SETTINGS':
      if (event.data.settings) {
        const wasEnabled = settings.enabled;
        settings = event.data.settings;
        
        // Reset if enabling/disabling or changing mode
        if (wasEnabled !== settings.enabled || settings.mode !== event.data.settings.mode) {
          reset();
        }
      }
      break;
      
    case 'START_TYPING':
      handleTypingStart();
      break;
      
    case 'STOP_TYPING':
      handleTypingStop();
      break;
      
    case 'ENABLE':
      settings.enabled = true;
      reset();
      break;
      
    case 'DISABLE':
      settings.enabled = false;
      reset();
      break;
      
    case 'SET_MODE':
      if (event.data.mode) {
        settings.mode = event.data.mode;
        reset();
      }
      break;
      
    default:
      break;
  }
};
`;