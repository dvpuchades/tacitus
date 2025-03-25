import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import axios from 'axios';

// Change this to your Raspberry Pi's IP and port
const API_URL = 'http://192.168.1.100:3000';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    })();
  }, []);

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
      Speech.speak('Unable to get your location. Please enable location services.');
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
      Speech.speak(response.data.answer);
    } catch (error) {
      console.error('Error processing query:', error);
      setResponse('Error processing your request. Please try again.');
      Speech.speak('Error processing your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async () => {
    if (!locationInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/search-location`, {
        location: locationInput
      });
      
      setResponse(`Location data for ${locationInput} has been processed.`);
      Speech.speak(`Location data for ${locationInput} has been processed.`);
    } catch (error) {
      console.error('Error searching location:', error);
      setResponse('Error searching for this location. Please try again.');
      Speech.speak('Error searching for this location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tacitus LLM Assistant</Text>
      
      {/* Location Status */}
      <Text style={styles.locationStatus}>
        {locationPermission 
          ? `Location: ${location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : 'Getting location...'}`
          : 'Location access denied'}
      </Text>
      
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
      <ScrollView style={styles.responseContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Text style={styles.responseText}>{response}</Text>
        )}
      </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 50,
  },
  locationStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 50,
    width: 200,
    alignItems: 'center',
  },
  listeningButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginTop: 30,
    width: '100%',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  responseContainer: {
    marginTop: 20,
    flex: 1,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
  },
}); 