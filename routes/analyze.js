const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const Recording = require('../models/Recording');
const auth = require('../middleware/auth');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
console.log('Uploads directory path:', uploadsDir);
console.log('Current working directory:', process.cwd());

if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created successfully');
} else {
    console.log('Uploads directory already exists');
}

// Configure multer for audio file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Setting destination to:', uploadsDir);
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        console.log('Generated filename:', filename);
        cb(null, filename);
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
        console.log('Uploaded file path:', audioPath);
        console.log('File details:', {
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size
        });

        const pythonProcess = spawn('python', ['analysis/analyze_audio.py', audioPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let analysisData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            console.log('Python stdout:', data.toString());
            analysisData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python stderr:', data.toString());
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            // Clean up the uploaded file after processing
            try {
                console.log('Attempting to delete file:', audioPath);
                fs.unlinkSync(audioPath);
                console.log('File deleted successfully');
            } catch (err) {
                console.error('Error deleting temporary file:', err);
            }

            if (code !== 0) {
                console.error('Python process exited with code:', code);
                console.error('Error output:', errorData);
                return res.status(500).json({ 
                    error: 'Analysis failed', 
                    details: errorData,
                    code: code
                });
            }

            try {
                console.log('Raw Python output:', analysisData);
                const result = JSON.parse(analysisData);
                console.log('Parsed result:', result);
                
                // Save recording to database
                const recording = new Recording({
                    user: req.user.id,
                    audioFile: req.file.filename,
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
                    }
                });

                await recording.save();
                console.log('Recording saved to database with ID:', recording._id);

                // Return both the analysis results and the recording ID
                res.json({
                    ...result,
                    recordingId: recording._id
                });
            } catch (error) {
                console.error('Error processing Python output:', error);
                console.error('Raw output that failed to parse:', analysisData);
                res.status(500).json({ 
                    error: 'Failed to process analysis results',
                    details: error.message,
                    rawOutput: analysisData
                });
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            res.status(500).json({ 
                error: 'Failed to start analysis process',
                details: error.message
            });
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
