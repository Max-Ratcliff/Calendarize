# Use a slim image to stay under the 0.5GB Free Tier storage limit
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app files from src/backend
COPY . .

# Cloud Run uses the $PORT environment variable
ENV PORT 8080

# Run with uvicorn, binding to the dynamic $PORT
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
