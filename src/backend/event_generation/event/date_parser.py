from datetime import datetime
from dateutil.parser import parse
from icalendar import vRecur  # Calendar, Event as IcalEvent
from utils.logger import logger

# from event_generation.event.event import Event


def parse_datetime(text: str) -> datetime:
    try:
        return parse(text)
    except ValueError as ve:
        logger.error(f"Error parsing datetime '{text}': {ve}")
        return None
    except Exception as e:
        logger.exception(f"Unexpected error parsing datetime '{text}'")
        return None


def parse_recurring_pattern(event) -> str:
    if event.is_recurring and event.recurrence_pattern:
        recurrence_rule = f"RRULE:FREQ={event.recurrence_pattern}"

        # Add specific days for weekly recurrence
        if event.recurrence_pattern == "WEEKLY" and event.recurrence_days:
            recurrence_rule += f";BYDAY={','.join(event.recurrence_days)}"

        # Add recurrence count if specified
        if event.recurrence_count:
            recurrence_rule += f";COUNT={event.recurrence_count}"

        # Add recurrence end date if specified
        if event.recurrence_end_date:
            recurrence_rule += f";UNTIL={event.recurrence_end_date.strftime('%Y%m%d')}"
    else:
        recurrence_rule = None  # No recurrence
    return recurrence_rule


def get_ical_rrule(event) -> vRecur:
    """Constructs the RRULE for iCalendar format."""
    if event.is_recurring and event.recurrence_pattern:
        rrule = {"FREQ": event.recurrence_pattern.upper()}  # "WEEKLY"

        # Add specific days (BYDAY) for weekly recurrence
        if event.recurrence_pattern.upper() == "WEEKLY" and event.recurrence_days:
            rrule["BYDAY"] = event.recurrence_days

        # Add recurrence count if specified
        if event.recurrence_count:
            rrule["COUNT"] = event.recurrence_count

        # Add recurrence end date if specified
        if event.recurrence_end_date:
            rrule["UNTIL"] = event.recurrence_end_date  # UTC format

        return vRecur(rrule)
    return None  # No recurrence
