
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/app/integrations/supabase/client';

interface SessionStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeRemaining: number;
  isExpiringSoon: boolean;
}

export function useSessionManagement() {
  const { sessionExpiresAt, refreshSession, signOut } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: false,
    expiresAt: null,
    timeRemaining: 0,
    isExpiringSoon: false,
  });

  const checkSessionStatus = useCallback(async () => {
    const isValid = await sessionManager.isSessionValid();
    const timeRemaining = await sessionManager.getTimeUntilExpiry();
    const isExpiringSoon = timeRemaining > 0 && timeRemaining < 300; // Less than 5 minutes

    setSessionStatus({
      isValid,
      expiresAt: sessionExpiresAt,
      timeRemaining,
      isExpiringSoon,
    });

    return { isValid, timeRemaining, isExpiringSoon };
  }, [sessionExpiresAt]);

  const handleSessionRefresh = useCallback(async () => {
    try {
      console.log('Refreshing session via hook...');
      await refreshSession();
      await checkSessionStatus();
    } catch (error) {
      console.error('Failed to refresh session:', error);
      throw error;
    }
  }, [refreshSession, checkSessionStatus]);

  const handleSessionExpiry = useCallback(async () => {
    console.log('Session expired, signing out...');
    await signOut();
  }, [signOut]);

  // Check session status periodically
  useEffect(() => {
    checkSessionStatus();

    const interval = setInterval(async () => {
      const status = await checkSessionStatus();
      
      if (!status.isValid) {
        await handleSessionExpiry();
      } else if (status.isExpiringSoon) {
        console.log('Session expiring soon, consider refreshing');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkSessionStatus, handleSessionExpiry]);

  return {
    sessionStatus,
    checkSessionStatus,
    refreshSession: handleSessionRefresh,
    handleSessionExpiry,
  };
}
