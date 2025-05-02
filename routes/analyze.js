const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const Recording = require('../models/Recording');
const auth = require('../middleware/auth');

// Configure multer for audio file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

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

        const audioPath = req.file.path;
        const pythonProcess = spawn('python', ['analysis/analyze_audio.py', audioPath]);

        let analysisData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            analysisData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                return res.status(500).json({ error: 'Analysis failed', details: errorData });
            }

            try {
                const result = JSON.parse(analysisData);
                
                // Save recording to database
                const recording = new Recording({
                    user: req.user.id,
                    audioFile: audioPath,
                    transcribedText: result.transcribed_text,
                    analysis: {
                        polarityScore: result.polarity_score,
                        subjectivityScore: result.subjectivity_score,
                        totalWords: result.total_words,
                        uniqueWords: result.unique_words,
                        diversityScore: result.diversity_score,
                        avgSentenceLength: result.avg_sentence_length,
                        conjunctionCount: result.conjunction_count,
                        diversityFeedback: result.diversity_feedback,
                        complexityFeedback: result.complexity_feedback
                    }
                });

                await recording.save();

                // Return both the analysis results and the recording ID
                res.json({
                    ...result,
                    recordingId: recording._id
                });
            } catch (error) {
                console.error('Error saving recording:', error);
                res.status(500).json({ error: 'Failed to save recording' });
            }
        });
    } catch (error) {
        console.error('Error in audio analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's recordings
router.get('/recordings', auth, async (req, res) => {
    try {
        const recordings = await Recording.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select('-__v');
        
        res.json(recordings);
    } catch (error) {
        console.error('Error fetching recordings:', error);
        res.status(500).json({ error: 'Failed to fetch recordings' });
    }
});

module.exports = router;
