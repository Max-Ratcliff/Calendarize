import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from utils.logger import logger

# Configuration
SCOPES = [
    'https://www.googleapis.com/auth/calendar.app.created',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
]
# Container default; override with GOOGLE_CLIENT_SECRET_PATH for local dev
CLIENT_SECRET_PATH = os.getenv('GOOGLE_CLIENT_SECRET_PATH', '/app/utils/client_secret.json')

def get_flow(redirect_uri: str):
    """Creates a Google OAuth flow instance."""
    return Flow.from_client_secrets_file(
        CLIENT_SECRET_PATH,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )

def get_calendar_service(token_dict: Dict[str, Any]):
    """Builds a Google Calendar service from a token dictionary."""
    try:
        creds = Credentials.from_authorized_user_info(token_dict, SCOPES)
        
        if not creds.valid:
            if creds.expired and creds.refresh_token:
                logger.info("Refreshing expired Google API token")
                creds.refresh(GoogleRequest())
            else:
                return None
                
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        logger.exception("Failed to build Google Calendar service")
        return None

_BYDAY_TO_WEEKDAY = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}

def _advance_to_first_byday(dt: datetime, byday: list[str]) -> datetime:
    """Advance dt to the nearest date whose weekday appears in byday."""
    targets = {_BYDAY_TO_WEEKDAY[d] for d in byday if d in _BYDAY_TO_WEEKDAY}
    if not targets:
        return dt
    for i in range(7):
        candidate = dt + timedelta(days=i)
        if candidate.weekday() in targets:
            return candidate
    return dt


def push_event_to_calendar(service, event_data: Dict[str, Any], calendar_id: Optional[str]) -> Dict[str, Any]:
    """Pushes a formatted event to the app-owned Calendarize calendar."""
    if not calendar_id:
        raise ValueError("No Calendarize calendar ID available. Please disconnect and reconnect Google.")

    try:
        start_time = datetime.fromisoformat(event_data['start_time'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(event_data['end_time'].replace('Z', '+00:00'))
        duration = end_time - start_time

        if duration.total_seconds() <= 0:
            duration = timedelta(hours=1)

        # The frontend maps recurrence_pattern → recurrence_type and is_recurring is not sent.
        recurrence_pattern = (event_data.get('recurrence_pattern') or
                              event_data.get('recurrence_type') or '')
        is_recurring = event_data.get('is_recurring') or bool(recurrence_pattern)
        recurrence_days = event_data.get('recurrence_days') or []
        recurrence_end_date_str = (event_data.get('recurrence_end_date') or
                                   event_data.get('recurrence_end') or '')

        # If a weekly timed event's start date doesn't fall on one of its recurring days,
        # advance to the first matching day so Google Calendar shows the right occurrences.
        # (Skip for all-day/TBA events — their date is already correct as-is.)
        is_all_day_check = event_data.get('is_all_day', False) or (
            start_time.hour == 0 and start_time.minute == 0 and
            end_time.hour == 23 and end_time.minute >= 58
        )
        if is_recurring and recurrence_pattern == 'WEEKLY' and recurrence_days and not is_all_day_check:
            start_time = _advance_to_first_byday(start_time, recurrence_days)
            end_time = start_time + duration

        # Treat as all-day if flagged, or if Gemini defaulted to midnight→23:59 (TBA schedule entries)
        is_all_day = event_data.get('is_all_day', False) or (
            start_time.hour == 0 and start_time.minute == 0 and
            end_time.hour == 23 and end_time.minute >= 58
        )

        if is_all_day:
            start_str = start_time.strftime('%Y-%m-%d')
            end_str = (start_time + timedelta(days=1)).strftime('%Y-%m-%d')
            start_field = {'date': start_str}
            end_field = {'date': end_str}
        else:
            tz = event_data.get('time_zone', 'UTC')
            start_field = {'dateTime': start_time.isoformat(), 'timeZone': tz}
            end_field = {'dateTime': end_time.isoformat(), 'timeZone': tz}

        calendar_resource = {
            'summary': event_data['title'],
            'description': event_data.get('description', ''),
            'location': event_data.get('location', ''),
            'start': start_field,
            'end': end_field,
        }

        if event_data.get('attendees'):
            calendar_resource['attendees'] = [{'email': email} for email in event_data['attendees']]

        if is_recurring and recurrence_pattern:
            rrule = f"RRULE:FREQ={recurrence_pattern}"
            if recurrence_pattern == 'WEEKLY' and recurrence_days:
                rrule += f";BYDAY={','.join(recurrence_days)}"
            if event_data.get('recurrence_count'):
                rrule += f";COUNT={event_data['recurrence_count']}"
            if recurrence_end_date_str:
                end_dt = datetime.fromisoformat(recurrence_end_date_str.replace('Z', '+00:00'))
                rrule += f";UNTIL={end_dt.strftime('%Y%m%dT000000Z')}"
            calendar_resource['recurrence'] = [rrule]

        logger.info(f"Pushing event to Google: {event_data['title']}")
        return service.events().insert(calendarId=calendar_id, body=calendar_resource).execute()
    except Exception as e:
        logger.exception("Failed to push event to Google Calendar")
        raise e
