import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, FlatList, Switch } from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import axios from 'axios';

// Change this to your Raspberry Pi's IP and port
const API_URL = 'http://tacitus.dvpuchades.com';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('query'); // 'query' or 'locations'
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [mistralStatus, setMistralStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

  // Rename the state for clarity
  const [ollamaStatus, setOllamaStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
      
      // Check connection to server
      checkServerConnection();
    })();
    
    // Stop speaking when component unmounts
    return () => {
      if (Speech.isSpeakingAsync()) {
        Speech.stop();
      }
    };
  }, []);
  
  const checkServerConnection = async () => {
    try {
      await axios.get(`${API_URL}/api/health`);
      setIsConnected(true);
      
      // Check Ollama status
      try {
        // Make a simple query to test if Ollama is responding
        const testResponse = await axios.post(`${API_URL}/api/query`, {
          query: 'test connection',
          latitude: 0,
          longitude: 0
        }, { timeout: 10000 }); // Longer timeout for first Ollama response
        
        if (testResponse.data && testResponse.data.answer) {
          setOllamaStatus('online');
        } else {
          setOllamaStatus('offline');
        }
      } catch (error) {
        console.error('Ollama test error:', error);
        setOllamaStatus('offline');
      }
    } catch (error) {
      console.error('Server connection error:', error);
      setIsConnected(false);
      setOllamaStatus('unknown');
      // Try again in 10 seconds
      setTimeout(checkServerConnection, 10000);
    }
  };

  const startListening = async () => {
    setIsListening(true);
    try {
      // This would be replaced with actual voice recognition logic
      // For simplicity, we're just simulating a voice command
      simulateVoiceInput('Tell me about this location');
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };

  const simulateVoiceInput = async (text) => {
    // In a real app, you'd use speech recognition here
    await processQuery(text);
    setIsListening(false);
  };

  const processQuery = async (query) => {
    if (!location) {
      const message = 'Unable to get your location. Please enable location services.';
      setResponse(message);
      if (autoSpeak) speakText(message);
      return;
    }
    
    setLoading(true);
    try {
      // Send query with GPS coordinates to the backend
      const response = await axios.post(`${API_URL}/api/query`, {
        query,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      setResponse(response.data.answer);
      if (autoSpeak) speakText(response.data.answer);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMsg = 'Error processing your request. Please try again.';
      setResponse(errorMsg);
      if (autoSpeak) speakText(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    // Stop any ongoing speech
    if (await Speech.isSpeakingAsync()) {
      await Speech.stop();
    }
    
    setSpeaking(true);
    
    try {
      await Speech.speak(text, {
        language: 'en-US',
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false)
      });
    } catch (error) {
      console.error('Speech error:', error);
      setSpeaking(false);
    }
  };
  
  const stopSpeaking = async () => {
    if (await Speech.isSpeakingAsync()) {
      await Speech.stop();
      setSpeaking(false);
    }
  };

  const searchLocation = async () => {
    if (!locationInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/search-location`, {
        location: locationInput
      });
      
      const successMsg = `Location data for ${locationInput} has been processed.`;
      setResponse(successMsg);
      if (autoSpeak) speakText(successMsg);
      
      // Refresh locations list if we're on the locations tab
      if (activeTab === 'locations') {
        fetchLocations();
      }
      
      // Clear the input field
      setLocationInput('');
    } catch (error) {
      console.error('Error searching location:', error);
      const errorMsg = 'Error searching for this location. Please try again.';
      setResponse(errorMsg);
      if (autoSpeak) speakText(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await axios.get(`${API_URL}/api/locations`);
      if (response.data.success && response.data.locations) {
        setLocations(response.data.locations);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };
  
  const selectLocation = async (location) => {
    // Set the location input field to the selected location
    setLocationInput(location.location_name);
    // Switch to query tab
    setActiveTab('query');
    // Prepare a query about this location
    const query = `Tell me about ${location.location_name}`;
    setResponse(`Loading information about ${location.location_name}...`);
    
    // Use the coordinates from the selected location
    if (location.latitude && location.longitude) {
      setLocation({
        coords: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
    }
    
    // Process the query
    await processQuery(query);
  };
  
  // Effect to load locations when the locations tab is activated
  useEffect(() => {
    if (activeTab === 'locations') {
      fetchLocations();
    }
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tacitus</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.modelText}>Ollama LLM</Text>
          <View style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]} />
          <View style={[styles.connectionIndicator, 
            ollamaStatus === 'online' ? styles.connected : 
            ollamaStatus === 'offline' ? styles.disconnected : 
            styles.unknown]} />
        </View>
      </View>
      
      {/* Status info */}
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusText}>
          Server: {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <Text style={styles.statusText}>
          LLM: {ollamaStatus === 'online' ? 'Online' : ollamaStatus === 'offline' ? 'Offline' : 'Unknown'}
        </Text>
      </View>
      
      {/* Location Status */}
      <Text style={styles.locationStatus}>
        {locationPermission 
          ? `Location: ${location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Getting location...'}`
          : 'Location access denied'}
      </Text>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'query' ? styles.activeTab : null]}
          onPress={() => setActiveTab('query')}
        >
          <Text style={styles.tabText}>Query</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'locations' ? styles.activeTab : null]}
          onPress={() => setActiveTab('locations')}
        >
          <Text style={styles.tabText}>Locations</Text>
        </TouchableOpacity>
      </View>
      
      {/* Auto speak switch */}
      <View style={styles.optionsContainer}>
        <Text style={styles.optionText}>Auto-read responses:</Text>
        <Switch
          value={autoSpeak}
          onValueChange={setAutoSpeak}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={autoSpeak ? "#007AFF" : "#f4f3f4"}
        />
      </View>
      
      {activeTab === 'query' ? (
        <>
          {/* Voice Input Button */}
          <TouchableOpacity 
            style={[styles.button, isListening ? styles.listeningButton : null]} 
            onPress={startListening}
            disabled={isListening || loading}
          >
            <Text style={styles.buttonText}>
              {isListening ? 'Listening...' : 'Press to Speak'}
            </Text>
          </TouchableOpacity>
          
          {/* Location Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter city or country"
              value={locationInput}
              onChangeText={setLocationInput}
            />
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={searchLocation}
              disabled={loading}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          
          {/* Response Display */}
          <View style={styles.responseContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : (
              <>
                <ScrollView style={styles.responseScroll}>
                  <Text style={styles.responseText}>{response}</Text>
                </ScrollView>
                {response && (
                  <View style={styles.speechControls}>
                    {speaking ? (
                      <TouchableOpacity style={styles.speechButton} onPress={stopSpeaking}>
                        <Text style={styles.speechButtonText}>Stop Reading</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.speechButton} onPress={() => speakText(response)}>
                        <Text style={styles.speechButtonText}>Read Aloud</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </>
      ) : (
        // Locations Tab
        <View style={styles.locationsContainer}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchLocations}
            disabled={loadingLocations}
          >
            <Text style={styles.refreshButtonText}>Refresh Locations</Text>
          </TouchableOpacity>
          
          {loadingLocations ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : locations.length > 0 ? (
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.locationItem}
                  onPress={() => selectLocation(item)}
                >
                  <Text style={styles.locationName}>{item.location_name}</Text>
                  <Text style={styles.locationCoords}>
                    {`${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.locationsList}
            />
          ) : (
            <Text style={styles.noLocationsText}>
              No saved locations. Add a location using the search on the Query tab.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelText: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 5,
  },
  connected: {
    backgroundColor: '#34C759', // iOS green
  },
  disconnected: {
    backgroundColor: '#FF3B30', // iOS red
  },
  unknown: {
    backgroundColor: '#FFCC00', // iOS yellow
  },
  statusTextContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  locationStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 200,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  listeningButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    width: '100%',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  responseContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  responseScroll: {
    flex: 1,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
  },
  loader: {
    marginTop: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  activeTabText: {
    color: 'white',
  },
  locationsContainer: {
    flex: 1,
    width: '100%',
  },
  locationsList: {
    flex: 1,
    width: '100%',
  },
  locationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  noLocationsText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
  refreshButton: {
    backgroundColor: '#34C759',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 10,
  },
  optionText: {
    marginRight: 10,
    fontSize: 14,
  },
  speechControls: {
    marginTop: 10,
    alignItems: 'center',
  },
  speechButton: {
    backgroundColor: '#5856D6',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    width: 150,
  },
  speechButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 