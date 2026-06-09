"use client";
import React, { JSX } from "react"
import { CalendarEvent } from "@/app/types/CalendarEvent"
import { exportToGoogleCalendar, exportToICal, pushToGoogleCalendar, connectGoogle, disconnectGoogle } from "@/app/utils/calendarExport"
import { format, parseISO, isValid } from "date-fns"

export type ExportMethod = 'api' | 'ics' | 'manual' | null;

// ─── Utilities ────────────────────────────────────────────────────────────────

const SHORT_DAY: Record<string, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};

const CATEGORY_STYLE: Record<string, string> = {
  lecture:    'bg-[#218F98]/10 text-[#218F98]',
  lab:        'bg-orange-100 text-orange-700',
  discussion: 'bg-green-100 text-green-700',
  section:    'bg-blue-100 text-blue-700',
  meeting:    'bg-purple-100 text-purple-700',
  deadline:   'bg-red-100 text-red-700',
  appointment:'bg-yellow-100 text-yellow-700',
};

const formatDate = (date: string): string => {
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) throw new Error();
    return format(parsed, "EEEE, MMMM d, yyyy");
  } catch { return "Invalid date"; }
};

const formatCompactTime = (start: string, end: string, isAllDay?: boolean): string => {
  if (isAllDay) return 'TBA';
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (!isValid(s) || !isValid(e)) return 'TBA';
    if (s.getHours() === 0 && s.getMinutes() === 0 &&
        (e.getHours() === 0 || (e.getHours() === 23 && e.getMinutes() >= 58))) return 'TBA';
    return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  } catch { return 'TBA'; }
};

const getCourseName = (events: CalendarEvent[]): string => {
  const title = events[0]?.title || '';
  const category = events[0]?.event_category?.toLowerCase() || '';
  if (category) {
    const stripped = title.replace(new RegExp(`\\s+${category}$`, 'i'), '').trim();
    if (stripped && stripped !== title) return stripped;
  }
  const parts = title.split(' ');
  const last = parts[parts.length - 1]?.toLowerCase();
  if (['lecture', 'lab', 'laboratory', 'discussion', 'section'].includes(last)) {
    return parts.slice(0, -1).join(' ').trim();
  }
  return title;
};

// ─── Shared Sub-components ────────────────────────────────────────────────────

