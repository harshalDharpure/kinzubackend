const express = require('express');
const router = express.Router();
const { generateInsights } = require('../analysis/gemini_analysis');
const Recording = require('../models/Recording');
const auth = require('../middleware/auth');

router.post('/analyze', auth, async (req, res) => {
    try {
        const { recordingId, analysisData } = req.body;
        
        if (!recordingId || !analysisData) {
            return res.status(400).json({ error: 'Recording ID and analysis data are required' });
        }

        // Find the recording
        const recording = await Recording.findById(recordingId);
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        // Verify the recording belongs to the user
        if (recording.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized access to recording' });
        }

        const insights = await generateInsights(analysisData);
        
        if (!insights.success) {
            return res.status(500).json({ error: insights.error });
        }

        // Update the recording with Gemini insights
        recording.geminiInsights = insights.insights;
        await recording.save();

        res.json({
            success: true,
            insights: insights.insights
        });
    } catch (error) {
        console.error('Error in Gemini analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 