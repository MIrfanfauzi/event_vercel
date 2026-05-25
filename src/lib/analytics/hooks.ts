import { useState, useEffect, useRef, useCallback } from 'react';
import { logEvent, startHoverTimer, endHoverTimer } from './tracker';
import { getOrCreateParticipantId, setParticipantId as setSessionParticipantId, getSessionDuration } from './session';

export function useAnalytics() {
  const [participantId, setParticipantIdState] = useState<string>('P-LOADING');

  useEffect(() => {
    setParticipantIdState(getOrCreateParticipantId());
  }, []);

  const changeParticipantId = useCallback((newId: string) => {
    setSessionParticipantId(newId);
    setParticipantIdState(newId);
    logEvent('participant_id_changed', { newParticipantId: newId });
  }, []);

  const trackEvent = useCallback((eventName: string, metadata?: Record<string, any>) => {
    return logEvent(eventName, metadata);
  }, []);

  return {
    participantId,
    changeParticipantId,
    trackEvent,
    getDuration: getSessionDuration
  };
}

/**
 * Hook to track scroll depth on a page.
 * Fires events when the user scrolls past 25%, 50%, 75%, and 100% of the page height.
 */
export function useScrollDepth(scrollEventName: string) {
  const milestonesLogged = useRef<Record<number, boolean>>({});
  const maxScrollDepth = useRef<number>(0);

  useEffect(() => {
    milestonesLogged.current = {};
    maxScrollDepth.current = 0;

    let throttleTimer: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (throttleTimer) return;

      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        
        if (typeof window === 'undefined') return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        const totalScrollable = scrollHeight - clientHeight;
        if (totalScrollable <= 0) return;

        const scrollPercent = Math.min(100, Math.round((scrollTop / totalScrollable) * 100));
        
        if (scrollPercent > maxScrollDepth.current) {
          maxScrollDepth.current = scrollPercent;
        }

        // Check milestones
        const milestones = [25, 50, 75, 100];
        milestones.forEach(milestone => {
          if (scrollPercent >= milestone && !milestonesLogged.current[milestone]) {
            milestonesLogged.current[milestone] = true;
            logEvent(scrollEventName, { 
              scrollDepthPct: milestone,
              maxScrollDepth: maxScrollDepth.current 
            });
          }
        });
      }, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      window.removeEventListener('scroll', handleScroll);
      
      if (maxScrollDepth.current > 0) {
        logEvent(`${scrollEventName}_final`, { 
          maxScrollDepth: maxScrollDepth.current 
        });
      }
    };
  }, [scrollEventName]);
}

/**
 * Hook to track hover duration on a React element.
 */
export function useHoverDuration(eventName: string, metadata?: Record<string, any>) {
  const hoverKey = useRef<string>(`hover_${Math.random().toString(36).substr(2, 9)}`);

  const onMouseEnter = useCallback(() => {
    startHoverTimer(hoverKey.current);
  }, []);

  const onMouseLeave = useCallback(() => {
    endHoverTimer(hoverKey.current, eventName, metadata);
  }, [eventName, metadata]);

  return {
    onMouseEnter,
    onMouseLeave
  };
}
