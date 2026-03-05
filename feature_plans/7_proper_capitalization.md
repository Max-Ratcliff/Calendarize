# Plan for Proper Capitalization

**Feature:** Ensure Proper Capitilization

**Problem:** The event titles extracted by the AI might not have consistent or correct capitalization.

**Files to Modify:**

*   `src/backend/event_generation/event/event.py`: The `Event` class where the event data is stored.
*   `src/backend/event_generation/nlp_parsers/gemini_parser.py`: The parser that extracts the event details.

**Plan:**

**Option 1: Backend (Recommended)**

1.  **Modify the `Event` class:**
    *   In `src/backend/event_generation/event/event.py`, within the `__init__` method of the `Event` class, add a line to capitalize the title.
    *   A simple `.title()` on the string might be sufficient, but a more sophisticated library could be used for more advanced "title case" capitalization if needed.

    ```python
    # In event.py
    class Event:
        def __init__(self, title, ...):
            self.title = title.title() if title else None
            # ... other attributes
    ```

**Option 2: Frontend**

1.  **Modify the `generated-event.tsx` component:**
    *   In `src/frontend/app/components/calendar-converter/generated-event.tsx`, when displaying the event title, apply a CSS `text-transform: capitalize;` style.
    *   This is a purely visual change and won't affect the actual data sent to the calendar.

**Decision:**

Backend is the better approach because it fixes the data at the source. This ensures that the capitalization is correct not just in the UI, but also in the actual calendar event that gets created. I will implement Option 1.
