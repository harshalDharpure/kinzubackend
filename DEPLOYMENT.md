# Backend Deployment Guide

## Render Deployment Configuration

### Build Settings:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Root Directory:** `kizunaback`

### Environment Variables Required:
```
JWT_SECRET=your_jwt_secret_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
PORT=5000
```

### Instance Type:
- **Starter ($7/month)** - Recommended for production
- **Free** - For testing only

### Region:
- **Oregon (US West)** - Recommended for consistency

## Local Development Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install ffmpeg:
- **Windows:** Download from https://ffmpeg.org/download.html
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt-get install ffmpeg`

3. Set up environment variables in `.env` file
4. Run: `npm run dev` 