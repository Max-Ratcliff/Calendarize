# Plan for Edit Button

**Feature:** Edit button for incorrect detected details

**Problem:** If the AI incorrectly extracts event details, the user has no way to correct them before adding the event to their calendar.

**Files to Modify:**

*   `src/frontend/app/components/calendar-converter/generated-event.tsx`: The component that displays a single generated event.
*   `src/frontend/app/components/calendar-converter/index.tsx`: The parent component that manages the state of the generated events.
*   `src/backend/main.py`: To handle the regeneration of calendar links after an edit.

**Plan:**

1.  **Add "Edit" Button:**
    *   In `src/frontend/app/components/calendar-converter/generated-event.tsx`, add an "Edit" button to each event card.

2.  **Create an Editable Form:**
    *   When the "Edit" button is clicked, the event details (title, date, time, etc.) should become editable fields (e.g., `<input>` or `<textarea>`).
    *   The "Edit" button should be replaced with "Save" and "Cancel" buttons.

3.  **Manage State:**
    *   In `src/frontend/app/components/calendar-converter/index.tsx`, add state to manage the "edit mode" for each event.
    *   When "Save" is clicked, the component should update its state with the new event details.

4.  **Backend Endpoint for Regeneration:**
    *   The `POST /edit` endpoint in `src/backend/main.py` already exists. It takes event details and regenerates the calendar links.
    *   When the user saves their edits, the frontend will make a `POST` request to this `/edit` endpoint with the updated event data.
    *   The backend will return the updated event object with the new `gcal_link`, `outlook_link`, and `ics_string`.

5.  **Update Frontend with New Links:**
    *   The frontend will then update the specific event in the `generatedEvents` array with the new data received from the backend. This will automatically re-render the component with the correct "Add to Calendar" links.
