# Plan for Fixing Outlook Implementation

**Feature:** Fix outlook implementation (broken)

**Problem:** The Outlook link generation is not working correctly.

**File to Modify:** `src/backend/event_generation/event/event.py`

**Plan:**

1.  **Investigate the current `set_outlook_link` method:** In `src/backend/event_generation/event/event.py`, examine the `set_outlook_link` method to understand how the Outlook URL is currently being constructed.
2.  **Consult Outlook Calendar URL documentation:** Research the correct format for creating "Add to Calendar" links for Outlook. The current implementation might be using an outdated or incorrect URL structure. A quick search reveals the following format:
    `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent`
3.  **Identify necessary parameters:** The required parameters are typically:
    *   `startdt`: Start date and time in ISO 8601 format (e.g., `2025-12-01T10:00:00`).
    *   `enddt`: End date and time in ISO 8601 format.
    *   `subject`: The event title.
    *   `body`: The event description.
    *   `location`: The event location.
4.  **Update the `set_outlook_link` method:**
    *   Modify the method to use the correct base URL and parameters.
    *   Ensure all parameter values are properly URL-encoded using `urllib.parse.quote_plus`.
    *   Format the start and end times to the required ISO 8601 format.

**Example:**

```python
import urllib.parse

# ... inside set_outlook_link ...
base_url = "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent"
params = {
    "startdt": self.start_time.isoformat(),
    "enddt": self.end_time.isoformat(),
    "subject": self.title,
    "body": self.description,
    "location": self.location
}
encoded_params = urllib.parse.urlencode(params, quote_via=urllib.parse.quote_plus)
self.outlook_link = f"{base_url}&{encoded_params}"
```
