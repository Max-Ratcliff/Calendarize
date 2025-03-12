from fastapi import FastAPI, File, UploadFile, Form
import shutil
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
# from backend.event_generation.nlp_parsers.openai_parser import OpenAiParser
from event_generation.nlp_parsers.gemini_parser import GeminiParser


app = FastAPI()
UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://calendarize.tech", "https://calendarize.ratcliff.cc", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Calendarize - An AI Calendar Event Generator",
        "description": (
            "Calendarize converts images or text input into calendar events by using the OpenAI API "
            "to extract event details. You can then easily import the generated invite into your calendar application."
        )
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
    # Pass file_path (or None) to the parser
    event_list = parser.parse(text, local_time, local_tz, file_path)

    # Clean up the uploaded file
    if file_path is not None:
        try:
            file_path.unlink()
        except Exception as e:
            print("ERROR: could not remove file:", e)

    for event in event_list:
        print("event:", event)
        if event is not None:
            try:
                event.set_gcal_link()
                event.set_outlook_link()
                event.set_ical_string()
            except Exception as e:
                print("ERROR: could not generate links:", e, event)
    return event_list
