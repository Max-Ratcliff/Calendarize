# Plan for Fixing URL Encoding

**Feature:** Ensure '&' character doesn't appear in URL

**Problem:** The `&` character in a URL is a special character that separates parameters. If it appears in a parameter value without being properly URL-encoded (as `%26`), it will break the URL.

**File to Modify:** `src/backend/event_generation/event/event.py`

**Plan:**

1.  In `src/backend/event_generation/event/event.py`, locate the `set_gcal_link` and `set_outlook_link` methods.
2.  Within these methods, before constructing the URL, ensure that all parameters (especially `title`, `description`, and `location`) are URL-encoded.
3.  Use Python's `urllib.parse.quote_plus` to encode the parameters. This will correctly handle `&` and other special characters.

**Example (for gcal_link):**

```python
import urllib.parse

# ... inside set_gcal_link ...
base_url = "https://www.google.com/calendar/render?action=TEMPLATE"
params = {
    "text": self.title,
    "details": self.description,
    "location": self.location,
    "dates": f"{self.start_time.strftime('%Y%m%dT%H%M%S')}/{self.end_time.strftime('%Y%m%dT%H%M%S')}"
}
encoded_params = urllib.parse.urlencode(params, quote_via=urllib.parse.quote_plus)
self.gcal_link = f"{base_url}&{encoded_params}"
```
