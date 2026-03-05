#!/bin/bash

# Configuration
PROJECT_ID="calendarize-452205"
REPO_NAME="calendarize-repo"
SERVICE_NAME="ai-text-to-calendar"
REGION="us-west1"
IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend:latest"

echo "🚀 Starting build for $SERVICE_NAME..."

# 1. Build the image in the cloud
gcloud builds submit --tag $IMAGE_PATH .

# 2. Deploy to Cloud Run
echo "🌍 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_PATH \
  --region $REGION \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --allow-unauthenticated

echo "✅ Deployment Complete!"
