from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import os
import requests
from bs4 import BeautifulSoup
import time
from threading import Thread
import tempfile
import shutil
import json
from urllib.parse import urlparse
import google.cloud.texttospeech as tts
import openai
from elevenlabs import generate as elevenlabs_generate
import numpy as np

# Load environment variables
load_dotenv()

# Create required directories
TEMP_DIR = '/tmp/audio'
os.makedirs(TEMP_DIR, exist_ok=True)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(24))
socketio = SocketIO(app, cors_allowed_origins="*")

def extract_content(url, sid):
    """Extract content from URL with progress updates"""
    try:
        emit('status', {'message': f'Extracting content from {urlparse(url).netloc}'}, room=sid)
        
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
            
        # Get main content
        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        content = ' '.join(main_content.stripped_strings)
        
        return content
    except Exception as e:
        emit('status', {'message': f'Error extracting from {url}: {str(e)}'}, room=sid)
        return None

def generate_script(contents, config, sid):
    """Generate podcast script using AI"""
    emit('status', {'message': 'Generating podcast script...'}, room=sid)
    
    # Use OpenAI for script generation
    openai.api_key = os.getenv('OPENAI_API_KEY')
    
    prompt = f"""Create a podcast script for '{config['name']}' with tagline '{config['tagline']}'.
    Use the following content as source material:
    {contents[:4000]}... 
    
    Additional instructions: {config.get('instructions', '')}
    
    Format as a natural conversation between two hosts."""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        emit('status', {'message': f'Error generating script: {str(e)}'}, room=sid)
        raise

def generate_audio(script, sid):
    """Generate audio using text-to-speech"""
    emit('status', {'message': 'Converting script to audio...'}, room=sid)
    
    try:
        # Use ElevenLabs for more natural TTS
        audio = elevenlabs_generate(
            text=script,
            api_key=os.getenv('ELEVENLABS_API_KEY'),
            voice="Josh",  # Professional male voice
        )
        
        # Save audio file
        filename = f"podcast_{os.urandom(8).hex()}.mp3"
        output_path = os.path.join(TEMP_DIR, filename)
        
        with open(output_path, 'wb') as f:
            f.write(audio)
            
        return output_path
    except Exception as e:
        emit('status', {'message': f'Error generating audio: {str(e)}'}, room=sid)
        raise

def generate_podcast(data, sid):
    """Main podcast generation process"""
    try:
        urls = data['urls']
        config = {
            'name': data['name'],
            'tagline': data['tagline'],
            'instructions': data.get('instructions', '')
        }
        
        # Extract content from URLs
        contents = []
        total_urls = len(urls)
        
        for i, url in enumerate(urls, 1):
            content = extract_content(url, sid)
            if content:
                contents.append(content)
            progress = (i / total_urls) * 30
            emit('progress', {'progress': progress}, room=sid)
            
        # Generate script
        combined_content = ' '.join(contents)
        script = generate_script(combined_content, config, sid)
        emit('progress', {'progress': 60}, room=sid)
        
        # Generate audio
        audio_path = generate_audio(script, sid)
        emit('progress', {'progress': 90}, room=sid)
        
        # Final processing
        emit('progress', {'progress': 100}, room=sid)
        
        # Send completion with audio URL
        emit('complete', {
            'audioUrl': f'/audio/{os.path.basename(audio_path)}',
            'transcript': script
        }, room=sid)
        
    except Exception as e:
        emit('error', {'message': str(e)}, room=sid)

@socketio.on('generate_podcast')
def handle_generate_podcast(data):
    """Handle podcast generation request"""
    Thread(target=generate_podcast, args=(data, request.sid)).start()
    return {'status': 'processing'}

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Serve generated audio files"""
    return send_file(os.path.join(TEMP_DIR, filename))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)