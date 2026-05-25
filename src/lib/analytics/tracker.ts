import { UsabilityEvent, ThinkAloudMarker } from './types';
import { getSessionDuration } from './session';
import { trackClarityEvent } from './clarity';

let eventsCache: UsabilityEvent[] = [];
let thinkAloudCache: ThinkAloudMarker[] = [];
const eventListeners: ((event: UsabilityEvent) => void)[] = [];
const thinkAloudListeners: ((marker: ThinkAloudMarker) => void)[] = [];

// For rage click detection
interface ClickLog {
  timestamp: number;
  x: number;
  y: number;
  target: HTMLElement;
}
let clickHistory: ClickLog[] = [];
const RAGE_CLICK_MAX_DELAY = 1500; // ms
const RAGE_CLICK_THRESHOLD = 3; // clicks
const RAGE_CLICK_MAX_DISTANCE = 30; // pixels

// Helper to get CSS selector path of an element (for precise usability diagnostics)
export function getCssSelector(el: HTMLElement | null): string {
  if (!el) return 'unknown';
  if (el.id) return `#${el.id}`;
  
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    if (current.className) {
      // Clean up whitespace and classes
      const classes = current.className.split(/\s+/).filter(c => c && !c.includes(':')).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
    
    // Stop traversing if we reach body or layout wrappers to keep selectors readable
    if (current?.nodeName.toLowerCase() === 'body' || path.length >= 4) {
      break;
    }
  }
  return path.join(' > ');
}

// Check if element is interactive (button, links, inputs, or has cursor: pointer)
export function isElementInteractive(el: HTMLElement | null): boolean {
  if (!el) return false;

  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'label', 'option', 'details', 'summary'];
  const tagName = el.tagName.toLowerCase();
  
  // Direct tag check
  if (interactiveTags.includes(tagName)) return true;

  // Role and click checks
  if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
  if (el.hasAttribute('onclick') || el.hasAttribute('href')) return true;
  if (el.tabIndex >= 0) return true;

  // Check computed cursor style (e.g. if tailwind hover:text-teal-400 cursor-pointer is applied)
  if (typeof window !== 'undefined') {
    try {
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') return true;
    } catch {
      // Ignore style resolution errors
    }
  }

  // Traversal upwards to 3 levels (check if clicking a child inside a button/link)
  let parent = el.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    const parentTag = parent.tagName.toLowerCase();
    if (interactiveTags.includes(parentTag)) return true;
    if (parent.getAttribute('role') === 'button' || parent.hasAttribute('onclick') || parent.hasAttribute('href')) return true;
    if (typeof window !== 'undefined') {
      try {
        const style = window.getComputedStyle(parent);
        if (style.cursor === 'pointer') return true;
      } catch {}
    }
    parent = parent.parentElement;
    depth++;
  }

  return false;
}

