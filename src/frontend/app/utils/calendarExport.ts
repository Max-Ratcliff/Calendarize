import { CalendarEvent } from "@/app/types/CalendarEvent";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.calendarize.ratcliff.cc';

export const exportToGoogleCalendar = (event: CalendarEvent) => {
	const url = event.gcal_link;
	window.open(url, "_blank");
};

/**
 * Direct API Integration: Pushes the event directly to Google Calendar.
 */
export const pushToGoogleCalendar = async (event: CalendarEvent, silent = false) => {
    try {
        const token = localStorage.getItem('google_token');
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const promise = fetch(`${API_BASE_URL}/google/push-event`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(event),
            credentials: 'include',
        });

        if (!silent) {
            toast.promise(promise, {
                loading: `Adding "${event.title}" to Google Calendar...`,
                success: (response) => {
                    if (!response.ok) throw new Error();
                    return `"${event.title}" added successfully!`;
                },
                error: `Failed to add "${event.title}".`
            });
        }

        const response = await promise;

        if (response.status === 401) {
            // Not authenticated, start the login flow in a popup
            const authRes = await fetch(`${API_BASE_URL}/auth/google/login`, {
                credentials: 'include'
            });
            const { url } = await authRes.json();
            
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                url,
                'google-auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup) {
                toast.error("Please allow popups for direct Google Calendar integration.");
                return;
            }

            // Define listener
            const handleAuthMessage = (e: MessageEvent) => {
                if (e.data && e.data.type === 'auth-success') {
                    window.removeEventListener('message', handleAuthMessage);
                    
                    if (e.data.token) {
                        localStorage.setItem('google_token', e.data.token);
                    }
                    
                    toast.success("Authentication successful! Please click 'Push to Google' again.");
                }
            };

            window.addEventListener('message', handleAuthMessage);
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to push to Google Calendar');
        }

        const data = await response.json();
        if (data.htmlLink && !silent) {
            window.open(data.htmlLink, "_blank");
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

        if (failed === 0) {
            toast.success(`Successfully added all ${successful} events!`, { id: toastId });
            window.open('https://calendar.google.com', '_blank');
        } else if (successful > 0) {
            toast.warning(`Added ${successful} events, but ${failed} failed.`, { id: toastId });
            window.open('https://calendar.google.com', '_blank');
        } else {
            toast.error(`Failed to add all events. Please check your connection.`, { id: toastId });
        }
    } catch (error) {
        toast.error("An unexpected error occurred during batch push.", { id: toastId });
    }
};

export const exportToOutlook = (event: CalendarEvent) => {
	const url = event.outlook_link;
	window.open(url, "_blank");
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