const CategoryBadge: React.FC<{ category?: string }> = ({ category }) => {
  const key = category?.toLowerCase() || '';
  const style = CATEGORY_STYLE[key] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${style}`}>
      {category || 'event'}
    </span>
  );
};

const TbaBadge: React.FC = () => (
  <span
    className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium"
    title="Time not yet scheduled — check your enrollment system for updates"
  >
    Time TBA
  </span>
);

// Inline editor shown when user clicks "Edit time" on a TBA event.
const TbaEditor: React.FC<{
  eventIdx: number;
  startTime: string;
  onSave: (eventIdx: number, updates: Partial<CalendarEvent>) => void;
}> = ({ eventIdx, startTime, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const dateStr = startTime.substring(0, 10); // "YYYY-MM-DD"

  const handleSave = () => {
    if (!start || !end) return;
    onSave(eventIdx, {
      start_time: `${dateStr}T${start}:00`,
      end_time: `${dateStr}T${end}:00`,
      is_all_day: false,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-xs text-amber-600 underline hover:text-amber-700 font-medium">
        Edit time
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <input type="time" value={start} onChange={e => setStart(e.target.value)}
        className="text-xs border border-[#218F98] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#218F98]" />
      <span className="text-xs text-[#6B909F]">–</span>
      <input type="time" value={end} onChange={e => setEnd(e.target.value)}
        className="text-xs border border-[#218F98] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#218F98]" />
      <button onClick={handleSave}
        className="text-xs px-2 py-0.5 bg-[#218F98] text-white rounded hover:bg-[#1a747b] transition-colors">
        Save
      </button>
      <button onClick={() => setEditing(false)}
        className="text-xs text-[#6B909F] underline hover:text-[#071E37]">
        Cancel
      </button>
    </div>
  );
};

// Method-aware export buttons for a single event row.
const ExportButtons: React.FC<{
  event: CalendarEvent;
  eventIdx: number;
  exportMethod?: ExportMethod;
  onEventUpdate?: (eventIdx: number, updates: Partial<CalendarEvent>) => void;
}> = React.memo(({ event, eventIdx, exportMethod, onEventUpdate }) => {
  const [isPushed, setIsPushed] = React.useState(false);
  const compactTime = formatCompactTime(event.start_time, event.end_time, event.is_all_day);
  const isTba = compactTime === 'TBA';

  const handlePush = async () => {
    try { await pushToGoogleCalendar(event); setIsPushed(true); } catch {}
  };

  // Bulk modes — no individual buttons; show TBA editor if needed
  if (exportMethod === 'api' || exportMethod === 'ics') {
    return isTba && onEventUpdate ? (
      <TbaEditor eventIdx={eventIdx} startTime={event.start_time} onSave={onEventUpdate} />
    ) : null;
  }

  // Manual mode — one "Add to Calendar" button (compose link, no auth needed)
  if (exportMethod === 'manual') {
    return (
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button onClick={() => exportToGoogleCalendar(event)}
          className="px-3 py-1 rounded text-xs font-medium text-white bg-[#218F98] hover:bg-[#1a747b] transition-colors">
          Add to Google Calendar
        </button>
        <button onClick={() => exportToICal(event)}
          className="px-3 py-1 rounded text-xs font-medium text-white bg-[#071E37] hover:bg-[#0d2d4f] transition-colors">
          Download .ics
        </button>
        {isTba && onEventUpdate && (
          <TbaEditor eventIdx={eventIdx} startTime={event.start_time} onSave={onEventUpdate} />
        )}
      </div>
    );
  }

  // Default — show all buttons
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      <button onClick={handlePush}
        className={`px-3 py-1 rounded text-xs font-medium text-white transition-colors ${isPushed ? 'bg-green-600 hover:bg-green-700' : 'bg-[#218F98] hover:bg-[#1a747b]'}`}>
        {isPushed ? 'Added' : 'Sync to Google'}
      </button>
      <button onClick={() => exportToGoogleCalendar(event)}
        className="px-3 py-1 rounded text-xs font-medium text-[#218F98] border border-[#218F98] bg-white hover:bg-[#218F98]/10 transition-colors">
        Google Link
      </button>
      <button onClick={() => exportToICal(event)}
        className="px-3 py-1 rounded text-xs font-medium text-white bg-[#071E37] hover:bg-[#0d2d4f] transition-colors">
        Outlook / Apple
      </button>
      {isTba && onEventUpdate && (
        <TbaEditor eventIdx={eventIdx} startTime={event.start_time} onSave={onEventUpdate} />
      )}
    </div>
  );
});
ExportButtons.displayName = 'ExportButtons';

// ─── Google Connection Badge ──────────────────────────────────────────────────

export const GoogleConnectionBadge: React.FC = () => {
  const [connected, setConnected] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  React.useEffect(() => {
    const check = () => setConnected(!!localStorage.getItem('google_token'));
    check();
    window.addEventListener('google-auth-changed', check);
    return () => window.removeEventListener('google-auth-changed', check);
  }, []);

  const handleClick = async () => {
    if (connected) {
      disconnectGoogle();
    } else {
      setConnecting(true);
      await connectGoogle();
      setConnecting(false);
    }
  };

  const dot = connecting ? 'bg-orange-400 animate-pulse' : connected ? 'bg-green-500' : 'bg-orange-400';
  const label = connecting ? 'Connecting…' : connected ? 'Google connected' : 'Connect Google';
  const textColor = connecting ? 'text-orange-500' : connected ? 'text-green-600' : 'text-orange-500';

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      title={connected ? 'Click to disconnect Google' : 'Click to connect Google'}
      className={`flex items-center gap-1.5 text-xs font-medium text-telegraf
        px-2 py-0.5 rounded-full border transition-colors duration-200 select-none
        ${connected
          ? 'border-green-200 bg-green-50 hover:bg-red-50 hover:border-red-200 hover:text-red-500 group'
          : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
        }
        disabled:cursor-wait`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className={`${textColor} ${connected ? 'group-hover:text-red-500' : ''}`}>
        {connected ? (
          <>
            <span className="group-hover:hidden">{label}</span>
            <span className="hidden group-hover:inline">Disconnect</span>
          </>
        ) : label}
      </span>
    </button>
  );
};

// ─── Standalone Event Card ────────────────────────────────────────────────────

export function GeneratedEventDisplay({ event, eventIdx, exportMethod, isChecked, onToggle, onEventUpdate }: {
  event: CalendarEvent;
  eventIdx: number;
  exportMethod?: ExportMethod;
  isChecked?: boolean;
  onToggle?: () => void;
  onEventUpdate?: (eventIdx: number, updates: Partial<CalendarEvent>) => void;
}): JSX.Element {
  const compactTime = React.useMemo(
    () => formatCompactTime(event.start_time, event.end_time, event.is_all_day),
    [event.start_time, event.end_time, event.is_all_day]
  );

  const days = event.recurrence_days?.length
    ? event.recurrence_days.map(d => SHORT_DAY[d.toUpperCase()] || d).join('/')
    : '';

  const timeDisplay = React.useMemo(() => {
    if (compactTime === 'TBA') return null;
    if (event.recurrence_type) return [days || null, compactTime].filter(Boolean).join(' · ');
    try {
      const s = parseISO(event.start_time);
      if (!isValid(s) || (s.getHours() === 0 && s.getMinutes() === 0)) return null;
      return format(s, "EEE, MMM d, yyyy 'at' h:mm a");
    } catch { return compactTime; }
  }, [event, compactTime, days]);

  const isBulk = exportMethod === 'api' || exportMethod === 'ics';

  return (
    <div className={`border-2 rounded-lg bg-white shadow-sm overflow-hidden transition-colors ${
      isBulk && isChecked === false ? 'border-gray-200 opacity-60' : 'border-[#218F98]'
    }`}>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-[#218F98]/5 border-b border-[#218F98]/20 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isBulk && onToggle && (
            <input type="checkbox" checked={isChecked ?? true} onChange={onToggle}
              className="w-4 h-4 accent-[#218F98] cursor-pointer shrink-0" />
          )}
          {event.event_category && <CategoryBadge category={event.event_category} />}
          <span className="font-bold text-[#071E37] heading-signika text-base md:text-lg truncate">{event.title}</span>
        </div>
      </div>
      <div className="px-4 md:px-6 py-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {timeDisplay && (
            <span className="text-sm text-[#6B909F]">
              {[timeDisplay, event.location || null].filter(Boolean).join(' · ')}
            </span>
          )}
          {!timeDisplay && event.location && (
            <span className="text-sm text-[#6B909F]">{event.location}</span>
          )}
          {compactTime === 'TBA' && <TbaBadge />}
          {event.recurrence_type && event.recurrence_end && (
            <span className="text-xs text-[#6B909F]/70">· Until {formatDate(event.recurrence_end)}</span>
          )}
        </div>
        {event.attendees.length > 0 && (
          <p className="text-xs text-[#6B909F]/80">{event.attendees.join(', ')}</p>
        )}
        {event.description && event.description.trim() && event.description.trim() !== ' ' && (
          <p className="text-xs text-[#6B909F]/80 leading-relaxed">{event.description}</p>
        )}
        <ExportButtons event={event} eventIdx={eventIdx} exportMethod={exportMethod} onEventUpdate={onEventUpdate} />
      </div>
    </div>
  );
}

// ─── Course Group Card ────────────────────────────────────────────────────────

const CourseSectionRow: React.FC<{
  event: CalendarEvent;
  eventIdx: number;
  isLast: boolean;
  exportMethod?: ExportMethod;
  onEventUpdate?: (eventIdx: number, updates: Partial<CalendarEvent>) => void;
}> = React.memo(({ event, eventIdx, isLast, exportMethod, onEventUpdate }) => {
  const compactTime = React.useMemo(
    () => formatCompactTime(event.start_time, event.end_time, event.is_all_day),
    [event.start_time, event.end_time, event.is_all_day]
  );

  const days = event.recurrence_days?.length
    ? event.recurrence_days.map(d => SHORT_DAY[d.toUpperCase()] || d).join('/')
    : '';

  return (
    <div className={`px-4 md:px-6 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={event.event_category} />
          <span className="text-sm text-[#6B909F]">
            {[days || null, compactTime !== 'TBA' ? compactTime : null, event.location || null]
              .filter(Boolean).join(' · ') || null}
          </span>
          {compactTime === 'TBA' && <TbaBadge />}
          {event.recurrence_end && (
            <span className="text-xs text-[#6B909F]/70">· Until {formatDate(event.recurrence_end)}</span>
          )}
        </div>
        {event.description && event.description.trim() && event.description.trim() !== ' ' && (
          <p className="text-xs text-[#6B909F]/80 leading-relaxed">{event.description}</p>
        )}
        <ExportButtons event={event} eventIdx={eventIdx} exportMethod={exportMethod} onEventUpdate={onEventUpdate} />
      </div>
    </div>
  );
});
CourseSectionRow.displayName = 'CourseSectionRow';

