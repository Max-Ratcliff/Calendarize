# Standard library imports
from datetime import datetime
import json
import logging
import traceback
import base64

# Third-party imports
# from dotenv import load_dotenv
# from pathlib import Path
from openai import OpenAI
from pydantic import ValidationError
# import tzlocal as tz

# Local application imports
from event_generation.event.event import Event
from event_generation.event.date_parser import parse_datetime
from event_generation.config.readenv import get_openai_key

logging.basicConfig(level=logging.ERROR)  # Configure logging


# private Helper function to encode the image
# https://platform.openai.com/docs/guides/vision#uploading-base64-encoded-images
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


class OpenAiParser:
    def __init__(self):
        # Initialize OpenAI client with API key
        self.client = OpenAI(api_key=get_openai_key())

    def parse(self, text: str, local_time: str, local_tz: str, image_path=None) -> Event:
        # send request to OpenAI API to extract event details into a JSON object
        try:
            # get current time up to the minute for relative date calculations
            # Format as                     "HH:MM:SS DAY, MONTH DAY, YEAR"
            time_info = datetime.strptime(local_time, "%Y-%m-%dT%H:%M:%SZ")
            time_info = time_info.strftime("%H:%M:%S %A, %B %d, %Y")
            current_time_zone = local_tz

            prompt = f"""You are an AI that extracts structured event details from text.
                        Use the Information about the current time: **{time_info}** and the current timezone is: **{current_time_zone}**.

                        **Important Insctructions:**
                        - If a date is relative (e.g., "tomorrow at 2pm", "in two hours"), convert it into an absolute datetime based on the current time.
                        - Be careful with relative dates (e.g., "Next Monday") always pay close attention to the year, and make sure the date is in the future.
                            dont assume that monday always falls on the same day of the month every year. **double check this every time**.
                        - If a date is given without a time (e.g., "March 15"), assume it is an all day event and dont include the time.
                        - If the date is given in a range (e.g., "March 15-17"), assume it's a multi-day repeating all day event that with a starts on the first date and ends on the last date.
                        - If the time is given in a range (e.g., 2-4pm) use the first part of the range as the start_time (eg: 2pm) and the second part as the end_time (eg: 4pm).
                        - If only a time is given (e.g., "at 2pm"), assume it refers to today unless the event is clearly in the future.
                        - 24:00 is not a valid time always default to use 23:59 instead.
                        - **If there appear to be multiple events in the text, extract all of them into separate events. But maintain details that apply to multiple events.**
                        - **If an image is passed in the request, inperpet the image and extract all the details that would be important to the event as well as an exact description and use it to generate an event**
                        - It's possible that an image wont have very clear text or might have a wierd format (a screenshot of google calendar for example) do your best to extract the information.
                        -**If Image is passed along with text, unless there is context that shows the text is "edititng" the image, assume the text is in addition to the image and not a replacement for it.**
                        - if the text appears to be editing the image, make the event first, and then understand the context and use the text to update the event parsed from the image.
                        - if the text appears to be editing the image but only one of the events in the image is being edited, only update that event, but still return all the events from the image.

                        Extract and return in JSON format:
                        - title: str **a title is required never leave it null**
                        - is_all_day: bool
                            -- if the event is an all day event, set this to true. otherwise, set it to false.
                        - start_time: ISO 8601 datetime format,
                            -- **This field is required never leave it null**
                            -- the time should only be accurate to the minute. Format: YYYYMMDDTHHMM00
                            -- if it is an all day event then update the flag
                        - end_time: ISO 8601 datetime format,
                            -- **This field is required never leave it null, if you are at all unsure defualt to 1 hour afte start_time**
                            -- the time should only be accurate to the minute. Format: YYYYMMDDTHHMM00
                            -- if it is an all day event then update the flag
                            -- if the end time is not specified, use context to make a best guess and assume that either the event is 1 hour long or continues to the end of the day 23:59.
                            -- if the end time is specified without a date, assume it has the same date as the start time.
                            -- if the date is given without a time, assume the event is an all-day event
                            -- if the duration is specified, calculate the end time based on the start time.
                            -- if the event ends at midight (12am) adjust the end time to be 23:59:00
                        - time_zone: str,
                            -- representing the timezone of the event eg: "America/Los_Angeles" **a timezone is required never leave it null**
                            -- default to none if not specified.
                        - description: Optional[str]
                            -- if any links are provided, include them in the description. with a quick summary of what they are.
                            -- if there is no description provided try to find context to generate a description or extrapolate one from the title.
                        - location: Optional[str]
                            -- inlclude even vague locations like "online" or "virtual" if they are provided.
                            -- if there is no location provided, leave it null.
                        - attendees: Optional[List[str]]
                            -- if any email addresses are provided, include them in the attendees list.
                            -- if there are no email addresses provided leave it the list empty.
                            -- if names are provided without email addresses, include the names in the description. but leave the attendees list empty.
                        - is_recurring: bool
                            -- if the event is recurring, set this to true. and provide the recurrence pattern
                            -- if the recurrence is not specified, assume it's a one-time event and set is_recurring to false.
                        - recurrence_pattern: Optional[str]
                            -- if the event is recurring, provide the recurrence pattern. otherwise, leave it null
                            -- try to imply the recurrence pattern from the text. if it is not clear, default to WEEKLY. Use context if the event is something like a bithday or holiday.
                            -- if the event happens on multiple days in a row mark is as daily.
                            -- if it skips days or repeats weekly and/or includes multiple days of the week, mark it as weekly.
                            -- if the event happens monthly or yearly mark it as monthly or yearly.
                            -- if the event happens on mutliple days but doesnt last all day, use the recurrence pattern WEEKLY and provide the days of the week it occurs on. and then have it end on the last day of the event.
                            -- recurrence patterns should only be in the following formats:
                                ---DAILY, WEEKLY, MONTHLY, YEARLY
                        -recurrence_days: Optional[List[str]]
                            -- if the event is recurring, provide the days of the week it occurs on as a list. otherwise, leave it null.
                            -- recurrance_days should only be in the following formats:
                                --MO, TU, WE, TH, FR, SA, SU
                        -recurrence_count: Optional[int]
                            -- if the event is recurring, try to tell if the user specifies the number of recurrences or the end date, if the number of recurrences is specified, provide it. otherwise, leave it null.
                        -recurrence_end_date: Optional[str] Should be in just Date format YYYYMMDD (e.g., "20250130")
                            -- if the event is recurring, provide the end date of the recurrence. otherwise, leave it null to indicate that the recurrence is indefinite.

                        If any field is missing, return null.

                        here is an example of the JSON object you should return:

                        request: Slug Ai Meeting every tuesday thursday at 5pm
                        event:
                        {{
                            "events": [
                            {{
                                "title": "Slug Ai Meeting",
                                "is_all_day": False,
                                "start_time": "20250220T170000",
                                "time_zone": "America/Los_Angeles",
                                "end_time": "20250220T180000",
                                "description": "Bi-weekly Slug Ai meeting",
                                "location": None,
                                "attendees": [],
                                "is_recurring": True,
                                "recurrence_pattern": "WEEKLY",
                                "recurrence_days": ["TU", "TH"],
                                "recurrence_count": None,
                                "recurrence_end_date": None
                            }},
                            ]
                        }}

                        """
            print("\nsending request to OpenAI API: ", text)
            print("Time Info: ", time_info)
            print(f"Current Timezone: {current_time_zone}")
            if image_path:
                base64_image = encode_image(image_path)
                print(f"Image Path: {image_path}")
            print()
            print("\nwaiting on response from OpenAI API...")

            if image_path:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": prompt,
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": text,
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    },
                                },
                            ]
                        },
                    ],
                    response_format={"type": "json_object"},
                )
            else:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": prompt,
                        },
                        {"role": "user", "content": text},
                    ],
                    response_format={"type": "json_object"},
                )

        # catch any errors gracefully
        except ConnectionError as ce:
            logging.error(
                "Connection error while sending request to OpenAI API: %s", ce
            )
            return "A connection error occurred while communicating with OpenAI API. Please check your internet connection."

        except ValueError as ve:
            logging.error("Invalid input or response from OpenAI: %s", ve)
            return (
                "An error occurred due to an invalid input or response from OpenAI API."
            )

        except Exception as e:
            logging.error("Unexpected error: %s", e)
            return f"An unexpected error occurred: {e}"

        # Parse the response from OpenAI API into a JSON object
        try:
            event_data = json.loads(response.choices[0].message.content)
            # Ensure required fields exist
            event_list = []
            # Create Event object by parsing Json fields
            for event in event_data["events"]:
                print("\nEvent:\n", json.dumps(event, indent=4))
                print()
                if not event.get("title") or not event.get("start_time"):
                    raise ValueError("Missing required fields: 'title' and/or 'start_time'")
                new_event = Event(
                    title=event.get("title"),
                    is_all_day=event.get("is_all_day", False),
                    start_time=parse_datetime(
                        event.get("start_time")
                    ),  # Convert to datetime
                    time_zone=(
                        str(current_time_zone)
                        if not event.get("time_zone")
                        else event.get("time_zone")
                    ),
                    end_time=parse_datetime(event.get("end_time")),
                    description=event.get("description", " "),
                    location=event.get("location", " "),
                    attendees=event.get("attendees", []),
                    is_recurring=event.get("is_recurring", False),
                    recurrence_pattern=event.get("recurrence_pattern"),
                    recurrence_days=event.get("recurrence_days"),
                    recurrence_count=event.get("recurrence_count"),
                    recurrence_end_date=(
                        parse_datetime(event.get("recurrence_end_date"))
                        if event.get("recurrence_end_date")
                        else None
                    ),
                )
                event_list.append(new_event)

        # Catch any errors gracefully
        except ValueError as ve:
            logging.error("ValueError: %s", ve, exc_info=True)
            print(f"Error: {ve}")  # Log to console for debugging
            return f"Invalid event data: {ve}"

        except ValidationError as ve:
            logging.error("Pydantic Validation Error: %s", ve, exc_info=True)
            print(f"Pydantic Validation Error: {ve}")
            return f"Event data validation failed: {ve}"

        except Exception as e:
            error_trace = traceback.format_exc()  # Capture full stack trace
            logging.error("Unexpected Error: %s %s", e, error_trace)
            return "An unexpected error occurred. Please check the logs."

        return event_list
