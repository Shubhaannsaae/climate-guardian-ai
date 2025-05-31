import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Slider,
} from 'react-native';
import { Camera } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import * as THREE from 'three';
import { useLocation } from '../../hooks/useLocation';
import { climateAPI } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

const FloodMapping = ({ visible, onClose }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [floodData, setFloodData] = useState(null);
  const [waterLevel, setWaterLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [arEnabled, setArEnabled] = useState(false);

  const { currentLocation } = useLocation();
  const glViewRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const waterMeshRef = useRef();
  const buildingMeshesRef = useRef([]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  useEffect(() => {
    if (visible && hasPermission && currentLocation) {
      loadFloodData();
    }
  }, [visible, hasPermission, currentLocation]);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const loadFloodData = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const response = await climateAPI.getRiskAssessment(
        currentLocation.latitude,
        currentLocation.longitude
      );

      const floodRisk = response.data.flood_risk || 0;
      setFloodData({
        riskLevel: floodRisk,
        maxWaterLevel: floodRisk * 3, // Scale risk to water level (0-3 meters)
        terrain: generateTerrainData(),
        buildings: generateBuildingData(),
      });
    } catch (error) {
      console.error('Error loading flood data:', error);
      Alert.alert('Error', 'Failed to load flood risk data.');
    } finally {
      setLoading(false);
    }
  };

  const generateTerrainData = () => {
    // Generate simplified terrain data
    const terrain = [];
    for (let x = -10; x <= 10; x += 2) {
      for (let z = -10; z <= 10; z += 2) {
        terrain.push({
          x,
          z,
          elevation: Math.random() * 2 - 1, // Random elevation between -1 and 1
        });
      }
    }
    return terrain;
  };

  const generateBuildingData = () => {
    // Generate simplified building data
    const buildings = [];
    for (let i = 0; i < 5; i++) {
      buildings.push({
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
        width: 2 + Math.random() * 2,
        height: 3 + Math.random() * 5,
        depth: 2 + Math.random() * 2,
      });
    }
    return buildings;
  };

  const onContextCreate = async (gl) => {
    try {
      // Initialize Three.js renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.set(0, 2, 5);
      cameraRef.current = camera;

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Create terrain
      createTerrain(scene);

      // Create buildings
      createBuildings(scene);

      // Create water plane
      createWaterPlane(scene);

      setArEnabled(true);

      // Start render loop
      const render = () => {
        requestAnimationFrame(render);
        
        // Animate water
        animateWater();
        
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      render();

    } catch (error) {
      console.error('Error initializing AR context:', error);
    }
  };

  const createTerrain = (scene) => {
    if (!floodData?.terrain) return;

    const geometry = new THREE.PlaneGeometry(20, 20, 10, 10);
    const material = new THREE.MeshLambertMaterial({
      color: 0x8B4513,
      wireframe: false,
    });

    // Modify vertices based on terrain data
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Find closest terrain point
      const terrainPoint = floodData.terrain.find(
        point => Math.abs(point.x - x) < 1 && Math.abs(point.z - z) < 1
      );
      
      if (terrainPoint) {
        vertices[i + 1] = terrainPoint.elevation;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
  };

  const createBuildings = (scene) => {
    if (!floodData?.buildings) return;

    buildingMeshesRef.current = [];

    floodData.buildings.forEach((building, index) => {
      const geometry = new THREE.BoxGeometry(
        building.width,
        building.height,
        building.depth
      );
      
      const material = new THREE.MeshLambertMaterial({
        color: 0x888888,
      });

      const buildingMesh = new THREE.Mesh(geometry, material);
      buildingMesh.position.set(
        building.x,
        building.height / 2,
        building.z
      );
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;

      scene.add(buildingMesh);
      buildingMeshesRef.current.push(buildingMesh);
    });
  };

  const createWaterPlane = (scene) => {
    const geometry = new THREE.PlaneGeometry(25, 25);
    const material = new THREE.MeshLambertMaterial({
      color: 0x006994,
      transparent: true,
      opacity: 0.6,
    });

    const water = new THREE.Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    water.visible = waterLevel > 0;

    scene.add(water);
    waterMeshRef.current = water;
  };

  const animateWater = () => {
    if (waterMeshRef.current) {
      const time = Date.now() * 0.001;
      
      // Update water level
      waterMeshRef.current.position.y = waterLevel;
      waterMeshRef.current.visible = waterLevel > 0;
      
      // Add gentle wave animation
      if (waterLevel > 0) {
        waterMeshRef.current.position.y += Math.sin(time) * 0.05;
      }
    }
  };

  const handleWaterLevelChange = (value) => {
    setWaterLevel(value);
    
    // Update building colors based on flood level
    buildingMeshesRef.current.forEach((building) => {
      const buildingBase = building.position.y - building.geometry.parameters.height / 2;
      const floodDepth = Math.max(0, value - buildingBase);
      
      if (floodDepth > 0) {
        const floodRatio = Math.min(floodDepth / building.geometry.parameters.height, 1);
        const red = Math.floor(255 * floodRatio);
        const green = Math.floor(255 * (1 - floodRatio));
        building.material.color.setRGB(red / 255, green / 255, 0);
      } else {
        building.material.color.setRGB(0.5, 0.5, 0.5);
      }
    });
  };

  const getFloodRiskText = () => {
    if (!floodData) return 'Loading...';
    
    const riskLevel = floodData.riskLevel;
    if (riskLevel < 0.2) return 'Low flood risk';
    if (riskLevel < 0.5) return 'Moderate flood risk';
    if (riskLevel < 0.8) return 'High flood risk';
    return 'Critical flood risk';
  };

  const getFloodRiskColor = () => {
    if (!floodData) return COLORS.GRAY_MEDIUM;
    
    const riskLevel = floodData.riskLevel;
    if (riskLevel < 0.2) return COLORS.SUCCESS;
    if (riskLevel < 0.5) return COLORS.WARNING;
    if (riskLevel < 0.8) return COLORS.ERROR;
    return '#B71C1C';
  };

  if (!visible) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Enable camera access to use AR flood mapping
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.back}>
        {arEnabled && (
          <GLView
            ref={glViewRef}
            style={styles.glView}
            onContextCreate={onContextCreate}
          />
        )}

        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Flood Mapping</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Risk Info */}
          <View style={styles.riskInfo}>
            <Text style={styles.riskTitle}>Flood Risk Assessment</Text>
            <Text style={[styles.riskText, { color: getFloodRiskColor() }]}>
              {getFloodRiskText()}
            </Text>
          </View>

          {/* Water Level Control */}
          <View style={styles.controls}>
            <Text style={styles.controlTitle}>Simulate Water Level</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0m</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={floodData?.maxWaterLevel || 3}
                value={waterLevel}
                onValueChange={handleWaterLevelChange}
                minimumTrackTintColor={COLORS.PRIMARY}
                maximumTrackTintColor={COLORS.GRAY_LIGHT}
                thumbStyle={{ backgroundColor: COLORS.PRIMARY }}
              />
              <Text style={styles.sliderLabel}>
                {floodData?.maxWaterLevel?.toFixed(1) || '3.0'}m
              </Text>
            </View>
            <Text style={styles.currentLevel}>
              Current Level: {waterLevel.toFixed(1)}m
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Use the slider to simulate different flood levels and see how they would affect your area
            </Text>
          </View>
        </View>
      </Camera>
    </View>
  );
};

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
  riskInfo: {
    position: 'absolute',
    top: 120,
    left: SPACING.MEDIUM,
    right: SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: SPACING.MEDIUM,
  },
  riskTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: SPACING.TINY,
  },
  riskText: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 150,
    left: SPACING.MEDIUM,
    right: SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: SPACING.MEDIUM,
  },
  controlTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: SPACING.SMALL,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SMALL,
  },
  slider: {
    flex: 1,
    marginHorizontal: SPACING.SMALL,
  },
  sliderLabel: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.WHITE,
    minWidth: 30,
    textAlign: 'center',
  },
  currentLevel: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: SPACING.MEDIUM,
    right: SPACING.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: SPACING.MEDIUM,
  },
  instructionsText: {
    fontSize: FONTS.SIZE_SMALL,
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
  },
});

export default FloodMapping;
