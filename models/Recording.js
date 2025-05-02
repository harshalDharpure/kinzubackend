const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    audioFile: {
        type: String,
        required: true
    },
    transcribedText: {
        type: String,
        required: true
    },
    analysis: {
        polarityScore: Number,
        subjectivityScore: Number,
        totalWords: Number,
        uniqueWords: Number,
        diversityScore: Number,
        avgSentenceLength: Number,
        conjunctionCount: Number,
        diversityFeedback: String,
        complexityFeedback: String
    },
    geminiInsights: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Recording', recordingSchema); 