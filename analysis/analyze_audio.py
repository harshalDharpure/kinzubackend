import sys
import json
import speech_recognition as sr
from pydub import AudioSegment
from textblob import TextBlob
import textwrap
import re
import os

def format_text(text, width=80):
    sentences = text.replace('. ', '.\n').replace('? ', '?\n').replace('! ', '!\n')
    return textwrap.fill(sentences, width=width)

def lexical_diversity(text):
    words = re.findall(r'\b\w+\b', text.lower())
    total_words = len(words)
    unique_words = len(set(words))
    score = unique_words / total_words if total_words else 0
    return score, total_words, unique_words

def sentence_complexity(text):
    sentences = re.split(r'[.!?]', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    num_sentences = len(sentences)
    words = re.findall(r'\b\w+\b', text)

    avg_sentence_length = len(words) / num_sentences if num_sentences else 0

    conjunctions = ['and', 'but', 'or', 'because', 'although', 'since', 'while', 'if', 'when', 'though']
    conjunction_count = sum(text.lower().count(c) for c in conjunctions)

    feedback = "✅ Balanced complexity." if avg_sentence_length > 12 and conjunction_count >= num_sentences else "⚠️ Simple or flat sentence structure."

    return avg_sentence_length, conjunction_count, feedback

def output_json(data):
    """Helper function to output JSON and handle errors"""
    try:
        json_str = json.dumps(data)
        print(json_str)
        sys.stdout.flush()  # Ensure the output is flushed immediately
    except Exception as e:
        error_data = {
            "error": "Failed to serialize output",
            "details": str(e)
        }
        print(json.dumps(error_data))
        sys.stdout.flush()
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        output_json({"error": "No audio file path provided"})
        sys.exit(1)

    audio_file = sys.argv[1]
    language = 'en-US'
    recognizer = sr.Recognizer()

    try:
        # Preprocess audio
        audio = AudioSegment.from_file(audio_file)
        audio = audio.set_frame_rate(16000)
        temp_wav_file = "temp.wav"
        audio.export(temp_wav_file, format="wav")

        with sr.AudioFile(temp_wav_file) as source:
            audio_data = recognizer.record(source)

        # Transcription
        text = recognizer.recognize_google(audio_data, language=language)
        formatted_text = format_text(text)

        # Sentiment
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity

        # Lexical Diversity
        diversity, total_words, unique_words = lexical_diversity(text)
        lex_pattern = "✅ Diverse vocabulary." if diversity > 0.5 else "⚠️ Repeated words or less variety."

        # Sentence Complexity
        avg_len, conj_count, complexity_feedback = sentence_complexity(text)

        # Clean up temp file
        if os.path.exists(temp_wav_file):
            os.remove(temp_wav_file)

        # Output as JSON with consistent property names
        result = {
            "transcribedText": formatted_text,
            "polarityScore": polarity,
            "subjectivityScore": subjectivity,
            "totalWords": total_words,
            "uniqueWords": unique_words,
            "diversityScore": diversity,
            "diversityFeedback": lex_pattern,
            "avgSentenceLength": avg_len,
            "conjunctionCount": conj_count,
            "complexityFeedback": complexity_feedback
        }
        output_json(result)
    except sr.UnknownValueError:
        output_json({"error": "Speech Recognition could not understand audio"})
        sys.exit(1)
    except sr.RequestError as e:
        output_json({"error": f"Could not request results from Speech Recognition service: {e}"})
        sys.exit(1)
    except Exception as e:
        output_json({"error": f"An error occurred: {e}"})
        sys.exit(1)

if __name__ == "__main__":
    main()
