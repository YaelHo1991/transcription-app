export const timerWorkerCode = `
// Media Timer Web Worker
// Handles all timing operations off the main thread

let timerInterval = null;
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
const rewindTimers = new Map();

function scheduleRewind(id, delay) {
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
    timeoutId
  });
}

function cancelRewind(id) {
  const timer = rewindTimers.get(id);
  if (timer && timer.timeoutId) {
    self.clearTimeout(timer.timeoutId);
    rewindTimers.delete(id);
  }
}

// Handle continuous press for forward/rewind buttons
const continuousPresses = new Map();

function startContinuousPress(id, action, amount) {
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

function stopContinuousPress(id) {
  const press = continuousPresses.get(id);
  if (press && press.intervalId) {
    self.clearInterval(press.intervalId);
    continuousPresses.delete(id);
  }
}

// Handle messages from main thread
self.onmessage = (event) => {
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
`;