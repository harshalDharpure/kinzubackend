# Use Node.js 20 slim as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg python3.11 python3.11-venv python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency definition files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm install

# Set up Python virtual environment
RUN python3.11 -m venv venv
ENV PATH="/app/venv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application source code
COPY . .

# Expose the application port
EXPOSE 5000

# The command to run the application
CMD [ "npm", "start" ] 