#!/bin/bash

# Install system dependencies
apt-get update
apt-get install -y ffmpeg python3 python3-pip

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt 