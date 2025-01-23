## AI Podcast Generator

A modern web application that automatically generates engaging podcast conversations from URLs or news topics using AI. Powered by [podcastfy.ai](http://podcastfy.ai).

### Features

- Custom podcast generation from multiple URLs
- Real-time progress updates using WebSocket
- Beautiful UI with shadcn/ui components
- API key management for various AI services
- Support for multiple text-to-speech providers

### Prerequisites

- Node.js 18+
- Python 3.11
- pip
- bun
- pyenv
- Poetry (optional but recommended)
- Fly.io CLI

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/giulioco/openpod
cd openpod
```

2. Set up Python environment:

```bash
# Install Python 3.11.7 with shared libraries enabled
env PYTHON_CONFIGURE_OPTS="--enable-shared" pyenv install 3.11.7
pyenv local 3.11.7

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Unix/MacOS
# or
.\.venv\Scripts\activate  # On Windows

# Upgrade pip
pip install --upgrade pip
```

3. Install dependencies:

```bash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
bun install
```

4. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the development servers:

```bash
bun dev
```

The application will be available at `http://localhost:5173`

### Deployment with Fly.io

1. Install the Fly CLI:

```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly:

```bash
fly auth login
```

3. Create a new app:

```bash
fly launch
```

4. Set up environment variables:

```bash
# Generate a secure API token
openssl rand -hex 32

# Set it in Fly.io
fly secrets set API_TOKEN=your_generated_token
```

5. Create a volume for audio files:

```bash
fly volumes create audio_data --size 1
```

6. Deploy the application:

```bash
# Deploy to Fly.io (this will automatically build both frontend and backend)
fly deploy
```

Your API will be available at:

- Web UI: `https://your-app.fly.dev`
- API Endpoint: `https://your-app.fly.dev/api/generate-from-transcript`

Make sure to include your API token in requests:

```bash
curl -X POST \
  https://your-app.fly.dev/api/generate-from-transcript \
  -H 'Authorization: Bearer your_api_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "transcript": "Your transcript here",
    "podcast_name": "My Podcast",
    "google_key": "your_google_api_key"
  }'
```

### Project Structure

```
.
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   └── hooks/           # Custom React hooks
├── app.py               # Flask backend
├── requirements.txt     # Python dependencies
└── fly.toml            # Fly.io configuration
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### API Endpoints

#### Generate Podcast from Transcript

A secure endpoint that generates podcasts from existing transcripts. Requires API token authentication.

##### Authentication

1. Generate a secure API token and add it to your `.env` file:

```bash
# Generate a secure token
openssl rand -hex 32

# Add to .env
API_TOKEN=your_generated_token
```

##### Endpoint Details

- **URL**: `/api/generate-from-transcript`
- **Method**: `POST`
- **Auth Required**: Yes (Bearer Token)
- **Headers**:
  ```
  Authorization: Bearer your_api_token
  Content-Type: application/json
  ```

##### Request Body

```json
{
  "transcript": "Your conversation transcript here",
  "tts_model": "geminimulti", // optional
  "creativity": 0.7, // optional
  "conversation_style": ["casual", "humorous"], // optional
  "roles_person1": "Host", // optional
  "roles_person2": "Guest", // optional
  "dialogue_structure": ["Introduction", "Content", "Conclusion"], // optional
  "podcast_name": "My Custom Podcast", // optional
  "podcast_tagline": "", // optional
  "output_language": "English", // optional
  "user_instructions": "", // optional
  "engagement_techniques": [], // optional
  "ending_message": "Thank you for listening", // optional
  "google_key": "your_google_api_key" // required for gemini/geminimulti
}
```

##### Response

Success Response:

```json
{
  "success": true,
  "audio_url": "/audio/transcript_podcast_abc123.mp3",
  "transcript": "Processed transcript..." // if available
}
```

Error Response:

```json
{
  "error": "Error message here"
}
```

##### Example Usage

```bash
curl -X POST \
  http://your-server/api/generate-from-transcript \
  -H 'Authorization: Bearer your_api_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "transcript": "<Person1> Hi and welcome to the podcast! </Person1>\n<Person2> Thanks for having me! </Person2>\n<Person1> Let'\''s get started with our first topic. </Person1>",
    "podcast_name": "My Custom Podcast",
    "google_key": "your_google_api_key"
  }'
```

For Windows PowerShell users:

```powershell
$body = @{
    transcript = "<Person1> Hi and welcome to the podcast! </Person1>`n<Person2> Thanks for having me! </Person2>`n<Person1> Let's get started with our first topic. </Person1>"
    podcast_name = "My Custom Podcast"
    google_key = "your_google_api_key"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri "http://your-server/api/generate-from-transcript" `
    -Headers @{
        "Authorization" = "Bearer your_api_token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```
