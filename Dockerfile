# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g bun

# Copy package files
COPY package.json bun.lockb ./

# Install frontend dependencies
RUN bun install

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Build frontend
RUN bun run build

# Create static directory and copy build files
RUN mkdir -p static && \
    cp -r dist/* static/

# Expose port
EXPOSE 8080

# Start the application
CMD ["python", "app.py"]