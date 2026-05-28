#!/bin/bash

# AI Cybersecurity Platform Startup Script

echo "Starting AI Cybersecurity Platform..."

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "Starting server on port 4356..."
node server.js
