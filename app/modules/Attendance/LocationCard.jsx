// LocationCard.jsx - Expo Version with Location Validation
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  Linking
} from 'react-native';
import * as Location from 'expo-location';

const LocationCard = ({ workplaceCoords = null }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isWithinWorkplace, setIsWithinWorkplace] = useState(true);
  const [distanceFromWorkplace, setDistanceFromWorkplace] = useState(null);

  // Default workplace coordinates (Tarlac City Hall)
  const defaultWorkplace = {
    latitude: 14.6507,
    longitude: 120.9763,
    radius: 100, // meters
    name: "Tarlac City Hall"
  };

  const workplace = workplaceCoords || defaultWorkplace;

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Function to check if current location is within workplace radius
  const checkWorkplaceProximity = (currentLat, currentLon) => {
    const distance = calculateDistance(
      currentLat,
      currentLon,
      workplace.latitude,
      workplace.longitude
    );

    setDistanceFromWorkplace(Math.round(distance));
    setIsWithinWorkplace(distance <= workplace.radius);
    
    return distance <= workplace.radius;
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = currentLocation.coords;
      setLocation({ latitude, longitude });
      setAccuracy(accuracy);

      // Check workplace proximity
      checkWorkplaceProximity(latitude, longitude);

      // Get address using Expo's built-in reverse geocoding
      await getAddressFromCoords(latitude, longitude);
      
    } catch (err) {
      console.error('Location error:', err);
      setError('Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      // Try Expo's built-in reverse geocoding first
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocodedAddress.length > 0) {
        const addr = reverseGeocodedAddress[0];
        const fullAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
        
        setAddress(fullAddress || 'Address not found');
      } else {
        // Fallback to free OpenStreetMap API
        await getFreeReverseGeocode(latitude, longitude);
      }
    } catch (err) {
      console.error('Expo reverse geocoding failed:', err);
      // Fallback to free API
      await getFreeReverseGeocode(latitude, longitude);
    }
  };

  // Fallback free reverse geocoding using OpenStreetMap
  const getFreeReverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AttendanceApp/1.0', // Required by Nominatim
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAddress(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (err) {
      console.error('Free reverse geocoding error:', err);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };

  const openInMaps = () => {
    if (!location) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open maps');
      }
    });
  };

  const showLocationWarning = () => {
    if (!isWithinWorkplace) {
      Alert.alert(
        "Location Warning",
        `You are ${distanceFromWorkplace}m away from ${workplace.name}.\n\nYou must be within ${workplace.radius}m of the workplace to clock in/out.\n\nCurrent location: ${address}`,
        [
          { text: "OK", style: "default" },
          { 
            text: "View in Maps", 
            onPress: openInMaps 
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.locationContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4285f4" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.locationContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📍</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshLocation}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.locationContainer,
      !isWithinWorkplace && styles.warningContainer
    ]}>
      {/* Location Warning Banner */}
      {!isWithinWorkplace && (
        <TouchableOpacity style={styles.warningBanner} onPress={showLocationWarning}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Location Warning</Text>
            <Text style={styles.warningText}>
              You are {distanceFromWorkplace}m away from workplace
            </Text>
          </View>
          <Text style={styles.warningArrow}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.locationHeader}>
        <View style={[
          styles.locationIcon,
          !isWithinWorkplace && styles.warningLocationIcon
        ]}>
          <Text style={styles.locationIconText}>
            {isWithinWorkplace ? '📍' : '⚠️'}
          </Text>
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Current Location</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {address}
          </Text>
          <Text style={styles.coordinatesText}>
            {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
          </Text>
          {accuracy && (
            <Text style={styles.accuracyText}>
              Accuracy: ±{Math.round(accuracy)}m
            </Text>
          )}
          {distanceFromWorkplace !== null && (
            <Text style={[
              styles.distanceText,
              !isWithinWorkplace && styles.warningDistanceText
            ]}>
              Distance from workplace: {distanceFromWorkplace}m
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshLocation}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusRow}>
        <View style={styles.locationStatus}>
          <View style={[
            styles.statusDot, 
            isWithinWorkplace ? styles.activeStatus : styles.warningStatus
          ]} />
          <Text style={styles.statusText}>
            {isWithinWorkplace ? 'Within Workplace' : 'Outside Workplace'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.mapButton} onPress={openInMaps}>
          <Text style={styles.mapButtonText}>🗺️ View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  locationContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningContainer: {
    backgroundColor: '#fef3cd',
    borderColor: '#fbbf24',
    borderWidth: 1,
  },
  warningBanner: {
    backgroundColor: '#fed7d7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#dc2626',
  },
  warningArrow: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningLocationIcon: {
    backgroundColor: '#f59e0b',
  },
  locationIconText: {
    fontSize: 20,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  warningDistanceText: {
    color: '#dc2626',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  refreshIcon: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeStatus: {
    backgroundColor: '#10b981',
  },
  warningStatus: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  mapButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#6b7280',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LocationCard;