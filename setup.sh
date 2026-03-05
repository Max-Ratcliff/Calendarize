#!/bin/bash


echo "Installing dependencies..."
# Install Python dependencies
cd src/backend || { echo "Backend directory not found"; exit 1; }
pip install -r requirements.txt

cd ..

# Install Node.js dependencies
cd frontend || { echo "Frontend directory not found"; exit 1; }
npm install

echo "depenedencies installed"
echo "setting up the environment"

# place .env.local file in the root directory
# with the following content:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

if [ -f ".env.local" ]; then
    echo ".env.local file exists."
else
    echo ".env.local file does not exist."
    echo "writing .env file"
    echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local
fi

cd ../backend/event_generation/config || { echo "config file not found"; exit 1; }

if [ -f ".env" ]; then
    echo ".env file exists. please make sure your API key is up to date"
else
    echo ".env file does not exist."
    echo "writing .env file"
    read -p "Please enter your Gemini API key: " API_KEY
    echo "GEMINI_API_KEY=\"$API_KEY\"" > .env
    echo "MODEL=\"gemini\"" >> .env
fi


cd ../..
