/**
 * React hook for resource checking
 */

import { useState, useCallback } from 'react';
import { resourceMonitor, OperationType, SafetyCheck } from '@/lib/services/resourceMonitor';
import { ResourceWarningData } from '@/app/transcription/transcription/components/MediaPlayer/components/ResourceWarningModal';

export interface ResourceCheckHook {
  checkOperation: (type: OperationType, size: number) => Promise<SafetyCheck>;
  isChecking: boolean;
  lastCheck: SafetyCheck | null;
  warningData: ResourceWarningData | null;
  showResourceWarning: boolean;
  setShowResourceWarning: (show: boolean) => void;
  handleContinueRisky: () => void;
  handleUseAlternative: () => void;
  handleCloseWarning: () => void;
  showWarning: (check: SafetyCheck, onProceed?: () => void) => void;
}

export function useResourceCheck(): ResourceCheckHook {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<SafetyCheck | null>(null);
  const [warningData, setWarningData] = useState<ResourceWarningData | null>(null);
  const [showResourceWarning, setShowResourceWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  const showWarning = useCallback((check: SafetyCheck, onProceed?: () => void) => {
    // Convert SafetyCheck to ResourceWarningData
    const data: ResourceWarningData = {
      fileSize: check.metadata?.fileSize || 'לא ידוע',
      memoryNeeded: check.metadata?.memoryNeeded || 'לא ידוע',
      memoryAvailable: check.metadata?.memoryAvailable || 'לא ידוע',
      message: check.message,
      messageHebrew: check.messageHebrew,
      recommendation: check.recommendation,
      alternativeMethod: check.alternativeMethod
    };

    setWarningData(data);
    setPendingAction(() => onProceed || (() => {}));
    setShowResourceWarning(true);
  }, []);

  const handleContinueRisky = useCallback(() => {
    setShowResourceWarning(false);
    if (pendingAction) {
      pendingAction();
    }
    setPendingAction(null);
    setWarningData(null);
  }, [pendingAction]);

  const handleUseAlternative = useCallback(() => {
    setShowResourceWarning(false);
    // TODO: Implement alternative method execution
    console.log('Using alternative method:', warningData?.alternativeMethod);
    setPendingAction(null);
    setWarningData(null);
  }, [warningData]);

  const handleCloseWarning = useCallback(() => {
    setShowResourceWarning(false);
    setPendingAction(null);
    setWarningData(null);
  }, []);

  return {
    checkOperation,
    isChecking,
    lastCheck,
    warningData,
    showResourceWarning,
    setShowResourceWarning,
    handleContinueRisky,
    handleUseAlternative,
    handleCloseWarning,
    showWarning
  };
}