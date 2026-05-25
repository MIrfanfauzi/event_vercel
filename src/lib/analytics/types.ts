export interface UsabilitySession {
  participantId: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  browserName: string;
  operatingSystem: string;
  screenResolution: string; // "width x height"
  viewportSize: string; // "width x height"
  startTime: string; // ISO string
}
