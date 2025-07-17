<<<<<<< HEAD
# Kinabot Backend

This is the backend server for the Kinabot application, which provides audio analysis and AI-powered communication insights.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/kinabot
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

3. Start the development server:
```bash
npm run dev
```

## Required Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `GEMINI_API_KEY`: Google Gemini API key for AI analysis
- `PORT`: Server port (default: 5000)

## Features

- Audio file analysis
- Speech-to-text transcription
- Sentiment analysis
- Lexical diversity analysis
- Sentence complexity analysis
- AI-powered communication insights using Google Gemini

## API Endpoints

- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login
- `POST /api/analyze/audio`: Audio file analysis
- `POST /api/gemini/analyze`: AI-powered communication insights 
=======
# kinzubackend
Backend Work
>>>>>>> 12f8c1971c04e15c28e49c4fc3f88455297df6d2
