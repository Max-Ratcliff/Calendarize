# Logging Improvement Plan

## Backend (FastAPI)
- [ ] **Centralized Logger Configuration:** Create a `src/backend/utils/logger.py` to configure a standard logger (e.g., using `logging.getLogger(__name__)`).
- [ ] **Standardize Levels:** Use `DEBUG` for verbose flow, `INFO` for requests/process completion, `WARNING` for non-critical issues, and `ERROR` for exceptions.
- [ ] **Replace `print` with `logger`:** Systematically replace all `print()` statements in:
    - `main.py`
    - `nlp_parsers/*.py`
    - `API_interaction/*.py`
    - `event_generation/event/date_parser.py`
- [ ] **Request Logging Middleware:** Add a FastAPI middleware in `main.py` to log all incoming requests (method, path, status code, duration).
- [ ] **Traceback Logging:** Ensure all `except Exception as e` blocks log the full stack trace using `logger.exception(e)`.

## Frontend (Next.js)
- [ ] **Logging Utility:** Create `src/frontend/lib/logger.ts` to wrap `console.log/error`.
- [ ] **Environment Awareness:** Disable verbose `DEBUG` logs in production.
- [ ] **Analytics Integration:** Connect the logger to PostHog in `src/frontend/lib/analytics.ts` to capture critical errors and user-facing failures as events.
- [ ] **Standardize Error Handling:** Ensure `eventGenerator.ts` uses the new logger instead of raw `console.log`.

## Repository Cleanup
- [ ] **Remove Hardcoded Print:** Remove temporary debugging `print` statements that were left over from merges.
- [ ] **Update TODO.md:** Reflect these tasks in the project's master TODO list.
