#!/bin/bash

# Configuration
PROJECT_ID="calendarize-452205"
REPO_NAME="calendarize-repo"
SERVICE_NAME="ai-text-to-calendar"
REGION="us-west1"
IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest"

# Production URLs
FRONTEND_URL="https://calendarize.ratcliff.cc"
CALLBACK_URL="https://api.calendarize.ratcliff.cc/auth/google/callback"

echo "🚀 Starting build for $SERVICE_NAME..."

# 1. Build the image in the cloud
gcloud builds submit --tag $IMAGE_PATH .

# 2. Deploy to Cloud Run
echo "🌍 Deploying to Cloud Run..."
# We mount secrets as files at the exact paths the code expects
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_PATH \
  --region $REGION \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,/app/utils/client_secret.json=GOOGLE_CLIENT_SECRET:latest,/app/event_generation/config/firebase_servicekey.json=FIREBASE_SERVICE_KEY:latest" \
  --set-env-vars="ENV=production,FRONTEND_URL=$FRONTEND_URL,CALLBACK_URL=$CALLBACK_URL" \
  --allow-unauthenticated

echo "✅ Deployment Complete!"
