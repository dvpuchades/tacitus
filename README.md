# Tacitus - Mobile LLM Assistant

A mobile application that interacts with a Raspberry Pi-hosted large language model (LLM) to provide location-based information from Wikipedia articles.

## Project Structure

- **Mobile App**: React Native application using Expo
- **Backend**: Node.js server with Express
- **Database**: MongoDB and SQLite
- **LLM Integration**: Dockerized backend for running local LLM

## Prerequisites

- Node.js and npm
- Expo CLI
- Docker and Docker Compose
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

1. Install Docker and Docker Compose on your Raspberry Pi.

2. Copy the backend folder to your Raspberry Pi.

3. Create the data directory:
   ```
   mkdir -p backend/data
   ```

4. Start the Docker containers:
   ```
   cd backend/docker_config
   docker compose up -d
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
- Dockerized backend for easy deployment

## Technical Details

- The backend connects to an LLM to process user queries.
- Location data is stored in SQLite with coordinates and Wikipedia article links.
- MongoDB is used for additional data storage.
- Docker containers ensure easy deployment on the Raspberry Pi.

## Troubleshooting

- If the app cannot connect to the backend, verify the Raspberry Pi's IP address and ensure the Docker containers are running.
- Check the Raspberry Pi's firewall settings to ensure port 3000 is accessible.
- For database issues, verify that the data directory has correct permissions.
