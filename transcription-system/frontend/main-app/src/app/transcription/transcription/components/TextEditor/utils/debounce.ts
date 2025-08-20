/**
 * Debounce utility for optimizing frequent updates
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void; flush: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;

  const debounced = function(this: any, ...args: any[]) {
    lastArgs = args;
    const context = this;

    const later = () => {
      timeout = null;
      if (lastArgs) {
        func.apply(context, lastArgs);
      }
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  } as T;

  // Add cancel method to clear pending invocation
  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };

  // Add flush method to invoke immediately
  (debounced as any).flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      if (lastArgs) {
        func.apply(undefined, lastArgs);
      }
      timeout = null;
      lastArgs = null;
    }
  };

  return debounced as T & { cancel: () => void; flush: () => void };
}

/**
 * Create a debounced function with different delays for different scenarios
 */
export function createAdaptiveDebounce<T extends (...args: any[]) => any>(
  func: T,
  options: {
    typing?: number;    // Delay while typing (default: 300ms)
    paste?: number;     // Delay after paste (default: 100ms)
    idle?: number;      // Delay when idle (default: 1000ms)
  } = {}
): T & { cancel: () => void; flush: () => void; setMode: (mode: 'typing' | 'paste' | 'idle') => void } {
  const delays = {
    typing: options.typing ?? 300,
    paste: options.paste ?? 100,
    idle: options.idle ?? 1000
  };

  let currentMode: 'typing' | 'paste' | 'idle' = 'typing';
  let currentDebounce = debounce(func, delays[currentMode]);

  const wrapper = function(this: any, ...args: any[]) {
    return currentDebounce.apply(this, args);
  } as T;

  (wrapper as any).cancel = () => currentDebounce.cancel();
  (wrapper as any).flush = () => currentDebounce.flush();
  (wrapper as any).setMode = (mode: 'typing' | 'paste' | 'idle') => {
    if (mode !== currentMode) {
      currentDebounce.flush(); // Flush pending calls before switching
      currentMode = mode;
      currentDebounce = debounce(func, delays[currentMode]);
    }
  };

  return wrapper as T & { 
    cancel: () => void; 
    flush: () => void; 
    setMode: (mode: 'typing' | 'paste' | 'idle') => void 
  };
}