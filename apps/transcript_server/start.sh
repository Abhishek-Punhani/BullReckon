#!/bin/bash

# Startup script for Transcript Server

cd "$(dirname "$0")"

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Installing dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

# Activate venv and run server
echo "Starting Transcript Server..."
./venv/bin/python server.py

