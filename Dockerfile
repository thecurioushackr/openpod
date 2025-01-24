# Use Node.js for frontend build
FROM node:20-slim as frontend-builder

# Install bun
RUN npm install -g bun

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy frontend source
COPY . .

# Build frontend
RUN bun run build

# Use Python for the main application
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/static ./static

# Create necessary directories
RUN mkdir -p static/audio static/transcripts data/audio data/transcripts

# Expose port
EXPOSE 8080

# Run the application
CMD ["python", "app.py"]