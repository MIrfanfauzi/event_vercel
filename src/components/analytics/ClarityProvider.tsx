'use client';

import React, { useEffect } from 'react';
import { initializeSession } from '@/lib/analytics/session';
import { initClarity, setClarityUserProperties, identifyUserInClarity } from '@/lib/analytics/clarity';
import { handleGlobalClick, logEvent } from '@/lib/analytics/tracker';

interface ClarityProviderProps {
  children: React.ReactNode;
}

export function ClarityProvider({ children }: ClarityProviderProps) {
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

    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  return <>{children}</>;
}
export default ClarityProvider;
