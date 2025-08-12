// Media Timer Web Worker
// Handles all timing operations off the main thread

interface TimerMessage {
  type: 'START' | 'STOP' | 'UPDATE' | 'SET_INTERVAL' | 'TICK' | 'SCHEDULE_REWIND' | 'CANCEL_REWIND' | 'START_CONTINUOUS' | 'STOP_CONTINUOUS';
  interval?: number;
  currentTime?: number;
  id?: string;
  delay?: number;
  pressId?: string;
  action?: 'forward' | 'rewind';
  amount?: number;
}

let timerInterval: number | null = null;
let currentTime = 0;
let interval = 100; // Default 100ms updates
let lastUpdateTime = Date.now();
let isRunning = false;

// High-precision timer using performance.now()
function startPrecisionTimer() {
  if (isRunning) return;
  
  isRunning = true;
  lastUpdateTime = performance.now();
  
  const tick = () => {
    if (!isRunning) return;
    
    const now = performance.now();
    const delta = now - lastUpdateTime;
    
    if (delta >= interval) {
      currentTime += delta / 1000; // Convert to seconds
      lastUpdateTime = now;
      
      // Send update to main thread
      self.postMessage({
        type: 'TICK',
        data: {
          currentTime,
          timestamp: now
        }
      });
    }
    
    // Use setTimeout for next tick to avoid blocking
    if (isRunning) {
      timerInterval = self.setTimeout(tick, Math.max(1, interval - (delta % interval)));
    }
  };
  
  tick();
}

// Stop the timer
function stopTimer() {
  isRunning = false;
  
  if (timerInterval !== null) {
    self.clearTimeout(timerInterval);
    timerInterval = null;
  }
}

// Handle rewind-on-pause timers
interface RewindTimer {
  id: string;
  delay: number;
  callback: () => void;
  timeoutId?: number;
}

const rewindTimers = new Map<string, RewindTimer>();

function scheduleRewind(id: string, delay: number) {
  // Clear existing timer if any
  const existing = rewindTimers.get(id);
  if (existing && existing.timeoutId) {
    self.clearTimeout(existing.timeoutId);
  }
  
  // Schedule new rewind
  const timeoutId = self.setTimeout(() => {
    self.postMessage({
      type: 'REWIND',
      data: {
        id,
        timestamp: performance.now()
      }
    });
    rewindTimers.delete(id);
  }, delay);
  
  rewindTimers.set(id, {
    id,
    delay,
    callback: () => {},
    timeoutId
  });
}

function cancelRewind(id: string) {
  const timer = rewindTimers.get(id);
  if (timer && timer.timeoutId) {
    self.clearTimeout(timer.timeoutId);
    rewindTimers.delete(id);
  }
}

// Handle continuous press for forward/rewind buttons
interface ContinuousPress {
  id: string;
  action: 'forward' | 'rewind';
  amount: number;
  intervalId?: number;
}

const continuousPresses = new Map<string, ContinuousPress>();

function startContinuousPress(id: string, action: 'forward' | 'rewind', amount: number) {
  // Clear any existing press
  stopContinuousPress(id);
  
  // Send initial action
  self.postMessage({
    type: 'CONTINUOUS_ACTION',
    data: {
      id,
      action,
      amount
    }
  });
  
  // Schedule repeated actions
  const intervalId = self.setInterval(() => {
    self.postMessage({
      type: 'CONTINUOUS_ACTION',
      data: {
        id,
        action,
        amount
      }
    });
  }, 100); // Repeat every 100ms
  
  continuousPresses.set(id, {
    id,
    action,
    amount,
    intervalId
  });
}

function stopContinuousPress(id: string) {
  const press = continuousPresses.get(id);
  if (press && press.intervalId) {
    self.clearInterval(press.intervalId);
    continuousPresses.delete(id);
  }
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<TimerMessage>) => {
  const { type } = event.data;
  
  switch (type) {
    case 'START':
      if (event.data.interval !== undefined) {
        interval = event.data.interval;
      }
      startPrecisionTimer();
      break;
      
    case 'STOP':
      stopTimer();
      break;
      
    case 'UPDATE':
      if (event.data.currentTime !== undefined) {
        currentTime = event.data.currentTime;
      }
      break;
      
    case 'SET_INTERVAL':
      if (event.data.interval !== undefined) {
        interval = event.data.interval;
      }
      break;
      
    case 'SCHEDULE_REWIND':
      if (event.data.id && event.data.delay) {
        scheduleRewind(event.data.id, event.data.delay);
      }
      break;
      
    case 'CANCEL_REWIND':
      if (event.data.id) {
        cancelRewind(event.data.id);
      }
      break;
      
    case 'START_CONTINUOUS':
      if (event.data.pressId && event.data.action && event.data.amount) {
        startContinuousPress(event.data.pressId, event.data.action, event.data.amount);
      }
      break;
      
    case 'STOP_CONTINUOUS':
      if (event.data.id) {
        stopContinuousPress(event.data.id);
      }
      break;
      
    default:
      break;
  }
};

// Export for TypeScript
export {};