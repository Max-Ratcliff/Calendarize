# Plan for Timezone Handling

**Feature:** Improve timezone detection and handling

**Problem:** The current implementation has a hardcoded timezone (`America/Los_Angeles`) in `gc_event_adder.py` and relies on the user's local time being passed from the frontend. This is not robust.

**Files to Modify:**

*   `src/backend/main.py`: To receive the timezone from the frontend.
*   `src/backend/API_interaction/gc_event_adder.py`: To use the provided timezone.
*   `src/frontend/app/components/calendar-converter/index.tsx`: To detect the user's timezone.

**Plan:**

1.  **Frontend: Detect Timezone:**
    *   In `src/frontend/app/components/calendar-converter/index.tsx`, use the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` to get the user's IANA timezone name (e.g., "America/New_York").
    *   Send this timezone to the backend with the `/convert` request.

2.  **Backend: Use Provided Timezone:**
    *   In `src/backend/main.py`, modify the `/convert` endpoint to accept a `timezone` parameter.
    *   Pass this timezone to the `parser.parse` method.
    *   The parser should then associate this timezone with the generated events.

3.  **Backend: Google Calendar API:**
    *   In `src/backend/API_interaction/gc_event_adder.py`, modify the `add_event` function to use the timezone from the event object instead of the hardcoded "America/Los_Angeles".
    *   The `start` and `end` objects in the Google Calendar event should have a `timeZone` field.

4.  **Backend: Outlook and iCal:**
    *   For Outlook and iCal, ensure that the date-time strings are in a format that includes timezone information (e.g., ISO 8601 with a timezone offset). The `py-ical` library and Outlook's URL format should handle this correctly if the `datetime` objects are timezone-aware.

**Example (Frontend):**

```javascript
// In index.tsx
const handleConvert = async () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch('/api/convert', {
    method: 'POST',
    body: JSON.stringify({ text: input, timezone: timezone }),
    // ...
  });
};
```

**Example (Backend):**

```python
# In main.py
@app.post("/convert")
async def convert(text: str, timezone: str):
    # ...
    parser.parse(text, timezone)
    # ...

# In gc_event_adder.py
calendar_event = {
    # ...
    'start': {
        'dateTime': start_time.isoformat(),
        'timeZone': event.timezone, # Use the event's timezone
    },
    # ...
}
```
