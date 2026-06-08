# Calendarize Project Roadmap

## 🚀 Deployment & DevOps (Current Focus)
- [ ] **Fix Cloud Run Import Errors**: Resolving `ModuleNotFoundError` in containerized environment by standardizing package imports.
- [ ] **Standardize Backend Package Structure**: Ensure consistent absolute/relative import strategy across the backend for production stability.

## 🛠️ Backend & API Improvements
- [x] **Move Prompt to File**: Prompt extracted to `src/backend/event_generation/prompts/calendar_prompt.txt`.
- [x] **Structured JSON Output**: Implemented `response_mime_type: "application/json"` in Gemini API calls for better reliability.
- [x] **Pydantic Validation**: Implemented strict data validation for AI responses using Pydantic schemas.
- [x] **Secure Secret Handling**: Updated `deploy.sh` to use Google Secret Manager for sensitive credentials (Oauth & Firebase).
- [ ] **Outlook API Implementation**: Complete the Microsoft Graph API integration for Outlook.

## 🎨 UX & UI Enhancements
- [x] **Aesthetic Toast Notifications**: Replaced `alert()` calls with `sonner` toasts for a professional, unobtrusive experience.
- [x] **Silent Background Pushing**: Individual events now add to Google Calendar in the background with immediate visual feedback.
- [x] **Batch "Push All" Feature**: Users can now add multiple events in parallel with one click.
- [x] **Professional Reviews**: Added "Review in Google Calendar" links that only appear after successful pushes.
- [x] **Professional Website Foundation**: Added Privacy Policy, Terms of Service, and enhanced SEO/OpenGraph metadata.
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
- [x] Domain migration to `calendarize.ratcliff.cc`.
- [x] Secure `httponly` cookie implementation.
