import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import * as THREE from 'three';
import { useLocation } from '../../hooks/useLocation';
import { climateAPI } from '../../services/api';
import { COLORS, FONTS, SPACING, AR_CONFIG } from '../../utils/constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RiskVisualization = ({ visible, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [arEnabled, setArEnabled] = useState(false);
  
  const { currentLocation } = useLocation();
  const glViewRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const riskMarkersRef = useRef([]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (visible && hasPermission && currentLocation) {
      loadRiskData();
    }
  }, [visible, hasPermission, currentLocation]);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed for AR risk visualization.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Open settings */} },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const loadRiskData = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const response = await climateAPI.getRiskAssessment(
        currentLocation.latitude,
        currentLocation.longitude
      );

      const risks = response.data.risk_factors?.primary_factors || [];
      const processedRisks = risks.map((risk, index) => ({
        id: index,
        type: risk.risk_type,
        severity: risk.severity,
        probability: risk.probability,
        position: generateRandomPosition(index),
        color: getRiskColor(risk.severity),
      }));

      setRiskData(processedRisks);
    } catch (error) {
      console.error('Error loading risk data:', error);
      Alert.alert('Error', 'Failed to load risk data for AR visualization.');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPosition = (index) => {
    const angle = (index * 60) * (Math.PI / 180); // Spread markers around
    const distance = 5 + Math.random() * 10; // 5-15 units away
    
    return {
      x: Math.sin(angle) * distance,
      y: Math.random() * 3 - 1.5, // Random height between -1.5 and 1.5
      z: -Math.cos(angle) * distance,
    };
  };

  const getRiskColor = (severity) => {
    const colors = {
      low: 0x4caf50,
      medium: 0xff9800,
      high: 0xff5722,
      critical: 0xf44336,
    };
    return colors[severity] || colors.medium;
  };

  const onContextCreate = async (gl) => {
    try {
      // Initialize Three.js renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(screenWidth, screenHeight);
      renderer.setClearColor(0x000000, 0); // Transparent background
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        screenWidth / screenHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 0);
      cameraRef.current = camera;

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 10, 5);
      scene.add(directionalLight);

      // Create risk markers
      createRiskMarkers(scene);

      setArEnabled(true);

      // Start render loop
      const render = () => {
        requestAnimationFrame(render);
        
        // Animate markers
        animateMarkers();
        
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      render();

    } catch (error) {
      console.error('Error initializing AR context:', error);
      Alert.alert('AR Error', 'Failed to initialize AR visualization.');
    }
  };

  const createRiskMarkers = (scene) => {
    riskMarkersRef.current = [];

    riskData.forEach((risk) => {
      // Create marker geometry
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: risk.color,
        transparent: true,
        opacity: 0.8,
      });

      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(risk.position.x, risk.position.y, risk.position.z);
      
      // Add pulsing animation data
      marker.userData = {
        originalScale: 1,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        riskData: risk,
      };

      scene.add(marker);
      riskMarkersRef.current.push(marker);

      // Create text label
      createTextLabel(scene, risk, marker.position);
    });
  };

  const createTextLabel = (scene, risk, position) => {
    // Create a simple text representation using a plane with texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    // Draw text on canvas
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'black';
    context.font = '24px Arial';
    context.textAlign = 'center';
    context.fillText(risk.type.replace('_', ' ').toUpperCase(), 128, 40);
    context.fillText(`${Math.round(risk.probability * 100)}% Risk`, 128, 80);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 1);
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(position.x, position.y + 1, position.z);
    
    // Make text always face camera
    textMesh.lookAt(cameraRef.current.position);

    scene.add(textMesh);
  };

  const animateMarkers = () => {
    const time = Date.now() * 0.001;

    riskMarkersRef.current.forEach((marker) => {
      // Pulsing animation
      const { pulseSpeed, originalScale } = marker.userData;
      const scale = originalScale + Math.sin(time * pulseSpeed) * 0.2;
      marker.scale.setScalar(scale);

      // Floating animation
      marker.position.y += Math.sin(time + marker.position.x) * 0.001;
    });
  };

  const handleMarkerTap = (risk) => {
    Alert.alert(
      `${risk.type.replace('_', ' ').toUpperCase()} Risk`,
      `Probability: ${Math.round(risk.probability * 100)}%\nSeverity: ${risk.severity.toUpperCase()}`,
      [{ text: 'OK' }]
    );
  };

  if (!visible) {
    return null;
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Enable camera access to use AR risk visualization
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera style={styles.camera} type={Camera.Constants.Type.back}>
        {/* AR Overlay */}
        {arEnabled && (
          <GLView
            ref={glViewRef}
            style={styles.glView}
            onContextCreate={onContextCreate}
          />
        )}

        {/* UI Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Risk Visualization</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading risk data...</Text>
            </View>
          )}

          {/* Risk Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Risk Levels</Text>
            <View style={styles.legendItems}>
              <LegendItem color={COLORS.RISK_LOW} label="Low" />
              <LegendItem color={COLORS.RISK_MEDIUM} label="Medium" />
              <LegendItem color={COLORS.RISK_HIGH} label="High" />
              <LegendItem color={COLORS.RISK_CRITICAL} label="Critical" />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Point your camera around to see climate risks in your area
            </Text>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const LegendItem = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendColor, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  camera: {
    flex: 1,
  },
  glView: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: SPACING.MEDIUM,
    paddingBottom: SPACING.MEDIUM,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.WHITE,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legend: {
    position: 'absolute',
    top: 120,
    right: SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: SPACING.SMALL,
  },
  legendTitle: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: SPACING.TINY,
  },
  legendItems: {
    flexDirection: 'column',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.TINY,
  },
  legendLabel: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.WHITE,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.MEDIUM,
    right: SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: SPACING.MEDIUM,
  },
  instructionsText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LARGE,
  },
  permissionTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: SPACING.MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  permissionText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    marginBottom: SPACING.LARGE,
  },
  permissionButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LARGE,
    paddingVertical: SPACING.MEDIUM,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
});

export default RiskVisualization;
