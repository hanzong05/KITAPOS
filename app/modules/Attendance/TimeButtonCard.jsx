import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

const TimeButtonCard = ({ onTimeIn, onBreakOut, onBreakIn, onTimeOut, currentStatus }) => {
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('back');
  const cameraRef = useRef(null);

  const requestPermissions = useCallback(async () => {
    try {
      // Request camera permission
      if (!cameraPermission?.granted) {
        const cameraStatus = await requestCameraPermission();
        if (!cameraStatus.granted) {
          return false;
        }
      }

      // Request media library permission
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setMediaPermission(mediaStatus.granted);
      
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, [cameraPermission?.granted, requestCameraPermission]);

  const handleCameraAction = useCallback(async (actionType) => {
    try {
      const hasPermission = await requestPermissions();
      
      if (!hasPermission) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in settings to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      setCurrentAction(actionType);
      setIsCameraVisible(true);
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert('Error', 'Failed to access camera. Please try again.');
    }
  }, [requestPermissions]);

  const takePicture = useCallback(async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
        
        console.log('Photo taken:', photo);
        
        // Optionally save to media library
        if (mediaPermission) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
        }
        
        // Close camera
        setIsCameraVisible(false);
        
        // Execute the original callback with photo data
        switch (currentAction) {
          case 'timeIn':
            onTimeIn && onTimeIn(photo);
            break;
          case 'breakOut':
            onBreakOut && onBreakOut(photo);
            break;
          case 'breakIn':
            onBreakIn && onBreakIn(photo);
            break;
          case 'timeOut':
            onTimeOut && onTimeOut(photo);
            break;
        }
        
        setCurrentAction(null);
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  }, [mediaPermission, currentAction, onTimeIn, onBreakOut, onBreakIn, onTimeOut]);

  const toggleCameraFacing = useCallback(() => {
    setCameraFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  const closeCameraModal = useCallback(() => {
    setIsCameraVisible(false);
    setCurrentAction(null);
    setCameraFacing('back'); // Reset to back camera when closing
  }, []);

  const buttons = useMemo(() => [
    {
      id: 'timeIn',
      title: 'TIME IN',
      icon: '📷',
      backgroundColor: currentStatus === 'timeIn' ? '#34d399' : '#4285f4',
      textColor: '#ffffff',
      onPress: () => handleCameraAction('timeIn'),
      active: currentStatus === 'timeIn',
    },
    {
      id: 'breakOut',
      title: 'BREAK OUT',
      icon: '📷',
      backgroundColor: currentStatus === 'breakOut' ? '#f59e0b' : '#e5e7eb',
      textColor: currentStatus === 'breakOut' ? '#ffffff' : '#6b7280',
      onPress: () => handleCameraAction('breakOut'),
      active: currentStatus === 'breakOut',
    },
    {
      id: 'breakIn',
      title: 'BREAK IN',
      icon: '📷',
      backgroundColor: currentStatus === 'breakIn' ? '#10b981' : '#e5e7eb',
      textColor: currentStatus === 'breakIn' ? '#ffffff' : '#6b7280',
      onPress: () => handleCameraAction('breakIn'),
      active: currentStatus === 'breakIn',
    },
    {
      id: 'timeOut',
      title: 'TIME OUT',
      icon: '📷',
      backgroundColor: currentStatus === 'timeOut' ? '#ef4444' : '#e5e7eb',
      textColor: currentStatus === 'timeOut' ? '#ffffff' : '#6b7280',
      onPress: () => handleCameraAction('timeOut'),
      active: currentStatus === 'timeOut',
    },
  ], [currentStatus, handleCameraAction]);

  // Camera Modal Component
  const CameraModal = useCallback(() => {
    if (!isCameraVisible) return null;

    return (
      <View style={styles.cameraModal}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          flash="off"
        />
        
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>
            {currentAction?.replace(/([A-Z])/g, ' $1').toUpperCase()}
          </Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={closeCameraModal}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.cameraControls}>
          <TouchableOpacity 
            style={styles.flipButton} 
            onPress={toggleCameraFacing}
          >
            <Text style={styles.flipButtonText}>🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <View style={styles.spacer} />
        </View>
      </View>
    );
  }, [isCameraVisible, cameraFacing, currentAction, closeCameraModal, toggleCameraFacing, takePicture]);

  return (
    <>
      <View style={styles.row}>
        {buttons.slice(0, 2).map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.button,
              { backgroundColor: button.backgroundColor },
              button.active && styles.activeButton
            ]}
            onPress={button.onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>{button.icon}</Text>
            <Text style={[styles.buttonText, { color: button.textColor }]}>
              {button.title}
            </Text>
            {button.active && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.row}>
        {buttons.slice(2, 4).map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.button,
              { backgroundColor: button.backgroundColor },
              button.active && styles.activeButton
            ]}
            onPress={button.onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>{button.icon}</Text>
            <Text style={[styles.buttonText, { color: button.textColor }]}>
              {button.title}
            </Text>
            {button.active && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <CameraModal />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  activeButton: {
    shadowOpacity: 0.2,
    elevation: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  buttonIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Camera Modal Styles
  cameraModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  flipButtonText: {
    fontSize: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  spacer: {
    width: 60,
    height: 60,
  },
});

export default TimeButtonCard;