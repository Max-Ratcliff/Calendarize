import time
import base64
from fastapi import FastAPI, File, UploadFile, Form, Request, Response, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
import shutil
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import os
from event_generation.nlp_parsers.gemini_parser import GeminiParser
from event_generation.event.event import Event
from utils.logger import logger
from utils.google_calendar import get_flow, get_calendar_service, push_event_to_calendar

app = FastAPI()
UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Configuration for OAuth
CALLBACK_URL = os.getenv("CALLBACK_URL", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://calendarize.ratcliff.cc", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time
    
    logger.info(
        f"{request.method} | {request.url.path} | {response.status_code} | {duration:.4f}s"
    )
    return response

# --- Google Calendar API Endpoints ---

@app.get("/auth/google/login")
async def google_login():
    """Starts the Google OAuth flow."""
    try:
        flow = get_flow(CALLBACK_URL)
        auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
        return {"url": auth_url}
    except Exception as e:
        logger.exception("Failed to start Google OAuth flow")
        raise HTTPException(status_code=500, detail=str(e))

# In-memory session store for Google OAuth tokens
# key: access_token, value: full credentials dict
token_sessions = {}

@app.get("/auth/google/callback")
async def google_callback(code: str, response: Response):
    """Handles the OAuth callback and stores the token in a session."""
    try:
        logger.info("Received Google OAuth callback")
        flow = get_flow(CALLBACK_URL)
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        token_dict = json.loads(creds.to_json())
        access_token = token_dict.get("token")
        
        if not access_token:
            raise Exception("Failed to obtain access token")
            
        # Store full credentials in memory, keyed by access_token
        token_sessions[access_token] = token_dict
        
        # Set the access_token in a cookie (much smaller, no base64 needed)
        is_prod = os.getenv("ENV") == "production"
        response.set_cookie(
            key="google_access_token",
            value=access_token,
            httponly=True, # Security: prevent XSS from reading the token
            secure=is_prod,
            samesite="lax" if not is_prod else "none",
            max_age=3600 * 24 * 7 # 1 week
        )
        
        logger.info(f"Successfully processed Google token for session: {access_token[:10]}...")
        
        return HTMLResponse(content=f"""
            <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                    <h2>Authentication Successful!</h2>
                    <p>This window will close automatically.</p>
                    <script>
                        try {{
                            if (window.opener) {{
                                window.opener.postMessage({{
                                    type: 'auth-success',
                                    token: '{access_token}'
                                }}, '*');
                            }}
                        }} catch (e) {{
                            console.error('Failed to postMessage to opener:', e);
                        }}
                        setTimeout(() => window.close(), 500);
                    </script>
                </body>
            </html>
        """)
    except Exception as e:
        logger.exception("OAuth Callback failed")
        return HTMLResponse(content=f"<html><body><p>Authentication failed: {str(e)}</p></body></html>", status_code=400)


@app.post("/google/push-event")
async def push_to_google(request: Request):
    """Pushes an event directly to the user's Google Calendar."""
    
    access_token = None
    auth_header = request.headers.get("Authorization")
    
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ", 1)[1].strip()
    else:
        access_token = request.cookies.get("google_access_token")

    if not access_token:
        logger.warning("Push attempted without token")
        raise HTTPException(status_code=401, detail="Not authenticated with Google")
    
    # Retrieve full credentials from session store
    token_dict = token_sessions.get(access_token)
    
    if not token_dict:
        logger.warning(f"Session not found for token: {access_token[:10]}...")
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please login again.")
    
    try:
        body = await request.json()
        service = get_calendar_service(token_dict)
        
        if not service:
            raise HTTPException(status_code=401, detail="Invalid or expired Google session")
            
        result = push_event_to_calendar(service, body)
        return {"status": "success", "htmlLink": result.get("htmlLink")}
    except Exception as e:
        logger.exception("Failed to push event")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Welcome to Calendarize",
        "description": "AI Calendar Event Generator"
    }

@app.post("/convert")
async def convert(
                file: Optional[UploadFile] = File(None),
                text: Optional[str] = Form(None),
                local_tz: str = Form(...),
                local_time: str = Form(...),
                ):
    file_path = None
    if file is not None:
        file_path = UPLOAD_FOLDER / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    if text is None:
        text = ""

    parser = GeminiParser()
    event_list = parser.parse(text, local_time, local_tz, file_path)

    if file_path is not None:
        try:
            file_path.unlink()
        except Exception as e:
            logger.error(f"Failed to remove file: {e}")

    if isinstance(event_list, list):
        for event in event_list:
            if event is not None:
                try:
                    event.set_gcal_link()
                    event.set_outlook_link()
                    event.set_ical_string()
                except Exception as e:
                    logger.exception(f"Failed to generate links for event: {event}")
    return event_list

@app.post("/edit")
async def edit(text: Optional[str] = Form(None)):
    if text is None:
        return {"error": "No event data provided."}
    try:
        event = json.loads(text)
        event_obj = Event(
            title=event.get("title"),
            start_time=event.get("start_time"),
            end_time=event.get("end_time"),
            location=event.get("location"),
            description=event.get("description"),
            recurrence_pattern=event.get("recurrence_pattern"),
            recurrence_days=event.get("recurrence_days"),
            recurrence_count=event.get("recurrence_count"),
            recurrence_end_date=event.get("recurrence_end_date"),
        )
        event_obj.set_gcal_link()
        event_obj.set_outlook_link()
        event_obj.set_ical_string()
        return event_obj
    except Exception as e:
        logger.exception("Failed to process event edit")
        return {"error": str(e)}
