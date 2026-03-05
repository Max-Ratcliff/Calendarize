# Standard library imports
import json
import logging
import traceback
from datetime import datetime

from event_generation.config.readenv import get_gemini_key
from event_generation.event.date_parser import parse_datetime

# Local application imports
from event_generation.event.event import Event
from event_generation.event.schemas import AIResponse

# Third-party imports
# from dotenv import load_dotenv
from pathlib import Path
from google import genai as Gemini
from google.genai import types
from pydantic import ValidationError
from utils.logger import logger


class GeminiParser:
    def __init__(self):
        # Initialize Gemini client with API key
        self.client = Gemini.Client(api_key=get_gemini_key())
        self.model = "gemini-2.5-flash-lite"

    def parse(
        self, text: str, local_time: str, local_tz: str, image_path=None
    ) -> Event:
        # send request to Gemini API to extract event details into a JSON object
        try:
            # get current time up to the minute for relative date calculations
            # Format as                     "HH:MM:SS DAY, MONTH DAY, YEAR"
            time_info_dt = datetime.strptime(local_time, "%Y-%m-%dT%H:%M:%SZ")
            time_info = time_info_dt.strftime("%H:%M:%S %A, %B %d, %Y")
            current_time_zone = local_tz

            # Load prompt from file
            prompt_path = Path(__file__).parent.parent / "prompts" / "calendar_prompt.txt"
            with open(prompt_path, "r") as f:
                prompt_template = f.read()
            
            prompt = prompt_template.format(time_info=time_info, current_time_zone=current_time_zone)

            logger.info(f"Sending request to Gemini API. Text snippet: {text[:50]}...")
            
            contents = [text]
            if image_path:
                logger.info(f"Including image in request: {image_path}")
                with open(image_path, "rb") as f:
                    image_bytes = f.read()
                contents.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))

            # Use structured JSON output
            response = self.client.models.generate_content(
                model=self.model,
                config=types.GenerateContentConfig(
                    system_instruction=prompt,
                    response_mime_type="application/json"
                ),
                contents=contents,
            )

        # catch any errors gracefully
        except ConnectionError as ce:
            logger.error(f"Connection error while sending request to Gemini API: {ce}")
            return "A connection error occurred while communicating with Gemini API. Please check your internet connection."

        except ValueError as ve:
            logger.error(f"Invalid input or response from Gemini: {ve}")
            return (
                "An error occurred due to an invalid input or response from Gemini API."
            )

        except Exception as e:
            logger.exception("Unexpected error during Gemini API call")
            return f"An unexpected error occurred: {e}"

        # Parse the response from Gemini API into a JSON object
        try:
            # When response_mime_type is application/json, Gemini returns a valid JSON string
            raw_text = response.candidates[0].content.parts[0].text
            logger.debug(f"Structured response from Gemini: {raw_text}")

            if not raw_text:
                logger.error("Empty response text from Gemini")
                raise ValueError("No event data extracted from the text")

            try:
                # Use Pydantic to validate the entire response structure
                ai_response = AIResponse.model_validate_json(raw_text)
            except ValidationError as ve:
                logger.error(f"Pydantic Validation Error for AI response: {ve} | Input: {repr(raw_text)}")
                return f"The AI returned data that failed validation: {str(ve)}"
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e} | Input: {repr(raw_text)}")
                return "Failed to parse the AI response as valid JSON."

            event_list = []
            # Create Event object by parsing validated fields
            for event in ai_response.events:
                # Pydantic has already validated these types
                new_event = Event(
                    title=event.title,
                    is_all_day=event.is_all_day,
                    start_time=parse_datetime(event.start_time),
                    time_zone=(str(current_time_zone) if not event.time_zone else event.time_zone),
                    end_time=parse_datetime(event.end_time) if event.end_time else None,
                    description=event.description or " ",
                    location=event.location or " ",
                    attendees=event.attendees,
                    is_recurring=event.is_recurring,
                    recurrence_pattern=event.recurrence_pattern,
                    recurrence_days=event.recurrence_days,
                    recurrence_count=event.recurrence_count,
                    recurrence_end_date=(parse_datetime(event.recurrence_end_date) if event.recurrence_end_date else None),
                )
                
                # Sanity check for dates
                if not new_event.start_time:
                    logger.warning(f"Could not parse start_time '{event.start_time}' for event '{event.title}'")
                    continue
                
                # Default end_time if missing or failed to parse
                if not new_event.end_time:
                    from datetime import timedelta
                    new_event.end_time = new_event.start_time + timedelta(hours=1)

                event_list.append(new_event)
            
            logger.info(f"Successfully parsed {len(event_list)} events.")

        # Catch any errors gracefully
        except ValueError as ve:
            logger.error(f"ValueError during parsing: {ve}")
            return f"Invalid event data: {ve}"

        except ValidationError as ve:
            logger.error(f"Pydantic Validation Error: {ve}")
            return f"Event data validation failed: {ve}"

        except Exception as e:
            logger.exception("Unexpected Error during parsing Gemini response")
            return "An unexpected error occurred while processing the event data."

        return event_list
