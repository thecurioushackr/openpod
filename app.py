from flask import Flask, request, jsonify, send_file, session, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dotenv import load_dotenv
import os
from podcastfy.client import generate_podcast
import shutil
from contextlib import contextmanager
import tempfile
from functools import wraps
import jwt
from datetime import datetime, timedelta
from pathlib import Path

# Load environment variables with explicit path and override
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Create required directories
TEMP_DIR = '/tmp/audio'
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
AUDIO_DIR = os.path.join(STATIC_DIR, 'audio')
TRANSCRIPT_DIR = os.path.join(STATIC_DIR, 'transcripts')

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)

app = Flask(__name__,
    static_folder='static',
    static_url_path='/static'
)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(24))

# Load API token after ensuring .env is loaded
API_TOKEN = os.getenv('API_TOKEN')
if not API_TOKEN:
    raise ValueError("API_TOKEN must be set in .env file")

# Enable CORS in development
if app.debug:
    CORS(app)
    # Serve index.html from root directory in development
    @app.route('/')
    def index():
        return send_file('../index.html')
else:
    # Serve static files in production
    @app.route('/')
    def index():
        return send_file('static/index.html')

socketio = SocketIO(app, cors_allowed_origins="*")

def require_api_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'No token provided'}), 401

        if not token.startswith('Bearer '):
            return jsonify({'error': 'Invalid token format'}), 401

        token = token.split('Bearer ')[1]

        if token != API_TOKEN:
            return jsonify({'error': f'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated

@contextmanager
def temporary_env(temp_env):
    """Temporarily set environment variables and restore them afterwards."""
    original_env = dict(os.environ)
    os.environ.update(temp_env)
    try:
        yield
    finally:
        os.environ.clear()
        os.environ.update(original_env)

@contextmanager
def temporary_env_file(env_vars):
    """Creates a temporary .env file with the provided variables."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as temp_env:
        # Write variables to temp file
        for key, value in env_vars.items():
            temp_env.write(f"{key}={value}\n")
        temp_env.flush()

        # Store original env file path if it exists
        original_env_path = os.getenv('ENV_FILE')

        try:
            # Set the ENV_FILE environment variable to point to our temp file
            os.environ['ENV_FILE'] = temp_env.name
            yield
        finally:
            # Restore original ENV_FILE if it existed
            if original_env_path:
                os.environ['ENV_FILE'] = original_env_path
            else:
                os.environ.pop('ENV_FILE', None)
            # Clean up temp file
            os.unlink(temp_env.name)

@socketio.on('connect')
def handle_connect():
    print("\n=== Socket Connected ===")
    print(f"Client ID: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print("\n=== Socket Disconnected ===")
    print(f"Client ID: {request.sid}")

@socketio.on('generate_podcast')
def handle_generate_podcast(data):
    try:
        print("\n=== Starting Podcast Generation ===")
        emit('status', "Starting podcast generation...")

        # Get the selected TTS model
        tts_model = data.get('tts_model', 'geminimulti')
        print(f"\nSelected TTS Model: {tts_model}")

        # Set up API keys based on selected model
        api_key_label = None
        if tts_model in ['gemini', 'geminimulti']:
            api_key = data.get('google_key')
            if not api_key:
                raise ValueError("Missing Google API key")
            os.environ['GOOGLE_API_KEY'] = api_key
            os.environ['GEMINI_API_KEY'] = api_key
            api_key_label = 'GEMINI_API_KEY'

        conversation_config = {
            'creativity': float(data.get('creativity', 0.7)),
            'conversation_style': data.get('conversation_style', []),
            'roles_person1': data.get('roles_person1', 'Interviewer'),
            'roles_person2': data.get('roles_person2', 'Subject matter expert'),
            'dialogue_structure': data.get('dialogue_structure', []),
            'podcast_name': data.get('name'),
            'podcast_tagline': data.get('tagline'),
            'output_language': 'English',
            'user_instructions': data.get('user_instructions'),
            'engagement_techniques': data.get('engagement_techniques', []),
            'text_to_speech': {
                'temp_audio_dir': TEMP_DIR,
                'ending_message': "Thank you for listening to this episode.",
                'default_tts_model': 'geminimulti',
                'audio_format': 'mp3'
            }
        }

        emit('status', "Generating podcast content...")
        emit('progress', {'progress': 30, 'message': 'Generating podcast content...'})

        # Add image_paths parameter if provided
        image_paths = data.get('image_urls', [])

        result = generate_podcast(
            urls=data.get('urls', []),
            conversation_config=conversation_config,
            tts_model=tts_model,
            longform=bool(data.get('is_long_form', False)),
            api_key_label=api_key_label,  # This tells podcastfy which env var to use
            image_paths=image_paths if image_paths else None  # Only pass if not empty
        )

        emit('status', "Processing audio...")
        emit('progress', {'progress': 90, 'message': 'Processing final audio...'})

        # Handle the result
        if isinstance(result, str) and os.path.isfile(result):
            filename = f"podcast_{os.urandom(8).hex()}.mp3"
            output_path = os.path.join(TEMP_DIR, filename)
            shutil.copy2(result, output_path)
            emit('progress', {'progress': 100, 'message': 'Podcast generation complete!'})
            emit('complete', {
                'audioUrl': f'/audio/{filename}',
                'transcript': None
            }, room=request.sid)
        elif hasattr(result, 'audio_path'):
            filename = f"podcast_{os.urandom(8).hex()}.mp3"
            output_path = os.path.join(TEMP_DIR, filename)
            shutil.copy2(result.audio_path, output_path)
            emit('complete', {
                'audioUrl': f'/audio/{filename}',
                'transcript': result.details if hasattr(result, 'details') else None
            }, room=request.sid)
        else:
            raise Exception('Invalid result format')

    except Exception as e:
        print(f"\nError in handle_generate_podcast: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        emit('error', {'message': str(e)}, room=request.sid)

@socketio.on('generate_news_podcast')
def handle_generate_news_podcast(data):
    try:
        print("\n=== Starting News Podcast Generation ===")
        emit('status', "Starting news podcast generation...")

        # Get the API key and topics
        api_key = data.get('google_key')
        topics = data.get('topics')

        if not api_key:
            raise ValueError("Missing Google API key")
        if not topics:
            raise ValueError("No topics provided")

        print(f"Topics: {topics}")

        # Set environment variables
        os.environ['GOOGLE_API_KEY'] = api_key
        os.environ['GEMINI_API_KEY'] = api_key

        # Test the API key
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content("Test message")
            print("\n=== API Test Successful ===")
        except Exception as e:
            print("\n=== API Test Failed ===")
            print(f"Error: {str(e)}")
            raise

        emit('status', "Generating news podcast...")
        emit('progress', {'progress': 30, 'message': 'Generating content...'})

        # Use a different function for news podcasts
        result = generate_podcast(
            topic=topics,
            tts_model='gemini',
            api_key_label='GEMINI_API_KEY'
        )

        emit('status', "Processing audio...")
        emit('progress', {'progress': 90, 'message': 'Processing final audio...'})

        # Handle the result
        if isinstance(result, str) and os.path.isfile(result):
            filename = f"news_podcast_{os.urandom(8).hex()}.mp3"
            output_path = os.path.join(TEMP_DIR, filename)
            shutil.copy2(result, output_path)
            emit('progress', {'progress': 100, 'message': 'Podcast generation complete!'})
            emit('complete', {
                'audioUrl': f'/audio/{filename}',
                'transcript': None
            }, room=request.sid)
        elif hasattr(result, 'audio_path'):
            filename = f"news_podcast_{os.urandom(8).hex()}.mp3"
            output_path = os.path.join(TEMP_DIR, filename)
            shutil.copy2(result.audio_path, output_path)
            emit('complete', {
                'audioUrl': f'/audio/{filename}',
                'transcript': result.details if hasattr(result, 'details') else None
            }, room=request.sid)
        else:
            raise Exception('Invalid result format')

    except Exception as e:
        print(f"\nError in handle_generate_news_podcast: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        emit('error', {'message': str(e)}, room=request.sid)

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Serve generated audio files"""
    # Check all possible audio paths
    possible_paths = [
        os.path.join('data/audio', filename),
        os.path.join(AUDIO_DIR, filename),
        # Add any additional mounted volume paths here
        "/app/data/audio/" + filename,
    ]

    for path in possible_paths:
        if os.path.exists(path):
            print(f"Serving audio from: {path}")
            return send_file(path)

    return jsonify({'error': 'Audio file not found'}), 404

@app.route('/api/generate-from-transcript', methods=['POST'])
@require_api_token
def generate_from_transcript():
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'transcript' not in data:
            return jsonify({'error': 'Missing transcript in request body'}), 400

        # Extract parameters from request
        transcript = data['transcript']
        tts_model = data.get('tts_model', 'geminimulti')

        # Create temporary transcript file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write(transcript)
            transcript_path = temp_file.name

        print(f"Created temporary transcript file: {transcript_path}")

        # Build conversation config from request data or use defaults
        conversation_config = {
            'creativity': float(data.get('creativity', 0.7)),
            'conversation_style': data.get('conversation_style', ['casual']),
            'roles_person1': data.get('roles_person1', 'Host'),
            'roles_person2': data.get('roles_person2', 'Guest'),
            'dialogue_structure': data.get('dialogue_structure', ['Introduction', 'Content', 'Conclusion']),
            'podcast_name': data.get('podcast_name', 'Custom Transcript Podcast'),
            'podcast_tagline': data.get('podcast_tagline', ''),
            'output_language': data.get('output_language', 'English'),
            'user_instructions': data.get('user_instructions', ''),
            'engagement_techniques': data.get('engagement_techniques', []),
            'text_to_speech': {
                'temp_audio_dir': 'data/audio',  # Let podcastfy use its default
                'ending_message': data.get('ending_message', "Thank you for listening to this episode."),
                'default_tts_model': tts_model,
                'audio_format': 'mp3',
                'output_directories': {
                    'audio': 'data/audio',
                    'transcripts': 'data/transcripts'
                }
            }
        }

        # Set up API keys if needed
        api_key_label = None
        if tts_model in ['gemini', 'geminimulti']:
            api_key = data.get('google_key')
            if not api_key:
                return jsonify({'error': 'Missing Google API key'}), 400
            os.environ['GOOGLE_API_KEY'] = api_key
            os.environ['GEMINI_API_KEY'] = api_key
            api_key_label = 'GEMINI_API_KEY'

        # Generate the podcast
        result = generate_podcast(
            transcript_file=transcript_path,
            conversation_config=conversation_config,
            tts_model=tts_model,
            api_key_label=api_key_label
        )

        # Clean up temporary file
        try:
            os.unlink(transcript_path)
            print(f"Cleaned up temporary transcript file: {transcript_path}")
        except Exception as e:
            print(f"Warning: Could not delete temporary file {transcript_path}: {e}")

        # Handle the result
        if isinstance(result, str):
            return jsonify({
                'success': True,
                'audio_url': f'/audio/{os.path.basename(result)}',
            })
        elif hasattr(result, 'audio_path'):
            print(f"Audio file path: {result.audio_path}")
            print(f"File exists: {os.path.exists(result.audio_path)}")
            return jsonify({
                'success': True,
                'audio_url': f'/audio/{os.path.basename(result.audio_path)}',
                'transcript': result.details if hasattr(result, 'details') else None
            })
        else:
            return jsonify({'error': 'Invalid result format'}), 500

    except Exception as e:
        print(f"\nError in generate_from_transcript: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-env', methods=['GET'])
def test_env():
    """Test endpoint to verify environment variables"""
    return jsonify({
        'api_token_set': bool(API_TOKEN),
        'api_token_length': len(API_TOKEN) if API_TOKEN else 0,
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    socketio.run(app,
                 host='0.0.0.0',
                 port=port,
                 debug=False,  # Set to False in production
                 allow_unsafe_werkzeug=True)