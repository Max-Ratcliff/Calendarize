import React, { JSX } from "react"
import { CalendarEvent } from "@/app/types/CalendarEvent"
import { exportToGoogleCalendar, exportToICal, pushToGoogleCalendar, pushAllToGoogleCalendar, connectGoogle, disconnectGoogle } from "@/app/utils/calendarExport"
import { format, parseISO, isValid } from "date-fns"

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
  } catch {
    return "Invalid date";
  }
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
  } catch {
    return 'TBA';
  }
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
    Time TBA ⚠
  </span>
);

const ExportButtons: React.FC<{ event: CalendarEvent }> = React.memo(({ event }) => {
  const [isPushed, setIsPushed] = React.useState(false);
  const handlePush = async () => {
    try { await pushToGoogleCalendar(event); setIsPushed(true); } catch {}
  };
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      <button onClick={handlePush}
        className={`px-3 py-1 rounded text-xs font-medium text-white transition-colors ${isPushed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
        {isPushed ? 'Added ✓' : 'Push →'}
      </button>
      <button onClick={() => exportToGoogleCalendar(event)}
        className="px-3 py-1 rounded text-xs font-medium text-white bg-[#218F98] hover:bg-[#1a747b] transition-colors">
        Google Link →
      </button>
      <button onClick={() => exportToICal(event)}
        className="px-3 py-1 rounded text-xs font-medium text-white bg-[#071E37] hover:bg-[#0d2d4f] transition-colors">
        Outlook / Apple →
      </button>
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

export function GeneratedEventDisplay({ event }: { event: CalendarEvent }): JSX.Element {
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

  return (
    <div className="border-2 border-[#218F98] rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-[#218F98]/5 border-b border-[#218F98]/20 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
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
        <ExportButtons event={event} />
      </div>
    </div>
  );
}

// ─── Course Group Card ────────────────────────────────────────────────────────

const CourseSectionRow: React.FC<{ event: CalendarEvent; isLast: boolean }> = React.memo(({ event, isLast }) => {
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
            {compactTime === 'TBA' && (
              <span className="ml-1">
                {(days || event.location) ? '· ' : ''}<TbaBadge />
              </span>
            )}
          </span>
          {event.recurrence_end && (
            <span className="text-xs text-[#6B909F]/70">· Until {formatDate(event.recurrence_end)}</span>
          )}
        </div>
        {event.description && event.description.trim() && event.description.trim() !== ' ' && (
          <p className="text-xs text-[#6B909F]/80 leading-relaxed">{event.description}</p>
        )}
        <ExportButtons event={event} />
      </div>
    </div>
  );
});
CourseSectionRow.displayName = 'CourseSectionRow';

export function CourseGroupCard({ groupId, events }: { groupId: string; events: CalendarEvent[] }): JSX.Element {
  const courseName = React.useMemo(() => getCourseName(events), [events]);

  return (
    <div className="border-2 border-[#218F98] rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-[#218F98]/5 border-b border-[#218F98]/20 gap-2 flex-wrap">
        <div className="min-w-0">
          <span className="font-bold text-[#071E37] heading-signika text-base md:text-lg">{groupId}</span>
          {courseName !== groupId && (
            <span className="ml-2 text-[#6B909F] text-sm truncate">{courseName.replace(/^[A-Z0-9]+ -\s*/, '')}</span>
          )}
        </div>
        <button
          onClick={() => pushAllToGoogleCalendar(events)}
          className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#218F98] hover:bg-[#1a747b] transition-colors whitespace-nowrap shrink-0"
        >
          Push All →
        </button>
      </div>
      {events.map((event, i) => (
        <CourseSectionRow key={i} event={event} isLast={i === events.length - 1} />
      ))}
    </div>
  );
}
