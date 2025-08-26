import { useState, useEffect } from 'react';

/**
 * Hook to detect viewport width and determine if three-column layout should be used
 * THREE-COLUMN-LAYOUT feature - can be disabled by setting forceDisable = true
 */

// ROLLBACK: Set this to true to disable three-column layout entirely
const forceDisable = false;

// Debounce utility to prevent excessive re-renders
const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const useResponsiveLayout = () => {
  const [isThreeColumn, setIsThreeColumn] = useState(false);
  
  useEffect(() => {
    // Quick disable mechanism
    if (forceDisable) {
      setIsThreeColumn(false);
      return;
    }
    
    const checkLayout = () => {
      // Check viewport width (actual browser window width)
      const viewportWidth = window.innerWidth;
      
      // Breakpoint at 1600px for three-column layout
      const shouldUseThreeColumn = viewportWidth >= 1600;
      
      setIsThreeColumn(shouldUseThreeColumn);
      
      // Debug logging (can be removed in production)
      console.log(`[Layout] Viewport width: ${viewportWidth}px, Three-column: ${shouldUseThreeColumn}`);
    };
    
    // Check on mount
    checkLayout();
    
    // Debounced resize handler
    const handleResize = debounce(checkLayout, 100);
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return isThreeColumn;
};

// Export for testing purposes
export const getLayoutBreakpoint = () => 1600;
export const isLayoutDisabled = () => forceDisable;