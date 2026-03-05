# Plan for Recurring Events

**Feature:** Improve support for recurring events

**Problem:** The current implementation has limited or no support for recurring events.

**Files to Modify:**

*   `src/backend/event_generation/nlp_parsers/gemini_parser.py`: To extract recurrence rules from the input text.
*   `src/backend/event_generation/event/event.py`: To store the recurrence rule.
*   `src/backend/API_interaction/gc_event_adder.py`: To add the recurrence rule to the Google Calendar event.
*   `src/frontend/app/components/calendar-converter/generated-event.tsx`: To display the recurrence information.

**Plan:**

1.  **NLP Parser:**
    *   Update the prompt for the Gemini parser in `gemini_parser.py` to specifically ask for recurrence information (e.g., "Does this event repeat? If so, what is the recurrence rule (e.g., weekly, monthly, every Tuesday)?").
    *   The parser should be able to extract common recurrence patterns like "every day", "every week", "every month", "every Tuesday and Thursday".

2.  **Event Class:**
    *   In `src/backend/event_generation/event/event.py`, add a field to the `Event` class to store the recurrence rule (e.g., `self.recurrence_rule`). This should be in a format that the calendar APIs can understand (iCalendar `RRULE` format is the standard).

3.  **Google Calendar API:**
    *   In `gc_event_adder.py`, when creating the event, add a `recurrence` field to the event resource. This field takes an array of `RRULE` strings.
    *   For example, for an event that repeats weekly, the `RRULE` would be `RRULE:FREQ=WEEKLY`.

4.  **iCalendar:**
    *   When generating the `.ics` file, add the `RRULE` to the event details.

5.  **Frontend:**
    *   In `generated-event.tsx`, display the recurrence rule if it exists for an event (e.g., "Repeats weekly").

**Example `RRULE`s:**

*   **Every day:** `RRULE:FREQ=DAILY`
*   **Every week:** `RRULE:FREQ=WEEKLY`
*   **Every month:** `RRULE:FREQ=MONTHLY`
*   **Every Tuesday and Thursday:** `RRULE:FREQ=WEEKLY;BYDAY=TU,TH`
*   **10 times:** `RRULE:FREQ=WEEKLY;COUNT=10`

A library like `dateutil.rrule` in Python can be very helpful for constructing complex `RRULE` strings.
