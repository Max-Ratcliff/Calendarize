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
SCOPES = ['https://www.googleapis.com/auth/calendar.events']
CLIENT_SECRET_PATH = os.path.join(os.path.dirname(__file__), 'client_secret.json')

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

def push_event_to_calendar(service, event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pushes a formatted event to the primary Google Calendar.
    Expects event_data to have: title, description, start_time, end_time, time_zone
    """
    try:
        start_time = datetime.fromisoformat(event_data['start_time'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(event_data['end_time'].replace('Z', '+00:00'))

        # Standardize duration if missing
        if start_time == end_time:
            end_time = start_time + timedelta(hours=1)

        calendar_resource = {
            'summary': event_data['title'],
            'description': event_data['description'],
            'location': event_data.get('location', ''),
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': event_data.get('time_zone', 'UTC'),
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': event_data.get('time_zone', 'UTC'),
            },
        }

        # Handle attendees if provided
        if event_data.get('attendees'):
            calendar_resource['attendees'] = [{'email': email} for email in event_data['attendees']]

        # Handle recurrence if provided
        if event_data.get('is_recurring') and event_data.get('recurrence_pattern'):
            rrule = f"RRULE:FREQ={event_data['recurrence_pattern']}"
            calendar_resource['recurrence'] = [rrule]

        logger.info(f"Pushing event to Google: {event_data['title']}")
        return service.events().insert(calendarId='primary', body=calendar_resource).execute()
    except Exception as e:
        logger.exception("Failed to push event to Google Calendar")
        raise e
