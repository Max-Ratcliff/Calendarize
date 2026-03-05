# Calendarize Project Roadmap

## 🚀 High Priority (Immediate Focus)
- [ ] **Aesthetic Tooltip/Toast Hints**: Replace annoying browser `alert()` and `confirm()` calls with non-obtrusive UI notifications (e.g., using `sonner` or `react-hot-toast`).
- [ ] **Silent Individual Push**: Modify "Push to Google" on individual events to add them in the background without opening a new tab.
- [ ] **"Push All Events" Feature**: Add a button to batch-push all converted events to Google Calendar at once.
- [ ] **Review Flow**: Open Google Calendar only after a "Push All" or when the user explicitly requests to review.

## 🛠️ Backend & API Improvements
- [x] **Move Prompt to File**: Prompt extracted to `src/backend/event_generation/prompts/calendar_prompt.txt`.
- [x] **Structured JSON Output**: Implemented `response_mime_type: "application/json"` in Gemini API calls for better reliability.
- [ ] **Pydantic Validation**: Strengthen backend data validation for incoming event data.
- [ ] **Outlook API Implementation**: Complete the Microsoft Graph API integration for Outlook.

## 🎨 UX & UI Enhancements
- [ ] **Edit Button**: Allow users to manually correct details detected by AI before pushing.
- [ ] **Mobile UI/UX**: Further polish for mobile devices.
- [ ] **Proper Capitalization**: Ensure AI output follows standard title casing for events.

## 📈 Future Features
- [ ] **User Accounts**: Historical event storage and persistent preferences.
- [ ] **Google Contacts Integration**: Auto-complete attendees from user's contacts.
- [ ] **Timezone Detection**: Automatically detect user timezone more reliably.
- [ ] **Recurring Events**: Better handling of complex recurrence patterns.

## ✅ Completed
- [x] Fix Base64 token corruption in Google OAuth flow.
- [x] Implement in-memory session store for tokens.
- [x] Refactor Gemini Parser to use external prompt files.
