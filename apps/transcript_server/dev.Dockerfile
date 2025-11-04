# Development Dockerfile for Transcript Server
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (for better layer caching)
COPY apps/transcript_server/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Expose port
EXPOSE 5006

# Set working directory to transcript_server
WORKDIR /app/apps/transcript_server

# Run with uvicorn in reload mode
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5006", "--reload"]

