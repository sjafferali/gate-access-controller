#!/bin/bash
set -e

echo "🔨 Building Gate Access Controller..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build the image
echo "📦 Building Docker image..."
docker compose build --no-cache

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "To start the application, run:"
echo "  docker compose up -d"
echo ""
echo "Then access the application at:"
echo "  http://localhost:8080"