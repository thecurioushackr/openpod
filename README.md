## AI Podcast Generator

A modern web application that generates AI-powered podcasts from web content using React, Flask, and WebSockets.

### Features

- Custom podcast generation from multiple URLs
- Real-time progress updates using WebSocket
- Beautiful UI with shadcn/ui components
- API key management for various AI services
- Support for multiple text-to-speech providers

### Prerequisites

- Node.js 18+
- Python 3.8+
- pip
- Poetry (optional but recommended)

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-podcast-generator
cd ai-podcast-generator
```

2. Install frontend dependencies:

```bash
bun install
```

3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

5. Start the development servers:

In one terminal, start the frontend:

```bash
bun dev
```

In another terminal, start the backend:

```bash
python app.py
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

4. Add your secrets:

```bash
fly secrets set GEMINI_API_KEY=your_gemini_api_key
fly secrets set OPENAI_API_KEY=your_openai_api_key
fly secrets set ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

5. Deploy the application:

```bash
fly deploy
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

### Environment Variables

- `GEMINI_API_KEY`: Google Gemini API key
- `OPENAI_API_KEY`: OpenAI API key
- `ELEVENLABS_API_KEY`: ElevenLabs API key

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
