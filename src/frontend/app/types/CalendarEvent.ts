export interface CalendarEvent {
	title: string;
	time_zone: string;
	start_time: string;
	end_time: string;
	description: string;
	location: string;
	attendees: Array<string>;
	recurrence_type: string;
	recurrence_days: Array<string>;
	recurrence_count: number;
	recurrence_end: string;
	gcal_link: string;
	outlook_link: string;
	ics_string: string;
	is_all_day?: boolean;
	group_id?: string;
	event_category?: string;
}
