# Calendarize - AI Calendar Event Generator

![icon](src/frontend/app/favicon.ico)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Calendarize** is an AI-powered tool that transforms images and text into calendar events. By leveraging the Gemini 2.5 Flash Lite model, it extracts event details (title, time, location, attendees, recurrence) and generates ready-to-use invite links for Google Calendar, Outlook, and iCal.

---

## 🚀 Features

- **Multi-Modal Input:** Extract event data from raw text or image uploads (screenshots, flyers, etc.).
- **Smart Parsing:** Automatic timezone detection and relative date handling (e.g., "next Tuesday").
- **Universal Support:** One-click links for Google Calendar, Outlook Web, and standard `.ics` downloads.
- **Cloud Native:** Built with FastAPI (Backend) and Next.js (Frontend), optimized for Google Cloud Run.

---

## 🛠️ Local Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- API Keys: [Google AI Studio](https://aistudio.google.com/) (Gemini) and/or OpenAI.

### Quick Setup
Run the automated setup script to install dependencies and configure local environment variables:

```bash
bash setup.sh
```

### Manual Backend Setup
1. Navigate to `src/backend`.
2. Install requirements: `pip install -r requirements.txt`.
3. Create a `.env` in `src/backend/event_generation/config/`:
   ```env
   GEMINI_API_KEY="your_key_here"
   MODEL="gemini"
   ```

### Manual Frontend Setup
1. Navigate to `src/frontend`.
2. Install dependencies: `npm install`.
3. Create `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`.

---

## 💻 Usage

Start both servers simultaneously:
```bash
bash runlocal.sh
```
The application will be available at `http://localhost:3000`.

### Command-Line Interface (CLI)
You can test the extraction engine directly from the terminal:
```bash
cd src/backend
python -m event_generation.testing.test_to_cal_cli
```

---

## ☁️ Deployment (Google Cloud Run)

Calendarize is designed to run as a containerized service on Google Cloud.

### 1. Backend Deployment
The backend includes a `Dockerfile` and is compatible with Cloud Run.

**Prerequisites:**
- Google Cloud SDK (`gcloud`) installed.
- A Google Cloud Project with Billing and Artifact Registry enabled.

**Deploy Command:**
```bash
cd src/backend
gcloud run deploy calendarize-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="MODEL=gemini" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

*Note: It is recommended to use **Google Cloud Secret Manager** for API keys instead of plaintext environment variables.*

### 2. Firestore Usage Tracking
The backend automatically uses **Application Default Credentials (ADC)** to track API usage in Firestore. Ensure the Cloud Run service account has the `Cloud Datastore User` role.

---

## 📅 Roadmap
- [ ] Post-generation event editing.
- [ ] Direct Google Calendar API integration (skip the link).
- [ ] Recurring event support (Plan 12).
- [ ] Improved mobile UX.

---

Built with ❤️ by the Calendarize Team.
