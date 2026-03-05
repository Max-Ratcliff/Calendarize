import { CalendarEvent } from "@/app/types/CalendarEvent";
import { logger } from "@/app/lib/logger";

// Use environment variable with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.calendarize.ratcliff.cc';
const API_EVENT = API_BASE_URL + "/convert";


export const generateEvent = async (
									text: string,
									img?: File // <-- Make the file argument optional
									): Promise<CalendarEvent[]> => {
	try {
		const local_tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const local_time = new Date().toLocaleString("sv-SE", { timeZone: local_tz }).replace(" ", "T") + "Z";

		logger.info("Generating event request", { textSnippet: text.slice(0, 50), hasImage: !!img });
		logger.debug("Prompt data", { text, local_time, local_tz });

		const formData = new FormData();

		// Append text fields
		formData.append("text", text);
		formData.append("local_tz", local_tz);
		formData.append("local_time", local_time);

		// Only append the file if it was provided
		if (img) {
			logger.info(`Appending image file: ${img.name} (${img.size} bytes)`);
			formData.append("file", img);
		}

		logger.debug(`Sending request to backend: ${API_EVENT}`);

		const response = await fetch(API_EVENT, {
		method: "POST",
		body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.detail || `Server error: ${response.status} ${response.statusText}`;
			logger.error(`Backend error while generating event: ${errorMessage}`);
			throw new Error(errorMessage);
		}

		const data = await response.json();

		// Ensure response is a list of events
		if (!Array.isArray(data)) {
			logger.error("Unexpected response format from backend", { data });
			throw new Error("Invalid response format from server.");
		}

		// Map response events to CalendarEvent format
		const events: CalendarEvent[] = data.map((event) => ({
		title: event.title || "Sample Event",
		time_zone: event.time_zone || "America/Los_Angeles",
		start_time: event.start_time,
		end_time: event.end_time,
		description: event.description || "No description provided for this event.",
		location: event.location || "",
		attendees: event.attendees || [],
		recurrence_type: event.recurrence_pattern || "",
		recurrence_days: event.recurrence_days || [],
		recurrence_count: event.recurrence_count || 0,
		recurrence_end: event.recurrence_end_date || "",
		gcal_link: event.gcal_link || "",
		outlook_link: event.outlook_link || "",
		ics_string: event.ics || "",
		}));

		logger.info(`Successfully generated ${events.length} events`);
		logger.debug("Events data", { events });
		return events;
	} catch (error) {
		logger.error("Failed to generate event", error);
		throw error;
	}
};
