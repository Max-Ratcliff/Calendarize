# src/backend/API_interaction/usage_tracker.py

import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

# --- Configuration ---

# Path to your Firebase service account key JSON file.
# Assumes the key is in the 'config' directory relative to the 'event_generation' folder.
SERVICE_ACCOUNT_KEY_PATH = os.path.join(
    os.path.dirname(__file__),  # current directory (API_interaction)
    "..",  # up to 'backend'
    "event_generation",
    "config",
    "firebase_servicekey.json",
)

# The daily request limit for the Gemini Flash free tier.
FREE_TIER_LIMIT_PER_DAY = 990000

# --- Firebase Initialization ---

# Initialize the Firebase Admin SDK.
try:
    # Check if the app is already initialized to prevent errors.
    if not firebase_admin._apps:
        if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
            # Local development with service account key
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
            firebase_admin.initialize_app(cred)
            print("Initialized Firebase with local service account key.")
        else:
            # Cloud Run or local development with Application Default Credentials
            firebase_admin.initialize_app()
            print("Initialized Firebase with Application Default Credentials.")

    db = firestore.client()
    # Reference to the specific document in Firestore that tracks usage.
    usage_doc_ref = db.collection("Usage").document("gemini_usage")
except Exception as e:
    print(f"ERROR: Could not initialize Firebase. {e}")
    # Provide a dummy client in case of failure so the app doesn't crash on import.
    db = None
    usage_doc_ref = None

# --- Core Functions ---


def get_usage_snapshot():
    """
    Retrieves the usage document snapshot and checks if the counter needs to be reset.
    This is a private helper function.
    """
    if not usage_doc_ref:
        # Return a default structure if Firebase initialization failed.
        return {
            "calls": FREE_TIER_LIMIT_PER_DAY + 1,
            "last_reset": datetime.now(timezone.utc),
        }

    try:
        snapshot = usage_doc_ref.get()
        if not snapshot.exists:
            # If the document doesn't exist, create it.
            initial_data = {"calls": 0, "last_reset": datetime.now(timezone.utc)}
            usage_doc_ref.set(initial_data)
            return initial_data

        data = snapshot.to_dict()
        last_reset_time = data.get("last_reset")

        # Ensure last_reset_time is timezone-aware for correct comparison
        if last_reset_time.tzinfo is None:
            last_reset_time = last_reset_time.replace(tzinfo=timezone.utc)

        # Check if the last reset was on a previous day (in UTC)
        if last_reset_time.date() < datetime.now(timezone.utc).date():
            # Date has changed, reset the counter.
            reset_data = {"calls": 0, "last_reset": datetime.now(timezone.utc)}
            usage_doc_ref.set(reset_data)
            return reset_data

        return data

    except Exception as e:
        print(f"Error accessing Firestore: {e}")
        # Return a structure that will block further API calls to be safe.
        return {
            "calls": FREE_TIER_LIMIT_PER_DAY + 1,
            "last_reset": datetime.now(timezone.utc),
        }


def increment_usage_count():
    """
    Increments the API usage count in Firestore using an atomic transaction.
    """
    if not usage_doc_ref:
        print("ERROR: Cannot increment usage count, Firebase not initialized.")
        return

    try:
        # Use Firestore's atomic increment operation.
        # This is safer than read-then-write for counters.
        usage_doc_ref.update({"calls": firestore.Increment(1)})
    except Exception as e:
        print(f"Error incrementing usage count in Firestore: {e}")


def check_usage_limit():
    """
    Checks if the current API usage is within the defined daily limit.
    """
    usage_data = get_usage_snapshot()
    current_calls = usage_data.get("calls", 0)
    return current_calls < FREE_TIER_LIMIT_PER_DAY


def get_current_usage():
    """
    Returns the current usage count and the daily limit from Firestore.
    """
    usage_data = get_usage_snapshot()
    return {"count": usage_data.get("calls", 0), "limit": FREE_TIER_LIMIT_PER_DAY}
