'use client';

import React, { useEffect, useState } from 'react';
import { initializeSession } from '@/lib/analytics/session';
import { initClarity, setClarityUserProperties, identifyUserInClarity } from '@/lib/analytics/clarity';
import { handleGlobalClick, logEvent } from '@/lib/analytics/tracker';
import { ThinkAloudWidget } from '@/components/analytics/ThinkAloudWidget';

interface ClarityProviderProps {
  children: React.ReactNode;
}

export function ClarityProvider({ children }: ClarityProviderProps) {
  const [showWidget, setShowWidget] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initialize Analytics Session Info
    const session = initializeSession();

    // 2. Load Microsoft Clarity
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || 'demo_clarity_id';
    initClarity(clarityId);

    // 3. Set Clarity Custom Dimensions (User Properties)
    setClarityUserProperties({
      participant_id: session.participantId,
      device_type: session.deviceType,
      browser_name: session.browserName,
      operating_system: session.operatingSystem
    });

    // 3b. Call Clarity Identify API
    identifyUserInClarity(session.participantId);

    // 4. Log Session Initialization
    logEvent('session_initialized', {
      deviceType: session.deviceType,
      browserName: session.browserName,
      operatingSystem: session.operatingSystem,
      screenResolution: session.screenResolution,
      viewportSize: session.viewportSize
    });

    // 5. Attach Global Click Trackers (Coordinates, Dead clicks, Rage clicks)
    window.addEventListener('click', handleGlobalClick, { capture: true });

    // 6. Check for testing widget trigger
    // Trigger via URL query "?testing=true", localStorage, or Dev Mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestingParam = urlParams.get('testing') === 'true';
    const isTestingLocal = localStorage.getItem('eventseats_usability_testing_mode') === 'true';
    const isDev = process.env.NODE_ENV === 'development';

    if (isTestingParam) {
      localStorage.setItem('eventseats_usability_testing_mode', 'true');
      setShowWidget(true);
    } else if (isTestingLocal || isDev) {
      setShowWidget(true);
    }

    // Support keyboard shortcut to toggle widget: Ctrl + Shift + U (Usability)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        setShowWidget(prev => {
          const next = !prev;
          localStorage.setItem('eventseats_usability_testing_mode', next ? 'true' : 'false');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {children}
      {showWidget && <ThinkAloudWidget onClose={() => {
        setShowWidget(false);
        localStorage.removeItem('eventseats_usability_testing_mode');
      }} />}
    </>
  );
}
export default ClarityProvider;
