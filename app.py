from flask import Flask, request, jsonify, send_file, session, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dotenv import load_dotenv
import os
from podcastfy.client import generate_podcast
import shutil
from contextlib import contextmanager
import tempfile

# Load environment variables
load_dotenv()

# Create required directories
TEMP_DIR = '/tmp/audio'
os.makedirs(TEMP_DIR, exist_ok=True)

app = Flask(__name__,
    static_folder='static',
    static_url_path=''
)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(24))

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
        tts_model = data.get('tts_model', 'gemini')
        print(f"\nSelected TTS Model: {tts_model}")

        # Set up API keys based on selected model
        api_key_label = None
        if tts_model == 'gemini':
            api_key = data.get('google_key')
            if not api_key:
                raise ValueError("Missing Google API key")
            os.environ['GOOGLE_API_KEY'] = api_key
            os.environ['GEMINI_API_KEY'] = api_key
            api_key_label = 'GEMINI_API_KEY'

            # Test Gemini API
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content("Test message")
                print("\n=== Gemini API Test Successful ===")
            except Exception as e:
                print("\n=== Gemini API Test Failed ===")
                print(f"Error: {str(e)}")
                raise

        elif tts_model == 'openai':
            api_key = data.get('openai_key')
            if not api_key:
                raise ValueError("Missing OpenAI API key")
            os.environ['OPENAI_API_KEY'] = api_key
            api_key_label = 'OPENAI_API_KEY'

            # Test OpenAI API
            try:
                import openai
                openai.api_key = api_key
                response = openai.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Test message"}]
                )
                print("\n=== OpenAI API Test Successful ===")
            except Exception as e:
                print("\n=== OpenAI API Test Failed ===")
                print(f"Error: {str(e)}")
                raise

        conversation_config = {
            'word_count': int(data.get('word_count', 4000)),
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
                'default_tts_model': 'gemini',
                'audio_format': 'mp3'
            }
        }

        emit('status', "Generating podcast content...")
        emit('progress', {'progress': 30, 'message': 'Generating podcast content...'})

        result = generate_podcast(
            urls=data.get('urls', []),
            conversation_config=conversation_config,
            tts_model=tts_model,
            api_key_label=api_key_label  # This tells podcastfy which env var to use
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

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Serve generated audio files"""
    return send_file(os.path.join(TEMP_DIR, filename))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)