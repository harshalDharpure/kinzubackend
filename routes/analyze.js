const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const auth = require('../middleware/auth');
const fs = require('fs');
const { uploadFileToS3 } = require('../middleware/s3');
const { createVoiceData, getVoiceDataByUser } = require('../middleware/dynamodb');
const AWS = require('aws-sdk');

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'audio/wav') {
            return cb(new Error('Only WAV files are allowed'));
        }
        cb(null, true);
    }
});

router.post('/audio', auth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        // Save audio file to S3
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const s3AudioKey = `audio/${req.user.id}/${uniqueSuffix}.wav`;
        await uploadFileToS3(s3AudioKey, req.file.buffer, req.file.mimetype);

        // Save file temporarily for Python analysis
        const tempPath = path.join(__dirname, `temp-${uniqueSuffix}.wav`);
        fs.writeFileSync(tempPath, req.file.buffer);

        const pythonProcess = spawn('python', ['analysis/analyze_audio.py', tempPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let analysisData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            analysisData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            fs.unlinkSync(tempPath); // Clean up temp file
            try {
                const result = JSON.parse(analysisData);
                // Store voice metadata in DynamoDB
                const timestamp = new Date().toISOString();
                const voiceMeta = await createVoiceData({
                    user_uuid: req.user.id,
                    s3_key: s3AudioKey,
                    timestamp,
                    transcribedText: result.transcribedText,
                    analysis: {
                        polarityScore: result.polarityScore,
                        subjectivityScore: result.subjectivityScore,
                        totalWords: result.totalWords,
                        uniqueWords: result.uniqueWords,
                        diversityScore: result.diversityScore,
                        avgSentenceLength: result.avgSentenceLength,
                        conjunctionCount: result.conjunctionCount,
                        diversityFeedback: result.diversityFeedback,
                        complexityFeedback: result.complexityFeedback
                    },
                    createdAt: timestamp
                });
                // Return both the analysis results and the DynamoDB voice record
                res.json({
                    ...result,
                    s3AudioKey,
                    voiceMeta
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to process analysis results',
                    details: error.message,
                    rawOutput: analysisData
                });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's recordings from DynamoDB
router.get('/recordings', auth, async (req, res) => {
    try {
        const recordings = await getVoiceDataByUser(req.user.id);
        res.json(recordings);
    } catch (error) {
        console.error('Error fetching recordings from DynamoDB:', error);
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
});

module.exports = router;
