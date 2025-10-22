"""
Google Calendar Integration API
Provides endpoints for authenticating with Google and managing calendar events.
"""
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union

from fastapi import FastAPI, Response, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel, validator
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class EventRequest(BaseModel):
    title: str
    description: str
    start_time: str
    end_time: str


app = FastAPI()


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the scopes (permissions) your app needs
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# Get the absolute path to the client_secret.json file
CLIENT_SECRET_PATH = os.path.join(os.path.dirname(__file__), 'client_secret.json')
print(f"Looking for client_secret.json at: {CLIENT_SECRET_PATH}")


# Helper function to authenticate the user
def authenticate_google(request: Request, response: Response):
    try:
        creds = None
        token_json = request.cookies.get('google_auth_token')

        if token_json:
            print("Found existing token in cookies")
            creds = Credentials.from_authorized_user_info(json.loads(token_json), SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print("Refreshing expired token")
                creds.refresh(GoogleRequest())
                # Update cookie if we have a response object
                if response:
                    response.set_cookie(
                        key='google_auth_token',
                        value=creds.to_json(),
                        httponly=True,
                        secure=ENV != "development",
                        samesite='lax',
                        max_age=3600
                    )

                print("Starting OAuth flow")
                flow = InstalledAppFlow.from_client_secrets_file(
                    CLIENT_SECRET_PATH, SCOPES)
                flow.redirect_uri = 'http://localhost:8004/callback'
                creds = flow.run_local_server(port=8004)
                print("OAuth flow completed successfully")

            response.set_cookie(
                key='google_auth_token',
                value=creds.to_json(),
                httponly=True,
                secure=False,
                samesite='lax',
                max_age=3600
            )
            print("Set new token in cookies")
        return creds
    except Exception as e:
        logger.error(f"Error getting credentials: {str(e)}")
        return None


@app.post('/add-event')
async def add_event(request: Request, response: Response, event: EventRequest):
    try:
        print(f"Received event: {event}")
        creds = authenticate_google(request, response)

        # Parse the datetime strings
        start_time = datetime.fromisoformat(event.start_time)
        end_time = datetime.fromisoformat(event.end_time)

        # If start and end time are the same, add 1 hour duration
        if start_time == end_time:
            end_time = start_time + timedelta(hours=1)

        service = build('calendar', 'v3', credentials=creds)

        calendar_event = {
            'summary': event.title,
            'description': event.description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/Los_Angeles',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/Los_Angeles',
            },
        }

        print(f"Creating event: {json.dumps(calendar_event, default=str)}")
        created_event = service.events().insert(calendarId='primary', body=calendar_event).execute()
        print(f"Event created successfully with ID: {created_event.get('id')}")

        return {
            "message": f"Event created: {created_event.get('htmlLink')}",
            "eventId": created_event.get('id'),
            "htmlLink": created_event.get('htmlLink')
        }
    except HttpError as e:
        logger.error(f"Google API error: {str(e)}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.delete('/delete-event/{event_id}')
async def delete_event(
    event_id: str, 
    request: Request, 
    response: Response,
    credentials: Credentials = Depends(require_auth)
):
    """Delete an event from Google Calendar"""
    try:
        creds = authenticate_google(request, response)
        service = build('calendar', 'v3', credentials=creds)

        service.events().delete(calendarId='primary', eventId=event_id).execute()
        logger.info(f"Event {event_id} deleted successfully")
        
        return {"message": "Event deleted successfully"}
    except HttpError as e:
        logger.error(f"Google API error: {str(e)}")
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting event: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get('/login')
async def login(request: Request, response: Response):
    """Start the OAuth flow by redirecting to Google's authorization page"""
    try:
        # Check for client secret file
        if not os.path.exists(CLIENT_SECRET_PATH):
            logger.error(f"Client secret file not found at {CLIENT_SECRET_PATH}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Client secret file not found"
            )
        
        logger.info("Starting OAuth flow")
        
        # Create OAuth flow
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_PATH, SCOPES)
        flow.redirect_uri = CALLBACK_URL
        
        # Generate authorization URL with forced prompt
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Force user consent each time
        )
        
        logger.info(f"Redirecting to auth URL: {auth_url}")
        
        # Redirect to Google's auth page
        return RedirectResponse(url=auth_url)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get('/callback')
async def callback(request: Request, response: Response):
    """Handle the OAuth callback from Google"""
    try:
        authenticate_google(request, response)
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication Successful</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
                .success { color: green; font-size: 24px; margin-bottom: 20px; }
                .message { margin-bottom: 30px; }
                .button { background-color: #4CAF50; border: none; color: white; padding: 15px 32px;
                         text-align: center; text-decoration: none; display: inline-block;
                         font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px; }
            </style>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.close();
                    }, 3000);
                };
            </script>
        </head>
        <body>
            <div class="success">✓ Authentication Successful!</div>
            <div class="message">You can now close this window and return to the app.</div>
            <div>This window will close automatically in 3 seconds.</div>
            <button class="button" onclick="window.close()">Close Window</button>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Callback error: {str(e)}")
        return HTMLResponse(
            content=create_error_page(str(e)),
            status_code=status.HTTP_401_UNAUTHORIZED
        )

@app.get('/check-auth', response_model=AuthStatus)
async def check_auth(request: Request, response: Response):
    """Check if the user is authenticated with Google"""
    try:
        creds = get_credentials(request, response)
        if not creds:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Get user info if available
        email = getattr(creds, 'id_token', {}).get('email', 'Unknown') if hasattr(creds, 'id_token') else None
        expires = creds.expiry.isoformat() if hasattr(creds, 'expiry') else None
        
        return {
            "status": "authenticated",
            "email": email,
            "expires": expires
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get('/logout')
async def logout(response: Response):
    """Log out the user by clearing credentials"""
    response.delete_cookie('google_auth_token')
    logger.info("User logged out")
    return {"message": "Logged out successfully"}

@app.get('/')
async def root():
    """Root endpoint with API information"""
    return {
        "api": "Google Calendar Integration API",
        "version": "1.0.0",
        "docs": "/docs" if DEBUG else "Disabled in production"
    }

# Health check endpoint
@app.get('/health')
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == '__main__':
    # Verify client secret file exists
    if not os.path.exists(CLIENT_SECRET_PATH):
        logger.error(f"Client secret file not found at: {CLIENT_SECRET_PATH}")
        print(f"ERROR: client_secret.json not found at: {CLIENT_SECRET_PATH}")
    else:
        logger.info(f"Client secret file found at: {CLIENT_SECRET_PATH}")
        print(f"Starting server. Client secret found at: {CLIENT_SECRET_PATH}")
    
    import uvicorn
    uvicorn.run(
        app, 
        host=API_HOST, 
        port=API_PORT,
        log_level="info"
    )
