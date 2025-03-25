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
  console.log('Connected to SQLite database - OK');
});

// Test database by creating a test table
db.run(`
  CREATE TABLE IF NOT EXISTS test_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_value TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creating test table:', err.message);
  } else {
    console.log('Test table created successfully - OK');
    
    // Insert a test value
    db.run(`INSERT INTO test_table (test_value) VALUES (?)`, ['test_' + Date.now()], function(err) {
      if (err) {
        console.error('Error inserting test value:', err.message);
      } else {
        console.log('Test value inserted successfully (ID: ' + this.lastID + ') - OK');
        
        // Select the test value
        db.get(`SELECT * FROM test_table WHERE id = ?`, [this.lastID], (err, row) => {
          if (err) {
            console.error('Error selecting test value:', err.message);
          } else {
            console.log('Test value retrieved successfully:', row);
            console.log('SQLite database tests completed successfully - OK');
            
            // Clean up the test table
            db.run(`DROP TABLE test_table`, (err) => {
              if (err) {
                console.error('Error dropping test table:', err.message);
              } else {
                console.log('Test table dropped successfully - OK');
              }
              
              // Close the database connection
              db.close((err) => {
                if (err) {
                  console.error('Error closing database:', err.message);
                } else {
                  console.log('Database connection closed - OK');
                }
                
                // Test API endpoints (if server is running)
                console.log('\nTesting API endpoints...');
                testAPIEndpoints();
              });
            });
          }
        });
      }
    });
  }
});

// Function to test API endpoints
async function testAPIEndpoints() {
  try {
    // Test if the server is running
    console.log('Testing API connection...');
    const response = await axios.get('http://localhost:3000', { timeout: 5000 })
      .catch(error => {
        if (error.code === 'ECONNREFUSED') {
          console.log('API server is not running. Make sure to start the server before running this test.');
          return null;
        }
        throw error;
      });
    
    if (response) {
      console.log('API connection successful - OK');
      
      // Test query endpoint
      try {
        const queryResponse = await axios.post('http://localhost:3000/api/query', {
          query: 'Test query',
          latitude: 48.8566,
          longitude: 2.3522
        });
        console.log('API query endpoint test successful - OK');
        console.log('Response:', queryResponse.data);
      } catch (error) {
        console.error('API query endpoint test failed:', error.message);
      }
      
      // Test location search endpoint
      try {
        const locationResponse = await axios.post('http://localhost:3000/api/search-location', {
          location: 'Test Location'
        });
        console.log('API location search endpoint test successful - OK');
        console.log('Response:', locationResponse.data);
      } catch (error) {
        console.error('API location search endpoint test failed:', error.message);
      }
    }
  } catch (error) {
    console.error('Error testing API endpoints:', error.message);
  }
  
  console.log('\nTest script completed.');
} 