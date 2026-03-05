# Plan for Adding All Events in One Click

**Feature:** Add All events in one click

**Problem:** When multiple events are detected from the input, the user has to add them one by one. This is inefficient.

**Files to Modify:**

*   `src/frontend/app/components/calendar-converter/index.tsx`: The main component that displays the list of generated events.
*   `src/frontend/app/utils/calendarExport.ts`: To add a function for batch-adding events.

**Plan:**

1.  **Add "Add All" Button:**
    *   In `src/frontend/app/components/calendar-converter/index.tsx`, add a new button "Add All to Google Calendar" and "Add All to Outlook" when there is more than one event in the `generatedEvents` state.

2.  **Implement Batch Export Functions:**
    *   In `src/frontend/app/utils/calendarExport.ts`, create new functions: `exportAllToGoogleCalendar` and `exportAllToOutlook`.
    *   These functions will take an array of `CalendarEvent` objects.
    *   They will loop through the events and call the respective single-event export function for each one.

3.  **Connect Button to Function:**
    *   In `index.tsx`, the "Add All" buttons will call these new batch export functions, passing the `generatedEvents` array.

**Considerations:**

*   **API Rate Limiting:** If using API-based event creation, be mindful of API rate limits. It might be necessary to add a small delay between each API call.
*   **User Feedback:** Provide clear feedback to the user as each event is added, or a summary at the end (e.g., "3 out of 3 events added successfully").
