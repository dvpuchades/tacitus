#!/bin/bash

# Setup script for Ollama with Tacitus
echo "==========================="
echo "Tacitus Ollama Setup Helper"
echo "==========================="
echo

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Would you like to install it? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Installing Ollama..."
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo "Ollama installation skipped. Please install Ollama manually before continuing."
        exit 1
    fi
else
    echo "✓ Ollama is already installed."
fi

# Choose a model
echo
echo "Which LLM model would you like to use?"
echo "1) mistral (recommended, good balance of quality and speed)"
echo "2) llama2 (higher quality responses, requires more resources)"
echo "3) gemma (Google's model, fast but less capable)"
echo "4) phi (Microsoft's small model, fastest option)"
echo "5) Skip download (if you will set up models yourself)"
read -p "Choose option [1-5]: " model_choice

case $model_choice in
    1|"")  # Default to mistral
        MODEL="mistral"
        ;;
    2)
        MODEL="llama2"
        ;;
    3)
        MODEL="gemma"
        ;;
    4)
        MODEL="phi"
        ;;
    5)
        MODEL=""
        echo "Model download skipped. You'll need to pull a model manually with 'ollama pull MODEL_NAME'"
        ;;
    *)
        echo "Invalid option. Defaulting to mistral."
        MODEL="mistral"
        ;;
esac

# Pull the model if selected
if [ -n "$MODEL" ]; then
    echo
    echo "Pulling $MODEL model (this may take a while)..."
    ollama pull $MODEL
    
    # Update .env file
    echo
    echo "Updating .env file with the selected model..."
    if grep -q "OLLAMA_MODEL" ../.env; then
        sed -i "s/OLLAMA_MODEL=.*/OLLAMA_MODEL=$MODEL/" ../.env
    else
        echo "OLLAMA_MODEL=$MODEL" >> ../.env
    fi
    
    if grep -q "OLLAMA_API_URL" ../.env; then
        sed -i "s|OLLAMA_API_URL=.*|OLLAMA_API_URL=http://localhost:11434/api/chat|" ../.env
    else
        echo "OLLAMA_API_URL=http://localhost:11434/api/chat" >> ../.env
    fi
fi

echo
echo "Setup complete! To start using Tacitus with Ollama:"
echo "1. Make sure Ollama is running with: ollama serve"
echo "2. Start the Tacitus backend with: npm start"
echo
echo "For more details, see the README_OLLAMA.md file." 