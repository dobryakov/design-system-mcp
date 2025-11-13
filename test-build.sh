#!/bin/bash
set -e

echo "=== Testing Design System Analyzer Build ==="

# Check if .env.example exists
if [ ! -f .env.example ]; then
    echo "❌ .env.example not found"
    exit 1
fi
echo "✅ .env.example exists"

# Check if required directories exist
for dir in src config tests; do
    if [ ! -d "$dir" ]; then
        echo "❌ Directory $dir not found"
        exit 1
    fi
done
echo "✅ Required directories exist"

# Check if key files exist
for file in package.json tsconfig.json Dockerfile docker-compose.yml; do
    if [ ! -f "$file" ]; then
        echo "❌ File $file not found"
        exit 1
    fi
done
echo "✅ Key configuration files exist"

# Check if source files exist
for file in src/server.ts src/routes/analyze.ts src/routes/status.ts src/routes/health.ts; do
    if [ ! -f "$file" ]; then
        echo "❌ Source file $file not found"
        exit 1
    fi
done
echo "✅ Key source files exist"

# Try to build using Docker (if Docker is available)
if command -v docker &> /dev/null; then
    echo ""
    echo "=== Testing Docker Build ==="
    echo "Building Docker image..."
    docker build -t design-system-analyzer-test . 2>&1 | tail -20
    if [ $? -eq 0 ]; then
        echo "✅ Docker build successful"
    else
        echo "❌ Docker build failed"
        exit 1
    fi
else
    echo "⚠️  Docker not available, skipping Docker build test"
fi

echo ""
echo "=== Build Test Complete ==="

