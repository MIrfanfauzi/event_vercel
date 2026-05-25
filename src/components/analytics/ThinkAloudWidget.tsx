'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/hooks';
import { exportToCSV, exportToJSON } from '@/lib/analytics/export';
import { getEvents, clearEvents, onEventLogged, onThinkAloudLogged } from '@/lib/analytics/tracker';
import { resetSession } from '@/lib/analytics/session';
import { 
  Play, 
  RotateCcw, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  MessageSquare, 
  Smile, 
  AlertTriangle, 
  Database,
  Trash2,
  X
} from 'lucide-react';

interface ThinkAloudWidgetProps {
  onClose: () => void;
}

export function ThinkAloudWidget({ onClose }: ThinkAloudWidgetProps) {
  const { participantId, changeParticipantId, trackThinkAloud, trackEvent } = useAnalytics();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingId, setEditingId] = useState(false);
  const [newIdVal, setNewIdVal] = useState('');
  const [sessionTime, setSessionTime] = useState('00:00');
  const [eventsCount, setEventsCount] = useState(0);
  const [customComment, setCustomComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state values on load
  useEffect(() => {
    setNewIdVal(participantId);
    setEventsCount(getEvents().length);
  }, [participantId]);

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      if (typeof window === 'undefined') return;
      const startStr = localStorage.getItem('eventseats_session_start_time');
      if (!startStr) {
        setSessionTime('00:00');
        return;
      }
      const startTime = new Date(startStr).getTime();
      const now = new Date().getTime();
      const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      
      const mins = Math.floor(diffSecs / 60).toString().padStart(2, '0');
      const secs = (diffSecs % 60).toString().padStart(2, '0');
      setSessionTime(`${mins}:${secs}`);
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    // Subscribe to event logs to show reactive count and simple recent activity list
    const unsubscribeEvents = onEventLogged((evt) => {
      setEventsCount(getEvents().length);
      setRecentLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${evt.eventName}`,
        ...prev.slice(0, 4)
      ]);
    });

    const unsubscribeThinkAloud = onThinkAloudLogged((marker) => {
      setRecentLogs(prev => [
        `[TA] ${marker.type.toUpperCase()}: "${marker.text}"`,
        ...prev.slice(0, 4)
      ]);
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      unsubscribeEvents();
      unsubscribeThinkAloud();
    };
  }, []);

  const handleSaveParticipantId = () => {
    if (newIdVal.trim()) {
      changeParticipantId(newIdVal.trim());
      setEditingId(false);
    }
  };

  const handleResetTimer = () => {
    if (window.confirm('Reset session timer? This restarts elapsed time measurement.')) {
      resetSession();
      trackEvent('session_timer_reset');
    }
  };

  const handleLogThinkAloud = (type: 'friction' | 'delight' | 'comment', text: string) => {
    trackThinkAloud(type, text);
    if (type === 'comment') {
      setCustomComment('');
      setShowCommentInput(false);
    }
  };

  const handleClearLogs = () => {
    clearEvents();
    setEventsCount(0);
    setRecentLogs([`[System] Local logs cleared.`]);
    setShowClearConfirm(false);
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-[99999] bg-slate-900 border border-slate-700 hover:border-teal-400 text-white rounded-full p-4 shadow-2xl cursor-pointer flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
        title="Expand Usability Test Controls"
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-950">
          {eventsCount}
        </div>
        <Settings className="w-6 h-6 text-teal-400 group-hover:rotate-45 transition-transform duration-300" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[99999] w-80 bg-slate-950/90 border border-slate-800 backdrop-blur-md rounded-[24px] text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden font-sans flex flex-col transition-all duration-300 animate-fade-in border-t-2 border-t-teal-500">
      
      {/* Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></div>
          <h3 className="text-xs font-black uppercase tracking-widest text-teal-400">Usability Analytics</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Minimize"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
            title="Disable Testing Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Participant ID Section */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Participant ID</label>
          {editingId ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newIdVal}
                onChange={(e) => setNewIdVal(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 w-full font-bold"
              />
              <button 
                onClick={handleSaveParticipantId}
                className="px-3 bg-teal-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-teal-400 transition-all"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-teal-300">{participantId}</span>
              <button 
                onClick={() => setEditingId(true)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Live Timer & Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Session Timer</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black font-mono text-emerald-400">{sessionTime}</span>
              <button 
                onClick={handleResetTimer}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Restart Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Logs Captured</span>
            <span className="text-lg font-black text-blue-400">{eventsCount} <span className="text-xs font-semibold text-slate-500">events</span></span>
          </div>
        </div>

        {/* Think-Aloud Markers Panel */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Think-Aloud Markers</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleLogThinkAloud('friction', 'Participant expressed confusion / difficulty')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-950/40 border border-red-900/50 hover:bg-red-900/20 text-red-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Friction
            </button>
            <button 
              onClick={() => handleLogThinkAloud('delight', 'Participant expressed satisfaction / ease')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-900/20 text-emerald-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <Smile className="w-3.5 h-3.5" />
              Delight
            </button>
          </div>
          
          {showCommentInput ? (
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2 animate-fade-in">
              <input 
                type="text" 
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                placeholder="Type participant feedback..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <div className="flex justify-end gap-1.5">
                <button 
                  onClick={() => setShowCommentInput(false)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleLogThinkAloud('comment', customComment)}
                  className="px-3 py-1 bg-teal-500 text-slate-950 rounded-md text-[10px] font-bold hover:bg-teal-400 transition-all"
                  disabled={!customComment.trim()}
                >
                  Log Comment
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowCommentInput(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              Log Verbal Comment...
            </button>
          )}
        </div>

        {/* Recent logs activity */}
        {recentLogs.length > 0 && (
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 space-y-1">
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest block">Live Feed</span>
            <div className="space-y-1 font-mono text-[9px] text-slate-400 max-h-20 overflow-y-auto">
              {recentLogs.map((log, idx) => (
                <div key={idx} className="truncate border-l border-slate-800 pl-1.5 leading-normal" title={log}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Exports */}
        <div className="space-y-2 pt-2 border-t border-slate-900">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Export Logs</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center gap-1.5 py-2 bg-teal-500 text-slate-950 hover:bg-teal-400 rounded-xl text-xs font-bold transition-all hover:shadow-lg hover:shadow-teal-500/10 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Format
            </button>
            <button 
              onClick={exportToJSON}
              className="flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              JSON Format
            </button>
          </div>
        </div>

        {/* System Reset */}
        <div className="pt-1">
          {showClearConfirm ? (
            <div className="flex gap-2 animate-fade-in">
              <button 
                onClick={handleClearLogs}
                className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                Yes, Clear All Logs
              </button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-slate-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Local Cache
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
