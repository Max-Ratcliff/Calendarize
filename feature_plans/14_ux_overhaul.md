# UX Overhaul: Toasts, Silent Push, and Batch Actions

## Goals
- Replace `alert()` and `confirm()` with aesthetic `sonner` toast notifications.
- Enable background (silent) pushing for individual events.
- Implement "Push All" functionality for batch event creation.
- Improve the review flow (only open Google Calendar after batch operations).

## 1. Aesthetic Notifications (Toasts)
**Library:** `sonner` (Modern, lightweight, and aesthetic).
**Implementation:**
- Add `sonner` to `package.json`.
- Wrap the application in a `Toaster` provider.
- Replace `alert("Authentication successful...")` and other alerts with `toast.success()`, `toast.error()`, etc.

## 2. Silent Individual Push
**File:** `src/frontend/app/utils/calendarExport.ts`
- Modify `pushToGoogleCalendar` to accept an optional `silent` parameter (boolean, default `false`).
- If `silent` is `true`, do NOT call `window.open(data.htmlLink)`.
- Use `toast.promise()` to show loading/success/error states for the API call.

## 3. Batch "Push All" Feature
**File:** `src/frontend/app/utils/calendarExport.ts`
- Implement `pushAllToGoogleCalendar(events: CalendarEvent[])`.
- Use `Promise.allSettled()` to push all events in parallel.
- Show a summary toast: "Successfully pushed 3/4 events to Google Calendar".
- Open `https://calendar.google.com` in a new tab *once* after all operations complete to allow review.

## 4. UI Integration
**File:** `src/frontend/app/components/calendar-converter/index.tsx`
- Add a "Push All to Google" button at the top of the events list (only visible if events > 1).
- Style the button to match the "CZ" aesthetic.

**File:** `src/frontend/app/components/calendar-converter/generated-event.tsx`
- Update the "Push to Google" button to call `pushToGoogleCalendar` with `silent: true`.
- Add a "Review" button or link that only appearing after a successful push.

## Execution Order
1. Install `sonner`.
2. Update `calendarExport.ts` with silent/batch logic.
3. Replace alerts with toasts.
4. Add "Push All" UI to the main converter.
5. Update individual event buttons for silent behavior.
