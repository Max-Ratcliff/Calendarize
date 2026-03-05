# Plan for User Accounts

**Feature:** User accounts for historical event storage

**Problem:** Users cannot save or view their past generated events.

**Files to Modify/Create:**

*   **Backend:**
    *   A new database (e.g., PostgreSQL, MongoDB) to store user and event data.
    *   New files for user authentication (e.g., using JWTs).
    *   New API endpoints for user registration, login, and fetching historical events.
*   **Frontend:**
    *   New pages for login and registration.
    *   A new page to display the user's event history.
    *   State management for user authentication (e.g., using React Context or Redux).

**Plan:**

This is a large feature that will require significant changes across the stack.

1.  **Choose a Technology Stack:**
    *   **Database:** PostgreSQL is a good choice for relational data (users and their events).
    *   **Authentication:** JWTs (JSON Web Tokens) are a standard way to handle authentication in APIs. Libraries like `passlib` for password hashing and `python-jose` for JWTs can be used in the Python backend.

2.  **Backend:**
    *   **Database Schema:** Design a database schema with tables for `users` (id, username, password_hash) and `events` (id, user_id, title, start_time, etc.).
    *   **User Authentication Endpoints:**
        *   `POST /register`: Create a new user.
        *   `POST /login`: Authenticate a user and return a JWT.
    *   **Event History Endpoints:**
        *   `GET /events`: Get all events for the authenticated user.
        *   `POST /events`: Save a new event for the authenticated user.
    *   **Protect Endpoints:** The event-related endpoints should be protected, requiring a valid JWT.

3.  **Frontend:**
    *   **Authentication Pages:** Create login and registration pages.
    *   **Authentication State:** Use a global state management solution to store the user's authentication token.
    *   **Authenticated Requests:** When making API requests to protected endpoints, include the JWT in the `Authorization` header.
    *   **Event History Page:** Create a new page that fetches and displays the user's past events from the `/events` endpoint.
    *   **Save Events:** After an event is generated, provide a "Save" button that sends the event data to the `POST /events` endpoint.
