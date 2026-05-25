import { trackClarityEvent, setClarityUserProperties } from './clarity';

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
      const classes = current.className.split(/\s+/).filter(c => c && !c.includes(':')).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
    
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
  
  if (interactiveTags.includes(tagName)) return true;

  if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
  if (el.hasAttribute('onclick') || el.hasAttribute('href')) return true;
  if (el.tabIndex >= 0) return true;

  if (typeof window !== 'undefined') {
    try {
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') return true;
    } catch {}
  }

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
): void {
  // 1. Dispatch custom event to Microsoft Clarity
  trackClarityEvent(eventName);

  // 2. Set tags for metadata to allow filtering in recordings
  if (metadata) {
    const tags: Record<string, string> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        tags[key] = String(value);
      }
    });
    setClarityUserProperties(tags);
  }

  if (targetSelector) {
    setClarityUserProperties({ last_clicked_selector: targetSelector });
  }

  console.log(`[Clarity Usability Tracker] Event: ${eventName}`, { metadata, x, y, targetSelector });
}

// Rage and Dead Click Detection
export function handleGlobalClick(e: MouseEvent): void {
  if (typeof window === 'undefined') return;

  const target = e.target as HTMLElement;
  const x = e.clientX;
  const y = e.clientY;
  const selector = getCssSelector(target);
  const now = Date.now();

  // 1. Click event
  logEvent('user_click', {
    click_x: x,
    click_y: y,
    click_tag: target.tagName,
    click_text: target.innerText?.substring(0, 30) || ''
  }, x, y, selector);

  // 2. Dead click detection
  const interactive = isElementInteractive(target);
  if (!interactive) {
    logEvent('dead_click', {
      dead_click_tag: target.tagName,
      dead_click_text: target.innerText?.substring(0, 30) || ''
    }, x, y, selector);
  }

  // 3. Rage click detection
  clickHistory.push({ timestamp: now, x, y, target });
  clickHistory = clickHistory.filter(c => now - c.timestamp <= RAGE_CLICK_MAX_DELAY);
  
  if (clickHistory.length >= RAGE_CLICK_THRESHOLD) {
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
        rage_clicks_count: clickHistory.length,
        rage_click_text: target.innerText?.substring(0, 30) || '',
        rage_click_interactive: String(interactive)
      }, x, y, selector);
      
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
    hover_duration_ms: duration,
    hover_duration_sec: +(duration / 1000).toFixed(2)
  });
  
  return duration;
}
