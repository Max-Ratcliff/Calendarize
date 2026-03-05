# Standard library imports
from datetime import datetime
import json
import logging
import traceback
import base64

# Third-party imports
from google import genai as Gemini
from google.genai import types
from pydantic import ValidationError

# Local application imports
from event_generation.event.event import Event
from event_generation.event.date_parser import parse_datetime
from event_generation.config.readenv import get_gemini_key
from utils.logger import logger

# private Helper function to encode the image
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


class Parser:
    def __init__(self):
        self.client = Gemini.Client(api_key=get_gemini_key())
        self.model = "gemini-2.5-flash-lite"
        logger.info(f"Parser initialized with model: {self.model}")

    def parse(self, text, local_time, local_tz, image_path=None):
        # send request to API to extract event details into a JSON object
        try:
            # get current time up to the minute for relative date calculations
            time_info = datetime.strptime(local_time, "%Y-%m-%dT%H:%M:%SZ")
            time_info = time_info.strftime("%H:%M:%S %A, %B %d, %Y")
            current_time_zone = local_tz

            prompt = f"""You are an AI that extracts structured event details from text.
                        Use the Information about the current time: **{time_info}** and the current timezone is: **{current_time_zone}**.

                        **Important Instructions:**
                        - It is important **to always put a date in the future** unless it specifies a date in the past.
                        - If a date is relative, convert it into an absolute datetime based on the current time.
                        - If a date is given without a time, assume it is an all day event.
                        - If the date is given in a range, assume it's a multi-day all day event.
                        - 24:00 is not a valid time always default to use 23:59 instead.
                        - **If there appear to be multiple events in the text, extract all of them into separate events.**
                        - **If an image is passed, interpret the image and extract all details.**

                        Extract and return in JSON format:
                        - title: str (required)
                        - is_all_day: bool
                        - start_time: ISO 8601 (required)
                        - end_time: ISO 8601 (required)
                        - time_zone: str (required)
                        - description: Optional[str]
                        - location: Optional[str]
                        - attendees: Optional[List[str]]
                        - is_recurring: bool
                        - recurrence_pattern: Optional[str] (DAILY, WEEKLY, MONTHLY, YEARLY)
                        - recurrence_days: Optional[List[str]] (MO, TU, WE, TH, FR, SA, SU)
                        - recurrence_count: Optional[int]
                        - recurrence_end_date: Optional[str] (YYYYMMDD)

                        If any field is missing, return null.
                        """
            
            logger.debug(f"Time Info: {time_info} | Current Timezone: {current_time_zone}")

            # If the user provided an image_path, read bytes and create a Part object
            if image_path:
                logger.info(f"Parsing image: {image_path}")

                # Read the image bytes
                with open(image_path, "rb") as f:
                    image_bytes = f.read()

                # Create a Part object for the image
                image_part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )

                logger.debug("Waiting on response from Gemini API (with image)...")

                response = self.client.models.generate_content(
                    model=self.model,
                    config=types.GenerateContentConfig(system_instruction=prompt),
                    contents=[text, image_part],
                )

            else:
                logger.debug("Waiting on response from Gemini API (text-only)...")
                response = self.client.models.generate_content(
                    model=self.model,
                    config=types.GenerateContentConfig(system_instruction=prompt),
                    contents=[text],
                )

        except Exception as e:
            logger.exception("Unexpected error during API call")
            return f"An unexpected error occurred: {e}"

        # Parse the response into a JSON object
        try:
            raw_text = response.candidates[0].content.parts[0].text
            
            if raw_text.startswith("```json"):
                raw_text = raw_text[len("```json"):].strip()
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

            clean_text = raw_text
            event_data = json.loads(clean_text)
            
            if not isinstance(event_data, dict) or "events" not in event_data:
                 logger.error(f"Unexpected JSON structure. Got: {type(event_data)}")
                 return "The AI returned data in an unexpected format."

            event_list = []
            for event in event_data["events"]:
                if not isinstance(event, dict):
                    continue
                
                logger.debug(f"Processing event: {event.get('title')}")
                if not event.get("title") or not event.get("start_time"):
                    logger.warning("Missing required fields: 'title' and/or 'start_time'")
                    continue

                new_event = Event(
                    title=event.get("title"),
                    is_all_day=event.get("is_all_day", False),
                    start_time=parse_datetime(event.get("start_time")),
                    time_zone=(str(current_time_zone) if not event.get("time_zone") else event.get("time_zone")),
                    end_time=parse_datetime(event.get("end_time")),
                    description=event.get("description", " "),
                    location=event.get("location", " "),
                    attendees=event.get("attendees", []),
                    is_recurring=event.get("is_recurring", False),
                    recurrence_pattern=event.get("recurrence_pattern"),
                    recurrence_days=event.get("recurrence_days"),
                    recurrence_count=event.get("recurrence_count"),
                    recurrence_end_date=(parse_datetime(event.get("recurrence_end_date")) if event.get("recurrence_end_date") else None),
                )
                event_list.append(new_event)
            
            logger.info(f"Parsed {len(event_list)} events successfully.")

        except Exception as e:
            logger.exception("Unexpected Error during parsing")
            return "An unexpected error occurred. Please check the logs."

        return event_list
