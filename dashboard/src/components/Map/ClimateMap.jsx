import React, { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Layers, FilterList, Refresh } from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
import { useQuery } from '@tanstack/react-query';
import { climateAPI } from '../../services/api';

// Set Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiY2xpbWF0ZWd1YXJkaWFuIiwiYSI6ImNsb3Z5eXl5eTBhZGQyaW1xZjRhNGJhZGQifQ.example';

const ClimateMap = ({ height = 600, onStationSelect, selectedStation }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState('temperature');
  const [markers, setMarkers] = useState([]);

  // Fetch weather stations
  const { data: stations, isLoading, refetch } = useQuery({
    queryKey: ['weather-stations'],
    queryFn: () => climateAPI.getStations({ active_only: true }),
    select: (response) => response.data,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch latest climate data
  const { data: climateData } = useQuery({
    queryKey: ['latest-climate-data'],
    queryFn: () => climateAPI.getClimateData({ limit: 1000 }),
    select: (response) => response.data,
    refetchInterval: 60000, // Refetch every minute
  });

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      addClimateDataLayers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Add climate data layers to map
  const addClimateDataLayers = () => {
    if (!map.current || !mapLoaded) return;

    // Add temperature layer
    map.current.addSource('temperature-data', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.current.addLayer({
      id: 'temperature-heatmap',
      type: 'heatmap',
      source: 'temperature-data',
      maxzoom: 15,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'temperature'],
          -20, 0,
          50, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 20,
          15, 40
        ],
      },
    });

    // Add precipitation layer
    map.current.addSource('precipitation-data', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.current.addLayer({
      id: 'precipitation-heatmap',
      type: 'heatmap',
      source: 'precipitation-data',
      maxzoom: 15,
      layout: {
        visibility: 'none',
      },
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'precipitation'],
          0, 0,
          100, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(255,255,255,0)',
          0.2, 'rgb(224,236,244)',
          0.4, 'rgb(158,202,225)',
          0.6, 'rgb(49,130,189)',
          0.8, 'rgb(8,81,156)',
          1, 'rgb(8,48,107)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 15,
          15, 30
        ],
      },
    });
  };

  // Update map with station markers
  useEffect(() => {
    if (!map.current || !mapLoaded || !stations) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers = stations.map(station => {
      // Get latest data for this station
      const latestData = climateData?.find(data => data.station_id === station.id);
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'climate-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${getStationColor(latestData)};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s ease;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="padding: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px;">${station.name}</h4>
          <p style="margin: 0; font-size: 12px; color: #666;">
            ${station.city}, ${station.state}
          </p>
          ${latestData ? `
            <div style="margin-top: 8px; font-size: 12px;">
              <div>Temperature: ${latestData.temperature?.toFixed(1)}°C</div>
              <div>Humidity: ${latestData.humidity?.toFixed(0)}%</div>
              <div>Pressure: ${latestData.pressure?.toFixed(1)} hPa</div>
            </div>
          ` : '<p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">No recent data</p>'}
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map.current);

      // Add click handler
      el.addEventListener('click', () => {
        if (onStationSelect) {
          onStationSelect(station);
        }
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [stations, climateData, mapLoaded, onStationSelect]);

  // Update climate data layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !climateData) return;

    const features = climateData.map(data => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [data.longitude || 0, data.latitude || 0],
      },
      properties: {
        temperature: data.temperature || 0,
        precipitation: data.precipitation || 0,
        humidity: data.humidity || 0,
        pressure: data.pressure || 1013.25,
      },
    }));

    // Update temperature layer
    if (map.current.getSource('temperature-data')) {
      map.current.getSource('temperature-data').setData({
        type: 'FeatureCollection',
        features: features,
      });
    }

    // Update precipitation layer
    if (map.current.getSource('precipitation-data')) {
      map.current.getSource('precipitation-data').setData({
        type: 'FeatureCollection',
        features: features,
      });
    }
  }, [climateData, mapLoaded]);

  // Handle layer toggle
  const handleLayerToggle = (layer) => {
    if (!map.current || !mapLoaded) return;

    // Hide all layers
    map.current.setLayoutProperty('temperature-heatmap', 'visibility', 'none');
    map.current.setLayoutProperty('precipitation-heatmap', 'visibility', 'none');

    // Show selected layer
    if (layer === 'temperature') {
      map.current.setLayoutProperty('temperature-heatmap', 'visibility', 'visible');
    } else if (layer === 'precipitation') {
      map.current.setLayoutProperty('precipitation-heatmap', 'visibility', 'visible');
    }

    setActiveLayer(layer);
  };

  // Get station color based on data
  const getStationColor = (data) => {
    if (!data) return '#gray';
    
    if (activeLayer === 'temperature') {
      const temp = data.temperature || 0;
      if (temp < 0) return '#0066cc';
      if (temp < 10) return '#00aaff';
      if (temp < 20) return '#66ff66';
      if (temp < 30) return '#ffff00';
      if (temp < 40) return '#ff6600';
      return '#ff0000';
    } else if (activeLayer === 'precipitation') {
      const precip = data.precipitation || 0;
      if (precip === 0) return '#cccccc';
      if (precip < 5) return '#66ccff';
      if (precip < 15) return '#0099ff';
      if (precip < 30) return '#0066cc';
      return '#003399';
    }
    
    return '#666666';
  };

  return (
    <Card sx={{ height: height + 60 }}>
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Climate Data Map
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Data">
              <IconButton size="small" onClick={() => refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Layer Controls">
              <IconButton size="small">
                <Layers />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box display="flex" gap={1} mb={2}>
          <Chip
            label="Temperature"
            color={activeLayer === 'temperature' ? 'primary' : 'default'}
            onClick={() => handleLayerToggle('temperature')}
            size="small"
          />
          <Chip
            label="Precipitation"
            color={activeLayer === 'precipitation' ? 'primary' : 'default'}
            onClick={() => handleLayerToggle('precipitation')}
            size="small"
          />
          <Chip
            label="Stations"
            color="secondary"
            size="small"
            icon={<FilterList />}
          />
        </Box>

        <Box
          ref={mapContainer}
          sx={{
            height: height,
            borderRadius: 1,
            overflow: 'hidden',
            '& .mapboxgl-popup-content': {
              borderRadius: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          }}
        />

        {isLoading && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(255,255,255,0.8)"
            zIndex={1000}
          >
            <Typography>Loading climate data...</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ClimateMap;
