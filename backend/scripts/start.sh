#!/bin/bash

# Navigate to the docker_config directory
cd "$(dirname "$0")/../docker_config"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Start the Docker containers
echo "Starting Tacitus backend services..."
docker compose up -d

# Check if the containers are running
if [ $? -eq 0 ]; then
    echo "Backend services are running. Access the API at http://localhost:3000"
else
    echo "Failed to start backend services. Check the Docker logs for more information."
    exit 1
fi 