export function CourseGroupCard({ groupId, events, eventIndices, exportMethod, isChecked, onToggle, onEventUpdate }: {
  groupId: string;
  events: CalendarEvent[];
  eventIndices: number[];
  exportMethod?: ExportMethod;
  isChecked?: boolean;
  onToggle?: () => void;
  onEventUpdate?: (eventIdx: number, updates: Partial<CalendarEvent>) => void;
}): JSX.Element {
  const courseName = React.useMemo(() => getCourseName(events), [events]);
  const isBulk = exportMethod === 'api' || exportMethod === 'ics';

  return (
    <div className={`border-2 rounded-lg bg-white shadow-sm overflow-hidden transition-colors ${
      isBulk && isChecked === false ? 'border-gray-200 opacity-60' : 'border-[#218F98]'
    }`}>
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-[#218F98]/5 border-b border-[#218F98]/20 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isBulk && onToggle && (
            <input type="checkbox" checked={isChecked ?? true} onChange={onToggle}
              className="w-4 h-4 accent-[#218F98] cursor-pointer shrink-0" />
          )}
          <span className="font-bold text-[#071E37] heading-signika text-base md:text-lg">{groupId}</span>
          {courseName !== groupId && (
            <span className="text-[#6B909F] text-sm truncate">{courseName.replace(/^[A-Z0-9]+ -\s*/, '')}</span>
          )}
        </div>
      </div>
      {events.map((event, i) => (
        <CourseSectionRow
          key={i}
          event={event}
          eventIdx={eventIndices[i]}
          isLast={i === events.length - 1}
          exportMethod={exportMethod}
          onEventUpdate={onEventUpdate}
        />
      ))}
    </div>
  );
}
