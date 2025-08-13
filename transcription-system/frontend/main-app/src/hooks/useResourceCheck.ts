/**
 * React hook for resource checking
 */

import { useState, useCallback } from 'react';
import { resourceMonitor, OperationType, SafetyCheck } from '@/lib/services/resourceMonitor';

export interface ResourceCheckHook {
  checkOperation: (type: OperationType, size: number) => Promise<SafetyCheck>;
  isChecking: boolean;
  lastCheck: SafetyCheck | null;
  showWarning: (check: SafetyCheck) => void;
}

export function useResourceCheck(): ResourceCheckHook {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<SafetyCheck | null>(null);

  const checkOperation = useCallback(async (
    type: OperationType,
    size: number
  ): Promise<SafetyCheck> => {
    setIsChecking(true);
    try {
      const result = await resourceMonitor.checkOperation(type, size);
      setLastCheck(result);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const showWarning = useCallback((check: SafetyCheck) => {
    // In a real app, this would show a modal or toast
    // For now, we'll use confirm dialog
    const message = `${check.messageHebrew}\n\n${check.message}\n\nהאם להמשיך בכל זאת?`;
    
    if (check.alternativeMethod) {
      const useAlternative = confirm(
        `${message}\n\nאפשרות חלופית: ${check.alternativeMethod}`
      );
      return useAlternative;
    }
    
    if (!check.safe) {
      alert(message);
      return false;
    }
    
    return confirm(message);
  }, []);

  return {
    checkOperation,
    isChecking,
    lastCheck,
    showWarning
  };
}