const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateInsights(analysisData) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = `
        Based on the following audio analysis data, provide simple and easy-to-understand insights in the following categories.
        Use plain text without any markdown formatting or special characters.
        Keep the language simple and conversational.

        Categories:
        1. Tone and Emotion: How does the speaker sound? What emotions come through?
        2. Vocabulary and Style: How does the speaker use words? Is it formal or casual?
        3. Sentence Structure: How are the sentences put together? Are they simple or complex?
        4. Overall Style: What's the general way of speaking? Any notable patterns?

        Analysis Data:
        - Transcribed Text: ${analysisData.transcribedText || ''}
        - Polarity Score: ${analysisData.polarityScore || 0}
        - Subjectivity Score: ${analysisData.subjectivityScore || 0}
        - Total Words: ${analysisData.totalWords || 0}
        - Unique Words: ${analysisData.uniqueWords || 0}
        - Diversity Score: ${analysisData.diversityScore || 0}
        - Average Sentence Length: ${analysisData.avgSentenceLength || 0}
        - Conjunction Count: ${analysisData.conjunctionCount || 0}

        Please provide a clear, simple response with these four sections.
        Use everyday language that anyone can understand.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            insights: text
        };
    } catch (error) {
        console.error('Error in Gemini analysis:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    generateInsights
}; 