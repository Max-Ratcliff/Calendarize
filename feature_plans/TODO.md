# Project Progress & TODO

## Current State Evaluation
- **Backend:** FastAPI-based, Dockerized, deployed to **Google Cloud Run**.
- **Frontend:** Next.js application, previously on Digital Ocean, now migrated.
- **Infrastructure:**
    - Dockerized and running on Cloud Run.
    - Firestore used for usage tracking with Application Default Credentials (ADC).
    - Repository cleaned of redundant config files and sensitive index entries.

## Priority 1: Gemini API & Model Update
- [x] **Update Model:** Migrated to `gemini-2.5-flash-lite`.
- [ ] **Secret Management (Production Hardening):**
    - [ ] Remove `GEMINI_API_KEY` from `.env` files.
    - [ ] Configure Cloud Run to pull these from **Google Cloud Secret Manager**.
    - [ ] Update `readenv.py` to check for environment variables provided by Secret Manager first.

## Priority 2: Repository Cleanup (Pre-Push)
- [x] **Cleanup Redundant Files:** Removed duplicate `.gitignore`, `tailwind.config.js`, and `postcss.config.js` from frontend.
- [x] **Secure Git Index:** Removed `client_secret.json` from tracked files.
- [x] **Logging Improvements:** (Plan 13) - Implemented centralized structured logging for Backend (FastAPI) and Frontend (Next.js) with PostHog integration and GCP-friendly JSON formatting.
- [x] **Consolidate Google Calendar Logic:** Scrapped the stray `gc_event_adder.py` and converted it into a modular backend utility `src/backend/utils/google_calendar.py`.
- [x] **Integrate Direct "Push to Calendar" Button:** (Plan 3) - Added OAuth routes to `main.py`, backend utility logic, and 'Push to Google' button in the frontend.
    - [ ] Ensure `src/backend/event_generation/config/` only contains `.example` files for secrets.
    - [ ] Remove any leftover Digital Ocean specific configuration (if any).
- [ ] **Final Lint/Formatting:** Run a final pass to ensure code consistency.

## Priority 3: Documentation
- [ ] **Update README:** Comprehensive guide for local setup and Cloud Run deployment (In Progress).
- [ ] **API Documentation:** Ensure FastAPI `/docs` is properly described for production.

## Feature Implementation Status
- **Fix URL Encoding:** (Plan 1) - Pending.
- **Fix Outlook Implementation:** (Plan 2) - Pending.
- **API-based Event Creation:** (Plan 3) - Pending.
- **Improve UX:** (Plan 4) - Pending.
- **Add all events in one click:** (Plan 5) - Pending.
- **Edit Button:** (Plan 6) - Pending.
- **Proper Capitalization:** (Plan 7) - Pending.
- **Google Contacts Integration:** (Plan 8) - Pending.
- **User Accounts:** (Plan 9) - Pending.
- **Mobile UX:** (Plan 10) - Pending.
- **Timezone Handling:** (Plan 11) - Pending.
- **Recurring Events:** (Plan 12) - Pending.