export function logEvent(
  eventName: string,
  metadata?: Record<string, any>,
  x?: number,
  y?: number,
  targetSelector?: string
): UsabilityEvent {
  const eventId = `EV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const sessionDuration = getSessionDuration();
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : 'SERVER';

  const event: UsabilityEvent = {
    eventId,
    timestamp,
    sessionDuration,
    eventName,
    pageUrl,
    x,
    y,
    targetSelector,
    metadata
  };

  // Add to cache
  eventsCache.push(event);
  
  // Persist local storage backup
  if (typeof window !== 'undefined') {
    localStorage.setItem('eventseats_events_log', JSON.stringify(eventsCache));
  }

  // Log to Microsoft Clarity
  trackClarityEvent(eventName);

  // Notify listeners
  eventListeners.forEach(listener => listener(event));

  console.log(`[Usability Tracker] Event logged: ${eventName}`, event);
  return event;
}

export function logThinkAloud(type: 'friction' | 'delight' | 'comment', text: string): ThinkAloudMarker {
  const marker: ThinkAloudMarker = {
    timestamp: new Date().toISOString(),
    sessionDuration: getSessionDuration(),
    type,
    text
  };

  thinkAloudCache.push(marker);

  if (typeof window !== 'undefined') {
    localStorage.setItem('eventseats_think_aloud_log', JSON.stringify(thinkAloudCache));
  }

  // Also log it as a standard usability event for timeline analysis
  logEvent('think_aloud_marker', { type, text });

  thinkAloudListeners.forEach(listener => listener(marker));
  return marker;
}

// Subscribe to events
export function onEventLogged(callback: (event: UsabilityEvent) => void) {
  eventListeners.push(callback);
  return () => {
    const idx = eventListeners.indexOf(callback);
    if (idx !== -1) eventListeners.splice(idx, 1);
  };
}

export function onThinkAloudLogged(callback: (marker: ThinkAloudMarker) => void) {
  thinkAloudListeners.push(callback);
  return () => {
    const idx = thinkAloudListeners.indexOf(callback);
    if (idx !== -1) thinkAloudListeners.splice(idx, 1);
  };
}

// Retrieve cache
export function getEvents(): UsabilityEvent[] {
  if (eventsCache.length === 0 && typeof window !== 'undefined') {
    const stored = localStorage.getItem('eventseats_events_log');
    if (stored) {
      try {
        eventsCache = JSON.parse(stored);
      } catch {}
    }
  }
  return eventsCache;
}

export function getThinkAloudMarkers(): ThinkAloudMarker[] {
  if (thinkAloudCache.length === 0 && typeof window !== 'undefined') {
    const stored = localStorage.getItem('eventseats_think_aloud_log');
    if (stored) {
      try {
        thinkAloudCache = JSON.parse(stored);
      } catch {}
    }
  }
  return thinkAloudCache;
}

export function clearEvents(): void {
  eventsCache = [];
  thinkAloudCache = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('eventseats_events_log');
    localStorage.removeItem('eventseats_think_aloud_log');
  }
  console.log('[Usability Tracker] Local events logs cleared.');
}

// Rage and Dead Click Detection
export function handleGlobalClick(e: MouseEvent): void {
  if (typeof window === 'undefined') return;

  const target = e.target as HTMLElement;
  const x = e.clientX;
  const y = e.clientY;
  const selector = getCssSelector(target);
  const now = Date.now();

  // 1. Heatmap coordinate logging
  logEvent('user_click', {
    x,
    y,
    tagName: target.tagName,
    text: target.innerText?.substring(0, 30) || ''
  }, x, y, selector);

  // 2. Dead click detection
  const interactive = isElementInteractive(target);
  if (!interactive) {
    logEvent('dead_click', {
      x,
      y,
      tagName: target.tagName,
      className: target.className || '',
      text: target.innerText?.substring(0, 30) || ''
    }, x, y, selector);
  }

  // 3. Rage click detection
  clickHistory.push({ timestamp: now, x, y, target });
  
  // Prune clicks older than 1.5s
  clickHistory = clickHistory.filter(c => now - c.timestamp <= RAGE_CLICK_MAX_DELAY);
  
  if (clickHistory.length >= RAGE_CLICK_THRESHOLD) {
    // Check if clicks are close together and on similar targets
    let isRage = true;
    const firstClick = clickHistory[0];
    
    for (let i = 1; i < clickHistory.length; i++) {
      const c = clickHistory[i];
      const distance = Math.sqrt(Math.pow(c.x - firstClick.x, 2) + Math.pow(c.y - firstClick.y, 2));
      
      if (distance > RAGE_CLICK_MAX_DISTANCE) {
        isRage = false;
        break;
      }
    }

    if (isRage) {
      logEvent('rage_click', {
        clicksCount: clickHistory.length,
        x,
        y,
        isInteractive: interactive,
        targetText: target.innerText?.substring(0, 30) || ''
      }, x, y, selector);
      
      // Clear click history to prevent repeat rage clicks on next click
      clickHistory = [];
    }
  }
}

// Hover durations tracker state
const hoverStartTimes: Record<string, number> = {};

export function startHoverTimer(key: string): void {
  hoverStartTimes[key] = Date.now();
}

export function endHoverTimer(key: string, eventName: string, metadata?: Record<string, any>): number | null {
  const startTime = hoverStartTimes[key];
  if (!startTime) return null;
  
  const duration = Date.now() - startTime;
  delete hoverStartTimes[key];
  
  logEvent(eventName, {
    ...metadata,
    hoverDurationMs: duration,
    hoverDurationSeconds: +(duration / 1000).toFixed(2)
  });
  
  return duration;
}
