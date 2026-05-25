export interface UsabilityEvent {
  eventId: string;
  timestamp: string; // ISO string
  sessionDuration: number; // in seconds
  eventName: string;
  pageUrl: string;
  x?: number; // screen X coordinate (heatmap-ready)
  y?: number; // screen Y coordinate (heatmap-ready)
  targetSelector?: string; // CSS selector path of clicked element
  metadata?: Record<string, any>; // scenario-specific data (e.g., scroll depth, wrong seat ID, search term)
}

export interface UsabilitySession {
  participantId: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  browserName: string;
  operatingSystem: string;
  screenResolution: string; // "width x height"
  viewportSize: string; // "width x height"
  startTime: string; // ISO string
}

export interface ThinkAloudMarker {
  timestamp: string;
  sessionDuration: number;
  type: 'friction' | 'delight' | 'comment';
  text: string;
}
