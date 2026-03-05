# Plan for Google Contacts/CSV Integration

**Feature:** Improve Invites -> Gcontacts/csv contacts integration?

**Problem:** Adding invitees to an event is a manual process. This feature would allow users to import contacts from Google Contacts or a CSV file.

**Files to Modify/Create:**

*   `src/frontend/app/components/calendar-converter/generated-event.tsx`: To add a UI for managing invitees.
*   `src/backend/API_interaction/gc_event_adder.py`: To add invitees to the Google Calendar event.
*   `src/backend/API_interaction/outlook_event_adder.py`: To add invitees to the Outlook event.
*   A new frontend component for handling the contact import.

**Plan:**

1.  **Frontend UI:**
    *   In `generated-event.tsx`, add an "Invitees" section.
    *   This section will have a text area for manually entering email addresses.
    *   It will also have buttons: "Import from Google Contacts" and "Import from CSV".

2.  **Google Contacts Integration:**
    *   When the "Import from Google Contacts" button is clicked, initiate an OAuth flow for the Google People API.
    *   The scope will need to be updated to include `https://www.googleapis.com/auth/contacts.readonly`.
    *   Fetch the user's contacts and display them in a modal or a dropdown list.
    *   The user can then select the contacts they want to invite.

3.  **CSV Import:**
    *   When the "Import from CSV" button is clicked, open a file picker.
    *   Use a library like `papaparse` to parse the CSV file in the frontend.
    *   Assume the CSV has a column for email addresses.
    *   Add the parsed email addresses to the list of invitees.

4.  **Backend API:**
    *   Update the `/add-event` endpoint in `gc_event_adder.py` and the new Outlook endpoint to accept a list of invitee email addresses.
    *   When creating the calendar event, include the invitees in the API request. For Google Calendar, this is done by adding an `attendees` array to the event resource.

5.  **State Management:**
    *   The list of invitees for each event will need to be managed in the frontend state.
