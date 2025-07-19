const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Text analysis functions
function lexicalDiversity(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const totalWords = words.length;
    const uniqueWords = new Set(words).size;
    const score = totalWords > 0 ? uniqueWords / totalWords : 0;
    return { score, totalWords, uniqueWords };
}

function sentenceComplexity(text) {
    const sentences = text.split(/[.!?]/).filter(s => s.trim());
    const numSentences = sentences.length;
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    const avgSentenceLength = numSentences > 0 ? words.length / numSentences : 0;
    
    const conjunctions = ['and', 'but', 'or', 'because', 'although', 'since', 'while', 'if', 'when', 'though'];
    const conjunctionCount = conjunctions.reduce((count, conj) => 
        count + (text.toLowerCase().match(new RegExp(`\\b${conj}\\b`, 'g')) || []).length, 0);
    
    const feedback = avgSentenceLength > 12 && conjunctionCount >= numSentences 
        ? "✅ Balanced complexity." 
        : "⚠️ Simple or flat sentence structure.";
    
    return { avgSentenceLength, conjunctionCount, feedback };
}

function formatText(text, width = 80) {
    return text.replace(/\. /g, '.\n').replace(/\? /g, '?\n').replace(/! /g, '!\n');
}

// Simple sentiment analysis (basic implementation)
function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    const polarity = (positiveCount - negativeCount) / Math.max(words.length, 1);
    const subjectivity = Math.min((positiveCount + negativeCount) / Math.max(words.length, 1), 1);
    
    return { polarity, subjectivity };
}

function main() {
    const audioFile = process.argv[2];
    
    if (!audioFile) {
        console.error(JSON.stringify({ error: "No audio file path provided" }));
        process.exit(1);
    }
    
    // For now, return a mock result since we need Google Speech API integration
    // In production, you'd integrate with Google Cloud Speech-to-Text API
    const mockText = "This is a sample transcription of the audio file. The analysis would be performed on the actual transcribed text.";
    
    try {
        const formattedText = formatText(mockText);
        const { polarity, subjectivity } = analyzeSentiment(mockText);
        const { score: diversity, totalWords, uniqueWords } = lexicalDiversity(mockText);
        const { avgSentenceLength, conjunctionCount, feedback: complexityFeedback } = sentenceComplexity(mockText);
        
        const lexPattern = diversity > 0.5 ? "✅ Diverse vocabulary." : "⚠️ Repeated words or less variety.";
        
        const result = {
            transcribedText: formattedText,
            polarityScore: polarity,
            subjectivityScore: subjectivity,
            totalWords,
            uniqueWords,
            diversityScore: diversity,
            diversityFeedback: lexPattern,
            avgSentenceLength,
            conjunctionCount,
            complexityFeedback
        };
        
        console.log(JSON.stringify(result));
    } catch (error) {
        console.error(JSON.stringify({ error: `An error occurred: ${error.message}` }));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { lexicalDiversity, sentenceComplexity, analyzeSentiment, formatText }; 