import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field
import event_generation.event.date_parser as dp
from icalendar import Event as IcalEvent, Calendar, Timezone, TimezoneStandard, TimezoneDaylight
from urllib.parse import quote
from zoneinfo import ZoneInfo


def offset_to_timedelta(offset_str: str) -> timedelta:
    # Convert a string in the format '+HHMM' or '-HHMM' to a timedelta
    sign = 1 if offset_str[0] == '+' else -1
    hours = int(offset_str[1:3])
    minutes = int(offset_str[3:5])
    return timedelta(hours=sign * hours, minutes=sign * minutes)


class Event(BaseModel):
    # pydantic model for event data
    # allows easy packing and unpacking into JSON
    # event.json()

    # Mandatory fields:
    title: str = "No Title"
    time_zone: str = "America/Los_Angeles"
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: datetime = Field(default_factory=datetime.now)
    is_all_day: bool = False
    is_recurring: bool = False

    # Optional fields:
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    recurrence_pattern: Optional[str] = ""
    recurrence_days: Optional[List[str]] = None
    recurrence_count: Optional[int] = None
    recurrence_end_date: Optional[datetime] = None
    gcal_link: Optional[str] = None
    outlook_link: Optional[str] = None
    yahoo_link: Optional[str] = None
    ics: Optional[str] = None

    def set_ical_string(self):
        cal = Calendar()
        cal.add("prodid", "-//Calendarize//calendarize.ratcliff.cc//EN")
        cal.add("version", "2.0")

        # Create the VTIMEZONE component for America/Los_Angeles
        tz = Timezone()
        tz.add("tzid", self.time_zone)

        # Get dynamic time zone info using ZoneInfo
        tzinfo = ZoneInfo(self.time_zone)
        # Representative dates: one for winter and one for summer
        winter_dt = datetime(2021, 1, 1, 0, 0, 0, tzinfo=tzinfo)
        summer_dt = datetime(2021, 7, 1, 0, 0, 0, tzinfo=tzinfo)

        winter_offset = winter_dt.strftime('%z')  # e.g. "-0800"
        summer_offset = summer_dt.strftime('%z')  # e.g. "-0700" if DST is observed

        if winter_offset == summer_offset:
            # Time zone does not observe DST; only a STANDARD block is needed.
            tz_standard = TimezoneStandard()
            tz_standard.add("dtstart", datetime(1970, 1, 1, 0, 0, 0))
            tz_standard.add("tzoffsetfrom", offset_to_timedelta(winter_offset))
            tz_standard.add("tzoffsetto", offset_to_timedelta(winter_offset))
            tz_standard.add("tzname", winter_dt.tzname() or self.time_zone)
            tz.add_component(tz_standard)
        else:
            # Time zone observes DST; add both STANDARD and DAYLIGHT blocks.
            tz_standard = TimezoneStandard()
            tz_standard.add("dtstart", datetime(1970, 1, 1, 0, 0, 0))
            tz_standard.add("tzoffsetfrom", offset_to_timedelta(winter_offset))
            tz_standard.add("tzoffsetto", offset_to_timedelta(winter_offset))
            tz_standard.add("tzname", winter_dt.tzname() or self.time_zone)
            tz.add_component(tz_standard)

            tz_daylight = TimezoneDaylight()
            tz_daylight.add("dtstart", datetime(1970, 7, 1, 0, 0, 0))
            tz_daylight.add("tzoffsetfrom", offset_to_timedelta(winter_offset))
            tz_daylight.add("tzoffsetto", offset_to_timedelta(summer_offset))
            tz_daylight.add("tzname", summer_dt.tzname() or self.time_zone)
            tz.add_component(tz_daylight)

        cal.add_component(tz)

        event = IcalEvent()  # Create an event object

        # Title
        event.add("summary", self.title)

        # Start and end times
        dtstart = self.start_time if self.start_time.tzinfo else self.start_time.replace(tzinfo=ZoneInfo(self.time_zone))
        dtend = self.end_time if self.end_time.tzinfo else self.end_time.replace(tzinfo=ZoneInfo(self.time_zone))
        event.add("dtstart", dtstart)
        event.add("dtend", dtend)
        # event.add("dtstart", self.get_start_time())
        # event.add("dtend", self.get_end_time())

        # time file creation time stamp
        event.add("dtstamp", datetime.now())

        # Other optional fields:
        if self.location:
            event.add("location", self.location)
        if self.description:
            event.add("description", self.description)
        # Ensure a globally unique event ID
        event.add("uid", str(uuid.uuid4()))

        # Add attendees if available
        if self.attendees:
            for attendee in self.attendees:
                event.add("attendee", f"mailto:{attendee}")

        # Add recurrence rule if the event is recurring
        rrule = dp.get_ical_rrule(self)
        if rrule:
            event["RRULE"] = rrule

        # Add the event to the calendar
        cal.add_component(event)

        ical_str = cal.to_ical().decode('utf-8')
        self.ics = ical_str

    def set_gcal_link(self):
        # parsed_event.write_to_icalevent("test.ics")
        # https://calendar.google.com/calendar/render?action=TEMPLATE
        # &text=AM%20112%20-%20Intro%20to%20PDEs%20Lecture
        # &dates=20250130T232000Z/20250131T005500Z
        # &details=Lecture%20for%20AM%20112%20-%20Intro%20to%20Partial%20Differential%20Equations.
        # &location=Porter%20Acad%20144
        # &ctz=America/Los_Angeles
        recurrence_rule = dp.parse_recurring_pattern(self)

        start = self.get_start_time()
        end = self.get_end_time()
        if self.is_all_day:
            # first 8 characters of the date string
            # YYYYMMDD
            start = start[:8]
            end = end[:8]

        gcal_link = (
            f"https://www.google.com/calendar/render?action=TEMPLATE"
            f"&text={self.title}"
            f"&dates={start}/{end}"
        )
        if self.description:
            gcal_link += f"&details={self.description}"
        if self.location:
            gcal_link += f"&location={self.location}"
        if self.attendees:
            gcal_link += f"&add={','.join(self.attendees)}"

        gcal_link += f"&ctz={self.time_zone}"

        if recurrence_rule:
            gcal_link += f"&recur={recurrence_rule}"

        gcal_link = gcal_link.replace(" ", "+")
        self.gcal_link = gcal_link

    def set_outlook_link(self):
        # Parse recurrence rule if needed
        recurrence_rule = dp.parse_recurring_pattern(self)

        # Ensure proper datetime format for outlook links (ISO 8601)
        # Parse the non-standard date string using strptime:
        sdt = datetime.strptime(self.get_start_time(), "%Y%m%dT%H%M%S")
        edt = datetime.strptime(self.get_start_time(), "%Y%m%dT%H%M%S")
        # Convert the time to UTC
        # (this assumes that the parsed datetime is in the local timezone)
        utc_sdt = sdt.astimezone(ZoneInfo("UTC"))
        utc_edt = edt.astimezone(ZoneInfo("UTC"))

        # Format it to the string Outlook expects:
        start_dt = utc_sdt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_dt = utc_edt.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Base Outlook link
        outlook_link = (
            f"https://outlook.live.com/owa/?path=/calendar/action/"
            f"compose&rru=addevent"
            f"&subject={quote(self.title)}"
            f"&startdt={start_dt}"
            f"&enddt={end_dt}"
        )

        # Add optional details with proper URL encoding
        if self.description:
            outlook_link += f"&body={quote(self.description)}"
        if self.location:
            outlook_link += f"&location={quote(self.location)}"
            # URL-encode attendees list
        if self.attendees:
            outlook_link += f"&to={quote(','.join(self.attendees))}"

        # Handle recurrence if applicable
        # TODO may need to fix the recurrence rule format
        if recurrence_rule:
            outlook_link += f"&recurrence={quote(recurrence_rule)}"

        # Assign to object
        self.outlook_link = outlook_link

    def get_start_time(self):
        # if it's an all day event then dont include the time so that gcal marks it as "all day"
        # if self.is_all_day:
        #     start_str = self.start_time.strftime("%Y%m%d")
        # else:

        start_str = self.start_time.strftime("%Y%m%dT%H%M%S")
        return start_str

    def get_end_time(self):
        # if self.is_all_day:
        #     end_str = self.end_time.strftime("%Y%m%d")
        # else:
        end_str = self.end_time.strftime("%Y%m%dT%H%M%S")
        return end_str

    def get_end_date(self):
        end_str = self.recurrence_end_date.strftime("%Y%m%d")
        return end_str

    def __str__(self):
        event_str = f"Title: {self.title}\n"
        event_str += f"Is All Day: {self.is_all_day}\n"
        if not self.is_all_day:
            event_str += f"Start Time: {self.start_time}\n"
            event_str += f"End Time: {self.end_time}\n"
        event_str += f"Time Zone: {self.time_zone}\n"
        if self.description:
            event_str += f"Description: {self.description}\n"
        if self.location:
            event_str += f"Location: {self.location}\n"
        if self.attendees:
            event_str += f"Attendees: {self.attendees}\n"
        event_str += f"Is Recurring: {self.is_recurring}\n"
        if self.is_recurring:
            event_str += f"Recurrence Pattern: {self.recurrence_pattern}\n"
            event_str += f"Recurrence Days: {self.recurrence_days}\n"
            event_str += f"Recurrence Count: {self.recurrence_count}\n"
            event_str += f"Recurrence End Date: {self.recurrence_end_date}\n"
        if self.gcal_link:
            event_str += f"Google Calendar Link: {self.gcal_link}\n\n"
        if self.outlook_link:
            event_str += f"Outlook Calendar Link: {self.outlook_link}\n\n"
        if self.yahoo_link:
            event_str += f"Yahoo Calendar Link: {self.yahoo_link}\n\n"
        if self.ics:
            event_str += f"iCal String: {self.ics}\n\n"

        return event_str
