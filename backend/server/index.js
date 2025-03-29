const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Connect to MongoDB database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tacitus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Setup SQLite database
const dbPath = path.resolve(__dirname, '../data/locations.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create locations table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_name TEXT NOT NULL,
        articles TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Mock LLM function - in a real app, this would connect to an actual LLM
async function queryLLM(text, context) {
  console.log(`[LLM Query] Text: ${text}, Context: ${JSON.stringify(context)}`);
  
  // In a real implementation, you would send this to your LLM
  // For now, we'll return a mock response
  return {
    answer: `This is a simulated response about ${context.location || 'this location'}.
    In a real implementation, the LLM would process your question "${text}" 
    with the Wikipedia articles retrieved for coordinates near 
    ${context.latitude}, ${context.longitude}.`
  };
}

// API endpoint to process queries
app.post('/api/query', async (req, res) => {
  try {
    const { query, latitude, longitude } = req.body;
    
    if (!query || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Fetch location data from the database
    db.all(
      `SELECT * FROM locations 
       WHERE ABS(latitude - ?) < 0.1 AND ABS(longitude - ?) < 0.1
       ORDER BY (ABS(latitude - ?) + ABS(longitude - ?)) LIMIT 1`,
      [latitude, longitude, latitude, longitude],
      async (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        let locationContext = {
          latitude,
          longitude,
          location: 'unknown location',
          articles: []
        };
        
        if (rows && rows.length > 0) {
          const locationData = rows[0];
          locationContext = {
            latitude,
            longitude,
            location: locationData.location_name,
            articles: JSON.parse(locationData.articles)
          };
        } else {
          // If no location found, we could fetch it from an external API
          // For simplicity, we'll skip this in the demo
          console.log('No location data found in database for these coordinates');
        }
        
        // Process the query with the LLM
        const llmResponse = await queryLLM(query, locationContext);
        res.json(llmResponse);
      }
    );
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to search for a location and store its data
app.post('/api/search-location', async (req, res) => {
  try {
    const { location } = req.body;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }
    
    // In a real implementation, you would:
    // 1. Get coordinates for the location using a geocoding API
    // 2. Fetch Wikipedia articles about the location
    // 3. Store the data in the database
    
    // Mock implementation for demo purposes
    const mockCoordinates = {
      latitude: 48.8566, // Paris coordinates as an example
      longitude: 2.3522
    };
    
    const mockArticles = [
      'https://en.wikipedia.org/wiki/Paris',
      'https://en.wikipedia.org/wiki/History_of_Paris',
      'https://en.wikipedia.org/wiki/Culture_of_Paris'
    ];
    
    // Store in database
    db.run(
      `INSERT INTO locations (latitude, longitude, location_name, articles) 
       VALUES (?, ?, ?, ?)`,
      [
        mockCoordinates.latitude, 
        mockCoordinates.longitude, 
        location, 
        JSON.stringify(mockArticles)
      ],
      function(err) {
        if (err) {
          console.error('Error storing location data:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Location data for "${location}" stored with ID: ${this.lastID}`);
        res.json({ 
          success: true, 
          message: `Location data for "${location}" has been processed and stored` 
        });
      }
    );
  } catch (error) {
    console.error('Error processing location search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 