import { CalendarEvent } from "@/app/types/CalendarEvent";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.calendarize.ratcliff.cc';

export const exportToGoogleCalendar = (event: CalendarEvent) => {
	const url = event.gcal_link;
	window.open(url, "_blank");
};

// Singleton: if auth is already in progress, reuse the same promise instead of opening a second popup.
let _connectingPromise: Promise<string | null> | null = null;

// Opens a Google OAuth popup and resolves with the access token once auth completes.
// Passes any existing calendarId so the backend can reuse it instead of creating a duplicate.
export const connectGoogle = (): Promise<string | null> => {
    if (_connectingPromise) return _connectingPromise;

    _connectingPromise = (async () => {
        try {
            const authRes = await fetch(`${API_BASE_URL}/auth/google/login`, { credentials: 'include' });
            const { url } = await authRes.json();

            const width = 500, height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const popup = window.open(url, 'google-auth', `width=${width},height=${height},left=${left},top=${top}`);

            if (!popup) {
                toast.error("Please allow popups for direct Google Calendar integration.");
                return null;
            }

            return await new Promise<string | null>((resolve) => {
                const onMessage = (e: MessageEvent) => {
                    if (e.data?.type === 'auth-success') {
                        window.removeEventListener('message', onMessage);
                        const token: string | undefined = e.data.token;
                        const calendarId: string | undefined = e.data.calendarId;
                        if (token) {
                            localStorage.setItem('google_token', token);
                            if (calendarId) localStorage.setItem('google_calendar_id', calendarId);
                            window.dispatchEvent(new Event('google-auth-changed'));
                        }
                        resolve(token ?? null);
                    }
                };
                window.addEventListener('message', onMessage);
                // Resolve null after 5 minutes if the user closes the popup without completing auth
                setTimeout(() => { window.removeEventListener('message', onMessage); resolve(null); }, 300_000);
            });
        } catch {
            return null;
        } finally {
            _connectingPromise = null;
        }
    })();

    return _connectingPromise;
};

export const disconnectGoogle = () => {
    localStorage.removeItem('google_token');
    // Keep google_calendar_id — on reconnect the backend will verify and reuse it instead of creating a duplicate
    window.dispatchEvent(new Event('google-auth-changed'));
};

const fetchPush = (event: CalendarEvent, token: string | null) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const calendarId = localStorage.getItem('google_calendar_id');
    if (calendarId) headers['X-Calendar-Id'] = calendarId;
    return fetch(`${API_BASE_URL}/google/push-event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
        credentials: 'include',
    });
};

export const pushToGoogleCalendar = async (event: CalendarEvent, silent = false) => {
    try {
        let response = await fetchPush(event, localStorage.getItem('google_token'));

        if (response.status === 401) {
            const token = await connectGoogle();
            if (!token) return;
            response = await fetchPush(event, token);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to push to Google Calendar');
        }

        const data = await response.json();
        if (!silent) {
            toast.success(`"${event.title}" added to Google Calendar!`);
            const startDate = event.start_time.slice(0, 10).replace(/-/g, '');
            window.open(`https://calendar.google.com/calendar/r/week/${startDate.slice(0,4)}/${startDate.slice(4,6)}/${startDate.slice(6,8)}`, '_blank');
        }
        return data;
    } catch (error) {
        console.error('Error pushing to Google Calendar:', error);
        if (!silent) {
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        throw error;
    }
};

/**
 * Pushes all events to Google Calendar in batch.
 */
export const pushAllToGoogleCalendar = async (events: CalendarEvent[]) => {
    if (events.length === 0) return;

    const toastId = toast.loading(`Pushing ${events.length} events to Google Calendar...`);
    
    try {
        const results = await Promise.allSettled(
            events.map(event => pushToGoogleCalendar(event, true))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - successful;

        const earliestDate = events
            .map(e => e.start_time.slice(0, 10).replace(/-/g, ''))
            .sort()[0];
        const gcalWeekUrl = earliestDate
            ? `https://calendar.google.com/calendar/r/week/${earliestDate.slice(0,4)}/${earliestDate.slice(4,6)}/${earliestDate.slice(6,8)}`
            : 'https://calendar.google.com';

        if (failed === 0) {
            toast.success(`Successfully added all ${successful} events!`, { id: toastId });
            window.open(gcalWeekUrl, '_blank');
        } else if (successful > 0) {
            toast.warning(`Added ${successful} events, but ${failed} failed.`, { id: toastId });
            window.open(gcalWeekUrl, '_blank');
        } else {
            toast.error(`Failed to add all events. Please check your connection.`, { id: toastId });
        }
    } catch (error) {
        toast.error("An unexpected error occurred during batch push.", { id: toastId });
    }
};

export const downloadBundleICS = (events: CalendarEvent[]) => {
	const vevents = events
		.map(e => e.ics_string || '')
		.filter(Boolean)
		.flatMap(ics => ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [])
		.join('\r\n');

	if (!vevents) { toast.error('No events to download.'); return; }

	const bundle = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calendarize//EN\r\nCALSCALE:GREGORIAN\r\n${vevents}\r\nEND:VCALENDAR`;
	const blob = new Blob([bundle], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url; a.download = 'calendarize-events.ics';
	document.body.appendChild(a); a.click();
	document.body.removeChild(a); URL.revokeObjectURL(url);
	toast.success(`Downloaded ${events.length} event${events.length > 1 ? 's' : ''} as .ics bundle.`);
};

export const exportToICal = (event: CalendarEvent) => {
	// load the calendar string as a blob
	const icsContent = event.ics_string.replace(/\r?\n/g, "\r\n");
	const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
	// generate a URL and an anchor element`
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");

	const fileName = event.title.replace(/ /g, "_");

	anchor.href = url;
	anchor.download = `${fileName}.ics`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
};
