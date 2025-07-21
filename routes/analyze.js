const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const auth = require('../middleware/auth');
const fs = require('fs');
const { uploadFileToS3 } = require('../middleware/s3');
const { createVoiceData, getVoiceDataByUser } = require('../middleware/dynamodb');

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

        // Save file temporarily for analysis
        const tempPath = path.join(__dirname, `temp-${uniqueSuffix}.wav`);
        fs.writeFileSync(tempPath, req.file.buffer);

        // Try Python analysis first, fallback to Node.js
        const tryPythonAnalysis = () => {
            return new Promise((resolve, reject) => {
                const pythonProcess = spawn('python3.11', ['analysis/analyze_audio.py', tempPath], {
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

                pythonProcess.on('close', (code) => {
                    if (code === 0 && analysisData.trim()) {
                        try {
                            const result = JSON.parse(analysisData);
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`Python analysis failed: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`Python process failed: ${errorData}`));
                    }
                });
            });
        };

        // Fallback to Node.js analysis
        const tryNodeAnalysis = () => {
            return new Promise((resolve, reject) => {
                const nodeProcess = spawn('node', ['analysis/analyze_audio_node.js', tempPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let analysisData = '';
                let errorData = '';

                nodeProcess.stdout.on('data', (data) => {
                    analysisData += data.toString();
                });

                nodeProcess.stderr.on('data', (data) => {
                    errorData += data.toString();
                });

                nodeProcess.on('close', (code) => {
                    if (code === 0 && analysisData.trim()) {
                        try {
                            const result = JSON.parse(analysisData);
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`Node analysis failed: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`Node process failed: ${errorData}`));
                    }
                });
            });
        };

        // Try Python first, then Node.js
        let result;
        try {
            result = await tryPythonAnalysis();
            console.log('Python analysis successful');
        } catch (pythonError) {
            console.log('Python analysis failed, trying Node.js fallback:', pythonError.message);
            try {
                result = await tryNodeAnalysis();
                console.log('Node.js analysis successful');
            } catch (nodeError) {
                fs.unlinkSync(tempPath); // Clean up temp file
                return res.status(500).json({ 
                    error: 'Both Python and Node.js analysis failed',
                    pythonError: pythonError.message,
                    nodeError: nodeError.message
                });
            }
        }
        
        fs.unlinkSync(tempPath); // Clean up temp file
        
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

// Test endpoint to debug analysis
router.get('/test', auth, async (req, res) => {
    try {
        // Test Python availability
        const { spawn } = require('child_process');
        const pythonTest = spawn('python3.11', ['--version']);
        
        let pythonVersion = '';
        let pythonError = '';
        
        pythonTest.stdout.on('data', (data) => {
            pythonVersion += data.toString();
        });
        
        pythonTest.stderr.on('data', (data) => {
            pythonError += data.toString();
        });
        
        pythonTest.on('close', (code) => {
            // Test Node.js analysis
            const nodeTest = spawn('node', ['analysis/analyze_audio_node.js', 'test']);
            
            let nodeOutput = '';
            let nodeError = '';
            
            nodeTest.stdout.on('data', (data) => {
                nodeOutput += data.toString();
            });
            
            nodeTest.stderr.on('data', (data) => {
                nodeError += data.toString();
            });
            
            nodeTest.on('close', (nodeCode) => {
                res.json({
                    python: {
                        available: code === 0,
                        version: pythonVersion.trim(),
                        error: pythonError
                    },
                    node: {
                        available: nodeCode === 0,
                        output: nodeOutput.trim(),
                        error: nodeError
                    },
                    environment: {
                        nodeEnv: process.env.NODE_ENV,
                        pythonPath: process.env.PYTHONPATH,
                        workingDir: process.cwd()
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test route for Python availability
router.get('/test-python', (req, res) => {
    try {
        // Test Python availability
        const { spawn } = require('child_process');
        const pythonTest = spawn('python3.11', ['--version']);
        
        let pythonVersion = '';
        let errorOutput = '';

        pythonTest.stdout.on('data', (data) => {
            pythonVersion += data.toString();
        });

        pythonTest.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonTest.on('close', (code) => {
            if (code === 0) {
                res.json({ success: true, version: pythonVersion.trim() });
            } else {
                res.status(500).json({ success: false, error: 'Python not found or failed', details: errorOutput });
            }
        });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
