import React, { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip, Badge } from '@mui/material';
import { Warning, Error, Info, Refresh, Layers } from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
import { useQuery } from '@tanstack/react-query';
import { emergencyAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

// Set Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiY2xpbWF0ZWd1YXJkaWFuIiwiYSI6ImNsb3Z5eXl5eTBhZGQyaW1xZjRhNGJhZGQifQ.example';

const AlertMap = ({ height = 600, onAlertSelect, selectedAlert }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Fetch emergency alerts
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['emergency-alerts', selectedSeverity],
    queryFn: () => emergencyAPI.getAlerts({ 
      status: 'active',
      ...(selectedSeverity !== 'all' && { severity: selectedSeverity }),
      limit: 100 
    }),
    select: (response) => response.data,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      addAlertLayers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Add alert layers to map
  const addAlertLayers = () => {
    if (!map.current || !mapLoaded) return;

    // Add alert areas source
    map.current.addSource('alert-areas', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Add alert areas layer (circles)
    map.current.addLayer({
      id: 'alert-circles',
      type: 'circle',
      source: 'alert-areas',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, ['*', ['get', 'radius'], 0.001],
          10, ['*', ['get', 'radius'], 0.01],
          15, ['*', ['get', 'radius'], 0.1]
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'severity'], 'critical'], '#d32f2f',
          ['==', ['get', 'severity'], 'high'], '#f57c00',
          ['==', ['get', 'severity'], 'medium'], '#fbc02d',
          ['==', ['get', 'severity'], 'low'], '#388e3c',
          '#666666'
        ],
        'circle-opacity': 0.3,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'case',
          ['==', ['get', 'severity'], 'critical'], '#d32f2f',
          ['==', ['get', 'severity'], 'high'], '#f57c00',
          ['==', ['get', 'severity'], 'medium'], '#fbc02d',
          ['==', ['get', 'severity'], 'low'], '#388e3c',
          '#666666'
        ],
        'circle-stroke-opacity': 0.8,
      },
    });

    // Add click handler for alert areas
    map.current.on('click', 'alert-circles', (e) => {
      const feature = e.features[0];
      if (feature && onAlertSelect) {
        const alertId = feature.properties.alert_id;
        const alert = alerts?.find(a => a.id === parseInt(alertId));
        if (alert) {
          onAlertSelect(alert);
        }
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'alert-circles', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'alert-circles', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  // Update map with alert markers and areas
  useEffect(() => {
    if (!map.current || !mapLoaded || !alerts) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    // Create alert area features
    const alertFeatures = alerts.map(alert => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [alert.longitude, alert.latitude],
      },
      properties: {
        alert_id: alert.id,
        severity: alert.severity,
        radius: alert.radius || 10000, // Default 10km radius
        title: alert.title,
        risk_type: alert.risk_type,
        issued_at: alert.issued_at,
      },
    }));

    // Update alert areas layer
    if (map.current.getSource('alert-areas')) {
      map.current.getSource('alert-areas').setData({
        type: 'FeatureCollection',
        features: alertFeatures,
      });
    }

    // Create markers for alerts
    const newMarkers = alerts.map(alert => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'alert-marker';
      
      const severityColor = getSeverityColor(alert.severity);
      const severityIcon = getSeverityIcon(alert.severity);
      
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background-color: ${severityColor};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <span style="color: white; font-size: 16px;">${severityIcon}</span>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
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
        <div style="padding: 12px; max-width: 300px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="
              background-color: ${severityColor};
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              text-transform: uppercase;
              margin-right: 8px;
            ">${alert.severity}</span>
            <span style="font-size: 11px; color: #666;">
              ${formatDistanceToNow(new Date(alert.issued_at), { addSuffix: true })}
            </span>
          </div>
          <h4 style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.3;">
            ${alert.title}
          </h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; line-height: 1.4;">
            ${alert.description.length > 150 ? alert.description.substring(0, 150) + '...' : alert.description}
          </p>
          <div style="font-size: 11px; color: #888;">
            <div>Risk Type: ${alert.risk_type || 'General'}</div>
            <div>Risk Score: ${alert.risk_score || 'N/A'}</div>
            ${alert.radius ? `<div>Affected Radius: ${(alert.radius / 1000).toFixed(1)} km</div>` : ''}
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([alert.longitude, alert.latitude])
        .setPopup(popup)
        .addTo(map.current);

      // Add click handler
      el.addEventListener('click', () => {
        if (onAlertSelect) {
          onAlertSelect(alert);
        }
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [alerts, mapLoaded, onAlertSelect]);

  // Highlight selected alert
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedAlert) return;

    // Fly to selected alert
    map.current.flyTo({
      center: [selectedAlert.longitude, selectedAlert.latitude],
      zoom: 10,
      duration: 1000,
    });
  }, [selectedAlert, mapLoaded]);

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#fbc02d';
      case 'low': return '#388e3c';
      default: return '#666666';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '⚠';
      case 'high': return '⚠';
      case 'medium': return '!';
      case 'low': return 'i';
      default: return '?';
    }
  };

  // Get severity counts
  const getSeverityCounts = () => {
    if (!alerts) return {};
    
    return alerts.reduce((counts, alert) => {
      counts[alert.severity] = (counts[alert.severity] || 0) + 1;
      return counts;
    }, {});
  };

  const severityCounts = getSeverityCounts();

  return (
    <Card sx={{ height: height + 80 }}>
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Emergency Alerts Map
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Alerts">
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

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip
            label="All Alerts"
            color={selectedSeverity === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedSeverity('all')}
            size="small"
          />
          <Badge badgeContent={severityCounts.critical || 0} color="error">
            <Chip
              label="Critical"
              color={selectedSeverity === 'critical' ? 'error' : 'default'}
              onClick={() => setSelectedSeverity('critical')}
              size="small"
              icon={<Error />}
            />
          </Badge>
          <Badge badgeContent={severityCounts.high || 0} color="warning">
            <Chip
              label="High"
              color={selectedSeverity === 'high' ? 'warning' : 'default'}
              onClick={() => setSelectedSeverity('high')}
              size="small"
              icon={<Warning />}
            />
          </Badge>
          <Badge badgeContent={severityCounts.medium || 0} color="info">
            <Chip
              label="Medium"
              color={selectedSeverity === 'medium' ? 'info' : 'default'}
              onClick={() => setSelectedSeverity('medium')}
              size="small"
              icon={<Info />}
            />
          </Badge>
          <Badge badgeContent={severityCounts.low || 0} color="success">
            <Chip
              label="Low"
              color={selectedSeverity === 'low' ? 'success' : 'default'}
              onClick={() => setSelectedSeverity('low')}
              size="small"
            />
          </Badge>
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
            bgcolor="rgba(0,0,0,0.5)"
            color="white"
            zIndex={1000}
          >
            <Typography>Loading emergency alerts...</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertMap;
