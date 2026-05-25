import Clarity from '@microsoft/clarity';

export function initClarity(clarityId?: string): void {
  if (typeof window === 'undefined') return;

  const targetId = clarityId || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!targetId) {
    console.warn('Microsoft Clarity ID not found. Clarity will not load. Set NEXT_PUBLIC_CLARITY_PROJECT_ID.');
    return;
  }

  try {
    Clarity.init(targetId);
    Clarity.consentV2(); // Grant consent to record and stream session details instantly
    console.log(`Microsoft Clarity initialized with ID: ${targetId}`);
  } catch (error) {
    console.error('Error loading Microsoft Clarity library:', error);
  }
}

/**
 * Tag session with custom key-value metadata in Microsoft Clarity.
 * Use this to filter session recordings by participant_id, device_type, etc.
 */
export function setClarityUserProperties(properties: Record<string, string>): void {
  if (typeof window === 'undefined') return;

  try {
    Object.entries(properties).forEach(([key, value]) => {
      Clarity.setTag(key, value);
    });
  } catch (error) {
    console.error('Error setting Clarity user properties:', error);
  }
}

/**
 * Dispatch custom events to Microsoft Clarity.
 * Custom events are visible in Clarity dashboard for segmentation.
 */
export function trackClarityEvent(eventName: string): void {
  if (typeof window === 'undefined') return;

  try {
    Clarity.event(eventName);
  } catch (error) {
    console.error('Error dispatching Clarity event:', error);
  }
}

/**
 * Identify user with a custom ID in Microsoft Clarity.
 */
export function identifyUserInClarity(participantId: string): void {
  if (typeof window === 'undefined') return;

  try {
    Clarity.identify(participantId);
    console.log(`Microsoft Clarity: User identified as ${participantId}`);
  } catch (error) {
    console.error('Error identifying user in Clarity:', error);
  }
}
