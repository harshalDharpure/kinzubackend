#!/bin/bash

echo "Starting build process..."

# Update package list
apt-get update

# Install system dependencies
echo "Installing system dependencies..."
apt-get install -y ffmpeg python3 python3-pip python3-venv

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create virtual environment for Python
echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Verify installations
echo "Verifying installations..."
python3 -c "import speech_recognition; print('SpeechRecognition installed')"
python3 -c "import pydub; print('pydub installed')"
python3 -c "import textblob; print('textblob installed')"

echo "Build completed successfully!" 