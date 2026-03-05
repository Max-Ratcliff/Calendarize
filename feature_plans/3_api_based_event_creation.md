# Plan for API-Based Event Creation

**Feature:** Update to API based event creation with outlook and google APIs

**Problem:** Currently, calendar events are added via URL parameters, which is limited and can be unreliable. The goal is to use the official Google Calendar and Outlook Calendar APIs for a more robust and feature-rich implementation.

**Files to Modify/Create:**

*   `src/backend/API_interaction/gc_event_adder.py`: Already exists for Google Calendar, but needs to be integrated.
*   `src/backend/API_interaction/outlook_event_adder.py`: **New file** for Outlook Calendar API interaction.
*   `src/backend/main.py`: To add new endpoints for API-based event creation.
*   `src/frontend/app/utils/calendarExport.ts`: To call the new backend endpoints.

**Plan:**

**Backend:**

1.  **Google Calendar API (Existing):**
    *   The file `src/backend/API_interaction/gc_event_adder.py` already handles Google Calendar API authentication and event creation.
    *   Ensure it's fully functional and integrated with the main backend.
    *   The frontend will need to call the `/add-event` endpoint in this file.

2.  **Outlook Calendar API (New):**
    *   Create a new file: `src/backend/API_interaction/outlook_event_adder.py`.
    *   Implement OAuth 2.0 authentication for the Microsoft Graph API (which is used for Outlook). This will be similar to the Google Calendar implementation, involving client secrets, scopes, and callbacks.
    *   Create a function to add events to the user's Outlook calendar using the Microsoft Graph API.
    *   Add a new endpoint (e.g., `/add-outlook-event`) in `src/backend/main.py` that calls this function.

**Frontend:**

1.  **Modify `src/frontend/app/utils/calendarExport.ts`:**
    *   Update the `exportToGoogleCalendar` function to make a `POST` request to the `/add-event` endpoint in the backend (instead of opening a URL).
    *   Create a new `exportToOutlookCalendar` function to make a `POST` request to the new `/add-outlook-event` endpoint.
    *   These functions will pass the event details in the request body.

2.  **Update UI Components:**
    *   The buttons in the frontend that trigger these exports will now call the updated functions in `calendarExport.ts`.
    *   The UI should handle the loading state while the API call is in progress and provide feedback to the user (success or failure).
