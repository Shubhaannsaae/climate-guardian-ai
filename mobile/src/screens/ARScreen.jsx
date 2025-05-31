import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useLocation } from '../hooks/useLocation';
import RiskVisualization from '../components/AR/RiskVisualization';
import FloodMapping from '../components/AR/FloodMapping';
import { COLORS, FONTS, SPACING } from '../utils/constants';

const ARScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedMode, setSelectedMode] = useState('risk');
  const [modeModalVisible, setModeModalVisible] = useState(false);
  const [isARActive, setIsARActive] = useState(false);

  const { hasLocationPermission } = route.params || {};
  const { currentLocation, requestLocationPermission } = useLocation();

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (hasPermission && hasLocationPermission && currentLocation) {
      setIsARActive(true);
    }
  }, [hasPermission, hasLocationPermission, currentLocation]);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed for AR visualization features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: openAppSettings },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const openAppSettings = () => {
    // In a real app, this would open device settings
    Alert.alert(
      'Open Settings',
      'Please enable camera permissions in your device settings to use AR features.'
    );
  };

  const handleLocationPermission = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Location Required',
        'Location access is needed to show climate risks for your area.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: requestLocationPermission },
        ]
      );
    }
  };

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
    setModeModalVisible(false);
  };

  const renderPermissionScreen = () => (
    <View style={styles.permissionContainer}>
      <Ionicons name="camera-outline" size={80} color={COLORS.GRAY_MEDIUM} />
      <Text style={styles.permissionTitle}>AR Features Unavailable</Text>
      <Text style={styles.permissionText}>
        {!hasPermission && 'Camera permission is required for AR visualization.'}
        {!hasLocationPermission && '\nLocation permission is required to show area-specific risks.'}
      </Text>
      
      <View style={styles.permissionButtons}>
        {!hasPermission && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        )}
        
        {!hasLocationPermission && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => setModeModalVisible(true)}
      >
        <Ionicons name="layers" size={24} color={COLORS.WHITE} />
        <Text style={styles.modeButtonText}>
          {selectedMode === 'risk' ? 'Risk View' : 'Flood Map'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );

  if (!hasPermission || !hasLocationPermission || !currentLocation) {
    return renderPermissionScreen();
  }

  return (
    <View style={styles.container}>
      {/* AR View */}
      {selectedMode === 'risk' ? (
        <RiskVisualization
          visible={isARActive}
          onClose={() => navigation.goBack()}
        />
      ) : (
        <FloodMapping
          visible={isARActive}
          onClose={() => navigation.goBack()}
        />
      )}

      {/* Mode Selector Overlay */}
      {renderModeSelector()}

      {/* Mode Selection Modal */}
      <Modal
        visible={modeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AR Visualization Mode</Text>
            <TouchableOpacity onPress={() => setModeModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.GRAY_DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <ModeOption
              icon="analytics"
              title="Risk Visualization"
              description="View climate risks as 3D markers in your environment"
              selected={selectedMode === 'risk'}
              onPress={() => handleModeChange('risk')}
            />
            
            <ModeOption
              icon="water"
              title="Flood Mapping"
              description="Simulate flood levels and see potential water impact"
              selected={selectedMode === 'flood'}
              onPress={() => handleModeChange('flood')}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ModeOption = ({ icon, title, description, selected, onPress }) => (
  <TouchableOpacity style={styles.modeOption} onPress={onPress}>
    <View style={styles.modeOptionIcon}>
      <Ionicons name={icon} size={32} color={selected ? COLORS.PRIMARY : COLORS.GRAY_MEDIUM} />
    </View>
    <View style={styles.modeOptionContent}>
      <Text style={[styles.modeOptionTitle, selected && { color: COLORS.PRIMARY }]}>
        {title}
      </Text>
      <Text style={styles.modeOptionDescription}>{description}</Text>
    </View>
    {selected && (
      <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LARGE,
    backgroundColor: COLORS.WHITE,
  },
  permissionTitle: {
    fontSize: FONTS.SIZE_HEADER,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginTop: SPACING.LARGE,
    marginBottom: SPACING.MEDIUM,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.LARGE,
  },
  permissionButtons: {
    width: '100%',
    marginBottom: SPACING.LARGE,
  },
  permissionButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MEDIUM,
    paddingHorizontal: SPACING.LARGE,
    borderRadius: 8,
    marginBottom: SPACING.SMALL,
  },
  permissionButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: SPACING.MEDIUM,
    paddingHorizontal: SPACING.LARGE,
  },
  backButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  modeSelector: {
    position: 'absolute',
    top: 100,
    right: SPACING.MEDIUM,
    zIndex: 1000,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 20,
  },
  modeButtonText: {
    color: COLORS.WHITE,
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: '500',
    marginHorizontal: SPACING.SMALL,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.LARGE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  modalTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.MEDIUM,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.LARGE,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 12,
    marginBottom: SPACING.MEDIUM,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  modeOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MEDIUM,
  },
  modeOptionContent: {
    flex: 1,
  },
  modeOptionTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.TINY,
  },
  modeOptionDescription: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    lineHeight: 20,
  },
});

export default ARScreen;
