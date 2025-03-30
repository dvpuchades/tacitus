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

// API key check middleware for protected routes
const apiKeyCheck = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

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

// Real LLM function implementation using Ollama
async function queryLLM(text, context) {
  console.log(`[LLM Query] Text: ${text}, Context: ${JSON.stringify(context)}`);
  
  try {
    // Prepare context from Wikipedia articles
    let articleContents = '';
    if (context.articles && context.articles.length > 0) {
      articleContents = `Available articles about ${context.location}: ${context.articles.join(', ')}`;
    }

    // Ollama API endpoint - default for local installation
    const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
    
    // Call Ollama API
    const response = await axios.post(
      OLLAMA_API_URL,
      {
        model: OLLAMA_MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful assistant providing information about locations. 
                      You have access to the following Wikipedia articles: ${articleContents}`
          },
          { 
            role: 'user', 
            content: `${text}. I'm currently at coordinates (${context.latitude}, ${context.longitude}), 
                      which is in or near ${context.location}.`
          }
        ],
        options: {
          temperature: 0.7
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        // Add a longer timeout since local LLM might be slower
        timeout: 60000
      }
    );

    return {
      answer: response.data.message?.content || 
              "I couldn't generate a proper response. Please check if Ollama is running correctly."
    };
  } catch (error) {
    console.error('Error calling Ollama LLM:', error.response?.data || error.message);
    return {
      answer: `I apologize, but I encountered an error processing your request. 
              Please check if Ollama is running correctly on your Raspberry Pi.
              (Technical details: ${error.message})`
    };
  }
}

// API endpoint to list all stored locations
app.get('/api/locations', (req, res) => {
  try {
    db.all('SELECT id, latitude, longitude, location_name, created_at FROM locations ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        success: true,
        locations: rows || []
      });
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get details of a specific location
app.get('/api/locations/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM locations WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      // Parse articles from JSON string
      row.articles = JSON.parse(row.articles);
      
      res.json({
        success: true,
        location: row
      });
    });
  } catch (error) {
    console.error('Error fetching location details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    
    // Get coordinates for the location using a geocoding API
    let coordinates;
    try {
      // Using OpenStreetMap Nominatim API (free, no key required)
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
      const geocodeResponse = await axios.get(geocodeUrl, {
        headers: { 'User-Agent': 'Tacitus-App' } // Required by Nominatim
      });
      
      if (geocodeResponse.data && geocodeResponse.data.length > 0) {
        coordinates = {
          latitude: parseFloat(geocodeResponse.data[0].lat),
          longitude: parseFloat(geocodeResponse.data[0].lon)
        };
      } else {
        return res.status(404).json({ error: 'Location not found' });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return res.status(500).json({ error: 'Error getting coordinates for this location' });
    }
    
    // Fetch Wikipedia articles about the location
    let articles = [];
    try {
      // Using Wikipedia API to get articles near the coordinates
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${coordinates.latitude}|${coordinates.longitude}&gslimit=10&format=json`;
      const wikiResponse = await axios.get(wikiUrl);
      
      if (wikiResponse.data && wikiResponse.data.query && wikiResponse.data.query.geosearch) {
        articles = wikiResponse.data.query.geosearch.map(item => 
          `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
        );
      }
      
      // If no Wikipedia articles found, add a generic article about the location
      if (articles.length === 0) {
        articles.push(`https://en.wikipedia.org/wiki/${encodeURIComponent(location)}`);
      }
    } catch (error) {
      console.error('Wikipedia API error:', error);
      // If error, still proceed with a generic article
      articles = [`https://en.wikipedia.org/wiki/${encodeURIComponent(location)}`];
    }
    
    // Store in database
    db.run(
      `INSERT INTO locations (latitude, longitude, location_name, articles) 
       VALUES (?, ?, ?, ?)`,
      [
        coordinates.latitude, 
        coordinates.longitude, 
        location, 
        JSON.stringify(articles)
      ],
      function(err) {
        if (err) {
          console.error('Error storing location data:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Location data for "${location}" stored with ID: ${this.lastID}`);
        res.json({ 
          success: true, 
          message: `Location data for "${location}" has been processed and stored`,
          location: {
            id: this.lastID,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            location_name: location,
            articles: articles
          }
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