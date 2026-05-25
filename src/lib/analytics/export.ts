import { getEvents, getThinkAloudMarkers } from './tracker';
import { initializeSession } from './session';

function downloadFile(content: string, filename: string, contentType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJSON(): void {
  const session = initializeSession();
  const events = getEvents();
  const thinkAloud = getThinkAloudMarkers();

  const data = {
    exportTime: new Date().toISOString(),
    session,
    eventsCount: events.length,
    thinkAloudCount: thinkAloud.length,
    events,
    thinkAloudMarkers: thinkAloud
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const filename = `Usability_Report_${session.participantId}_${new Date().toISOString().split('T')[0]}.json`;
  
  downloadFile(jsonContent, filename, 'application/json');
}

export function exportToCSV(): void {
  const session = initializeSession();
  const events = getEvents();
  
  const headers = [
    'Event ID',
    'Participant ID',
    'Timestamp',
    'Session Duration (s)',
    'Event Name',
    'Page URL',
    'Target CSS Selector',
    'Click X',
    'Click Y',
    'Scroll Depth (%)',
    'Hover Duration (ms)',
    'Think-Aloud Type',
    'Think-Aloud Comment',
    'Extra Details'
  ];

  const rows = events.map(event => {
    // Extract common metadata for column mapping
    const scrollDepth = event.metadata?.scrollDepthPct || event.metadata?.scrollDepth || '';
    const hoverDuration = event.metadata?.hoverDurationMs || '';
    const thinkAloudType = event.eventName === 'think_aloud_marker' ? event.metadata?.type || '' : '';
    const thinkAloudComment = event.eventName === 'think_aloud_marker' ? event.metadata?.text || '' : '';
    
    // Create clean metadata representation without repeating columns
    const cleanMeta = { ...event.metadata };
    delete cleanMeta.scrollDepthPct;
    delete cleanMeta.scrollDepth;
    delete cleanMeta.hoverDurationMs;
    delete cleanMeta.hoverDurationSeconds;
    if (event.eventName === 'think_aloud_marker') {
      delete cleanMeta.type;
      delete cleanMeta.text;
    }
    
    const extraDetailsStr = Object.keys(cleanMeta).length > 0 
      ? JSON.stringify(cleanMeta).replace(/"/g, '""') 
      : '';

    return [
      event.eventId,
      session.participantId,
      event.timestamp,
      event.sessionDuration,
      event.eventName,
      event.pageUrl,
      event.targetSelector || '',
      event.x !== undefined ? event.x : '',
      event.y !== undefined ? event.y : '',
      scrollDepth,
      hoverDuration,
      thinkAloudType,
      thinkAloudComment,
      extraDetailsStr
    ];
  });

  // Convert array of arrays to CSV format, handling quotes and commas properly
  const csvContent = [
    // Prepend Session Metadata summary lines
    `# USABILITY TESTING SESSION REPORT`,
    `# Participant ID: ${session.participantId}`,
    `# Device Type: ${session.deviceType}`,
    `# Browser: ${session.browserName}`,
    `# Operating System: ${session.operatingSystem}`,
    `# Resolution: ${session.screenResolution}`,
    `# Viewport: ${session.viewportSize}`,
    `# Start Time: ${session.startTime}`,
    `# Export Time: ${new Date().toISOString()}`,
    ``,
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const valStr = String(val);
        if (valStr.includes(',') || valStr.includes('\n') || valStr.includes('"')) {
          return `"${valStr.replace(/"/g, '""')}"`;
        }
        return valStr;
      }).join(',')
    )
  ].join('\n');

  const filename = `Usability_Events_${session.participantId}_${new Date().toISOString().split('T')[0]}.csv`;
  
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}
