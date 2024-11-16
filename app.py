from flask import Flask, request, jsonify, send_file, session, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dotenv import load_dotenv
import os
from podcastfy.client import generate_podcast
import shutil

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

def create_callback(sid):
    """Create a callback dictionary for websocket updates"""
    def on_status(message):
        emit('status', {'message': message}, room=sid)

    def on_progress(progress):
        emit('progress', {'progress': progress}, room=sid)

    def on_error(error):
        emit('error', {'message': str(error)}, room=sid)

    return {
        'on_status': on_status,
        'on_progress': on_progress,
        'on_error': on_error
    }

@socketio.on('generate_podcast')
def handle_generate_podcast(data):
    """Handle podcast generation request with websocket updates"""
    try:
        # Set API keys from data
        os.environ['GEMINI_API_KEY'] = data.get('gemini_key', '')
        os.environ['OPENAI_API_KEY'] = data.get('openai_key', '')
        os.environ['ELEVENLABS_API_KEY'] = data.get('elevenlabs_key', '')

        callback = create_callback(request.sid)

        if data.get('mode') == 'news':
            # Handle news podcast generation
            result = generate_podcast(
                topic=data.get('news_topic'),
                tts_model=data.get('tts_model', 'gemini'),
                callback=callback
            )
        else:
            # Handle custom podcast generation
            conversation_config = {
                'word_count': int(data.get('word_count', 4000)),
                'creativity': float(data.get('creativity', 0.7)),
                'conversation_style': data.get('conversation_style', []),
                'roles_person1': data.get('roles_person1', 'Interviewer'),
                'roles_person2': data.get('roles_person2', 'Subject matter expert'),
                'dialogue_structure': data.get('dialogue_structure', []),
                'podcast_name': data.get('podcast_name'),
                'podcast_tagline': data.get('podcast_tagline'),
                'output_language': 'English',
                'user_instructions': data.get('user_instructions'),
                'engagement_techniques': data.get('engagement_techniques', []),
                'text_to_speech': {
                    'temp_audio_dir': TEMP_DIR,
                    'ending_message': "Thank you for listening to this episode.",
                    'default_tts_model': data.get('tts_model', 'gemini'),
                    'audio_format': 'mp3'
                }
            }

            result = generate_podcast(
                urls=data.get('urls', '').split(','),
                conversation_config=conversation_config,
                tts_model=data.get('tts_model', 'gemini'),
                callback=callback
            )

        # Handle the result
        filename = f"podcast_{os.urandom(8).hex()}.mp3"
        output_path = os.path.join(TEMP_DIR, filename)

        if isinstance(result, str) and os.path.isfile(result):
            shutil.copy2(result, output_path)
        elif hasattr(result, 'audio_path'):
            shutil.copy2(result.audio_path, output_path)

        # Send completion with audio URL and transcript
        emit('complete', {
            'audioUrl': f'/audio/{filename}',
            'transcript': result.transcript if hasattr(result, 'transcript') else None
        }, room=request.sid)

    except Exception as e:
        emit('error', {'message': str(e)}, room=request.sid)

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Serve generated audio files"""
    return send_file(os.path.join(TEMP_DIR, filename))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)