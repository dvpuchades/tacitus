# Tacitus - Mobile LLM Assistant

A mobile application that interacts with a Raspberry Pi-hosted large language model (LLM) to provide location-based information from Wikipedia articles.

## Project Structure

- **Mobile App**: React Native application using Expo
- **Backend**: Node.js server with Express
- **Database**: MongoDB and SQLite
- **LLM Integration**: Ollama for running local LLMs on the Raspberry Pi

## Prerequisites

- Node.js and npm
- Expo CLI
- Ollama (for running the LLM)
- Raspberry Pi (for hosting the backend)
- Mobile device with Expo Go app

## Setup Instructions

### Mobile App Setup

1. Install dependencies:
   ```
   cd tacitus-app
   npm install
   ```

2. Update the API URL:
   Open `app/index.js` and update the `API_URL` constant with your Raspberry Pi's IP address.

3. Start the development server:
   ```
   npm start
   ```

4. Scan the QR code with the Expo Go app on your mobile device.

### Backend Setup (Raspberry Pi)

1. Install Ollama on your Raspberry Pi:
   ```
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. Pull the Mistral model:
   ```
   ollama pull mistral
   ```

3. Copy the backend folder to your Raspberry Pi.

4. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

5. Create the data directory:
   ```
   mkdir -p data
   ```

6. Update the `.env` file with your Ollama configuration:
   ```
   OLLAMA_API_URL=http://localhost:11434/api/chat
   OLLAMA_MODEL=mistral
   ```

7. Start the backend server:
   ```
   npm start
   ```

### Populate the Database

1. Run the Wikipedia scraper script to populate location data:
   ```
   cd backend
   node scripts/scrapeWikipedia.js "London, UK"
   ```

## Usage

1. Open the mobile app on your device.

2. Allow location permissions when prompted.

3. Press the "Press to Speak" button to ask questions about your current location.

4. Use the location search field to add data for specific cities or countries.

## Features

- Voice input for queries
- Text-to-speech responses
- GPS coordinate integration
- Location-based Wikipedia article retrieval
- Ollama integration for running LLMs locally
- Support for multiple LLM models through Ollama

## Technical Details

- The backend connects to Ollama to process user queries with a local LLM.
- Location data is stored in SQLite with coordinates and Wikipedia article links.
- MongoDB is used for additional data storage.
- Ollama runs the LLM locally on the Raspberry Pi, providing privacy and offline capabilities.

## Using Ollama

Ollama makes it easy to run various LLMs locally on your device. See the [detailed Ollama setup guide](backend/README_OLLAMA.md) for more information on:

- Installing and configuring Ollama
- Managing different LLM models
- Performance optimization for Raspberry Pi
- Troubleshooting common issues

For more information, visit [the Ollama website](https://ollama.com/).

## Troubleshooting

- If the app cannot connect to the backend, verify the Raspberry Pi's IP address and ensure the server is running.
- Check the Raspberry Pi's firewall settings to ensure port 3000 is accessible.
- For Ollama issues, verify that Ollama is running with `ps aux | grep ollama` and that the model is downloaded with `ollama list`.
- For database issues, verify that the data directory has correct permissions.
