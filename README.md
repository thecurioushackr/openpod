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
- Poetry (optional but recommended)
- Fly.io CLI

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/giulioco/openpod
cd openpod
```

2. Install frontend dependencies:

```bash
bun install
```

3. Install backend dependencies:

```bash
pip install -r requirements.txt
```

4. Start the development servers:

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

4. . Deploy the application:

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

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
