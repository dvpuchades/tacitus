const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Setup SQLite database connection
const dbPath = path.resolve(__dirname, '../data/locations.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Create the locations table if it doesn't exist
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

/**
 * Get coordinates for a location using a geocoding service
 * @param {string} locationName - The name of the location to geocode
 * @returns {Promise<{latitude: number, longitude: number}>} - Location coordinates
 */
async function getCoordinates(locationName) {
  try {
    // Using OpenStreetMap's Nominatim API for geocoding (free, no API key required)
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: locationName,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'Tacitus-App/1.0'  // It's good practice to identify your app
      }
    });

    if (response.data && response.data.length > 0) {
      const location = response.data[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon)
      };
    } else {
      throw new Error(`Location "${locationName}" not found`);
    }
  } catch (error) {
    console.error(`Error getting coordinates for ${locationName}:`, error.message);
    throw error;
  }
}

/**
 * Get Wikipedia articles related to a location
 * @param {string} locationName - The name of the location to search for
 * @returns {Promise<Array<string>>} - Array of Wikipedia article URLs
 */
async function getWikipediaArticles(locationName) {
  try {
    // Use Wikipedia's API to search for articles
    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: locationName,
        format: 'json',
        utf8: 1,
        srlimit: 10  // Limit to 10 articles
      }
    });

    if (response.data && response.data.query && response.data.query.search) {
      // Transform search results into article URLs
      return response.data.query.search.map(article => {
        const title = encodeURIComponent(article.title.replace(/ /g, '_'));
        return `https://en.wikipedia.org/wiki/${title}`;
      });
    } else {
      console.log(`No Wikipedia articles found for "${locationName}"`);
      return [];
    }
  } catch (error) {
    console.error(`Error getting Wikipedia articles for ${locationName}:`, error.message);
    throw error;
  }
}

/**
 * Store location data in the SQLite database
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} locationName - Name of the location
 * @param {Array<string>} articles - Array of Wikipedia article URLs
 * @returns {Promise<number>} - ID of the inserted row
 */
function storeLocationData(latitude, longitude, locationName, articles) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO locations (latitude, longitude, location_name, articles) 
       VALUES (?, ?, ?, ?)`,
      [latitude, longitude, locationName, JSON.stringify(articles)],
      function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Stored data for "${locationName}" with ID: ${this.lastID}`);
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Main function to process a location
 * @param {string} locationName - The location to process
 */
async function processLocation(locationName) {
  try {
    console.log(`Processing location: ${locationName}`);
    
    // Get coordinates for the location
    const coordinates = await getCoordinates(locationName);
    console.log(`Coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
    
    // Get Wikipedia articles
    const articles = await getWikipediaArticles(locationName);
    console.log(`Found ${articles.length} Wikipedia articles for ${locationName}`);
    
    // Store the data in the database
    await storeLocationData(
      coordinates.latitude,
      coordinates.longitude,
      locationName,
      articles
    );
    
    console.log(`Successfully processed location: ${locationName}`);
  } catch (error) {
    console.error(`Failed to process location "${locationName}":`, error.message);
  }
}

// Check if a location argument was provided
const locationArg = process.argv[2];
if (!locationArg) {
  console.error('Please provide a location name as an argument');
  console.log('Usage: node scrapeWikipedia.js "Paris, France"');
  process.exit(1);
}

// Process the location and close the database when done
processLocation(locationArg)
  .then(() => {
    console.log('Processing complete');
    db.close();
  })
  .catch(error => {
    console.error('An error occurred:', error);
    db.close();
    process.exit(1);
  }); 