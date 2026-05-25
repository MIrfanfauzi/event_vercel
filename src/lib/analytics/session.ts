import { UsabilitySession } from './types';

// Helper to generate a random 4-character ID suffix (e.g. P-1234)
function generateParticipantId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `P-${num}`;
}

export function getOrCreateParticipantId(): string {
  if (typeof window === 'undefined') return 'P-SERVER';
  
  let id = localStorage.getItem('eventseats_participant_id');
  if (!id) {
    id = generateParticipantId();
    localStorage.setItem('eventseats_participant_id', id);
  }
  return id;
}

export function setParticipantId(newId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eventseats_participant_id', newId);
}

export function detectBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident') || ua.includes('MSIE')) return 'Internet Explorer';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Microsoft Edge';
  if (ua.includes('Chrome')) return 'Google Chrome';
  if (ua.includes('Safari')) return 'Apple Safari';
  return 'Unknown Browser';
}

export function detectOS(ua: string): string {
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (ua.includes('Windows NT 6.2')) return 'Windows 8';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

export function detectDeviceType(ua: string): 'Desktop' | 'Tablet' | 'Mobile' {
  const isMobileUA = /Mobi|Android|iPhone|iPod/i.test(ua);
  const isTabletUA = /Tablet|iPad|PlayBook|Silk/i.test(ua);
  
  if (typeof window !== 'undefined') {
    const width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width <= 1024) return 'Tablet';
    return 'Desktop';
  }
  
  if (isTabletUA) return 'Tablet';
  if (isMobileUA) return 'Mobile';
  return 'Desktop';
}

export function initializeSession(): UsabilitySession {
  if (typeof window === 'undefined') {
    return {
      participantId: 'P-SERVER',
      deviceType: 'Desktop',
      browserName: 'Server',
      operatingSystem: 'Server',
      screenResolution: 'N/A',
      viewportSize: 'N/A',
      startTime: new Date().toISOString()
    };
  }

  const ua = navigator.userAgent;
  const participantId = getOrCreateParticipantId();
  const deviceType = detectDeviceType(ua);
  const browserName = detectBrowser(ua);
  const operatingSystem = detectOS(ua);
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
  
  // Track when the testing session started in local storage
  let startTime = localStorage.getItem('eventseats_session_start_time');
  if (!startTime) {
    startTime = new Date().toISOString();
    localStorage.setItem('eventseats_session_start_time', startTime);
  }

  return {
    participantId,
    deviceType,
    browserName,
    operatingSystem,
    screenResolution,
    viewportSize,
    startTime
  };
}

export function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;
  const startStr = localStorage.getItem('eventseats_session_start_time');
  if (!startStr) return 0;
  const startTime = new Date(startStr).getTime();
  const now = new Date().getTime();
  return Math.max(0, Math.floor((now - startTime) / 1000));
}

export function resetSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('eventseats_session_start_time');
  localStorage.setItem('eventseats_session_start_time', new Date().toISOString());
}
