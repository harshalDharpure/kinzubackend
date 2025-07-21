#!/bin/bash

echo "Starting build process..."

# Stop on any error
set -e

# We don't run apt-get update because Render's filesystem for this is read-only.
# The base image should have up-to-date enough package lists.

# Install system dependencies for a specific Python version
echo "Installing system dependencies for Python 3.11..."
apt-get install -y ffmpeg python3.11 python3.11-pip python3.11-venv

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create virtual environment for Python 3.11
echo "Setting up Python 3.11 virtual environment..."
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies using the venv pip
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Verify installations
echo "Verifying installations..."
python -c "import speech_recognition; print('SpeechRecognition installed')"
python -c "import pydub; print('pydub installed')"
python -c "import textblob; print('textblob installed')"

echo "Build completed successfully!" 