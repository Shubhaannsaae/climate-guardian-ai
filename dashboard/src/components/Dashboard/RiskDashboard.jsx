import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  Thermostat,
  Water,
  Air,
  Visibility,
  Speed,
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { climateAPI } from '../../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const RiskDashboard = ({ selectedStation }) => {
  const [expandedPanel, setExpandedPanel] = useState('overview');

  // Fetch latest climate data
  const { data: latestData, isLoading: dataLoading } = useQuery({
    queryKey: ['latest-climate-data', selectedStation?.id],
    queryFn: () => climateAPI.getClimateData({
      station_id: selectedStation?.id,
      limit: 1,
    }),
    select: (response) => response.data[0],
    enabled: !!selectedStation,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch risk assessment
  const { data: riskAssessment, isLoading: riskLoading } = useQuery({
    queryKey: ['risk-assessment', latestData?.id],
    queryFn: () => climateAPI.getRiskAssessment(latestData.id),
    select: (response) => response.data,
    enabled: !!latestData?.id,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch analytics summary
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['climate-analytics'],
    queryFn: () => climateAPI.getAnalyticsSummary(),
    select: (response) => response.data,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Risk level configuration
  const getRiskLevel = (score) => {
    if (score >= 0.8) return { level: 'Critical', color: 'error', severity: 'critical' };
    if (score >= 0.6) return { level: 'High', color: 'warning', severity: 'high' };
    if (score >= 0.4) return { level: 'Medium', color: 'info', severity: 'medium' };
    if (score >= 0.2) return { level: 'Low', color: 'success', severity: 'low' };
    return { level: 'Minimal', color: 'success', severity: 'minimal' };
  };

  // Get trend icon
  const getTrendIcon = (current, previous) => {
    if (!previous) return <Remove />;
    if (current > previous) return <TrendingUp color="error" />;
    if (current < previous) return <TrendingDown color="success" />;
    return <Remove />;
  };

  // Risk types configuration
  const riskTypes = [
    { key: 'flood_risk', label: 'Flood Risk', icon: <Water />, description: 'Risk of flooding based on precipitation and water levels' },
    { key: 'drought_risk', label: 'Drought Risk', icon: <Air />, description: 'Risk of drought conditions based on precipitation and humidity' },
    { key: 'storm_risk', label: 'Storm Risk', icon: <Speed />, description: 'Risk of severe weather based on wind and pressure' },
    { key: 'heat_wave_risk', label: 'Heat Wave Risk', icon: <Thermostat />, description: 'Risk of extreme heat conditions' },
    { key: 'cold_wave_risk', label: 'Cold Wave Risk', icon: <Thermostat />, description: 'Risk of extreme cold conditions' },
    { key: 'wildfire_risk', label: 'Wildfire Risk', icon: <Warning />, description: 'Risk of wildfire based on temperature, humidity, and wind' },
  ];

  if (!selectedStation) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Risk Assessment Dashboard
          </Typography>
          <Alert severity="info">
            Select a weather station on the map to view detailed risk assessment.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Overview Panel */}
      <Accordion 
        expanded={expandedPanel === 'overview'} 
        onChange={handlePanelChange('overview')}
        defaultExpanded
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Risk Overview - {selectedStation.name}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Overall Risk Score */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Overall Risk Score</Typography>
                    <Tooltip title="Refresh Risk Assessment">
                      <IconButton size="small" onClick={() => refetchAnalytics()}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {riskLoading ? (
                    <LinearProgress />
                  ) : riskAssessment ? (
                    <Box>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h3" component="div" mr={2}>
                          {(riskAssessment.overall_risk * 100).toFixed(0)}%
                        </Typography>
                        <Chip
                          label={getRiskLevel(riskAssessment.overall_risk).level}
                          color={getRiskLevel(riskAssessment.overall_risk).color}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={riskAssessment.overall_risk * 100}
                        color={getRiskLevel(riskAssessment.overall_risk).color}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary" mt={1} display="block">
                        Last updated: {formatDistanceToNow(new Date(riskAssessment.created_at), { addSuffix: true })}
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="warning">No risk assessment available</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Current Conditions */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Current Conditions</Typography>
                  
                  {dataLoading ? (
                    <LinearProgress />
                  ) : latestData ? (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Thermostat color="primary" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Temperature</Typography>
                            <Typography variant="h6">{latestData.temperature?.toFixed(1)}°C</Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Water color="primary" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Humidity</Typography>
                            <Typography variant="h6">{latestData.humidity?.toFixed(0)}%</Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Speed color="primary" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Pressure</Typography>
                            <Typography variant="h6">{latestData.pressure?.toFixed(1)} hPa</Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" alignItems="center">
                          <Air color="primary" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Wind Speed</Typography>
                            <Typography variant="h6">{latestData.wind_speed?.toFixed(1)} m/s</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="warning">No current data available</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Detailed Risk Assessment */}
      <Accordion 
        expanded={expandedPanel === 'detailed'} 
        onChange={handlePanelChange('detailed')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Detailed Risk Assessment</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {riskLoading ? (
            <LinearProgress />
          ) : riskAssessment ? (
            <Grid container spacing={2}>
              {riskTypes.map((riskType) => {
                const riskValue = riskAssessment[riskType.key] || 0;
                const riskInfo = getRiskLevel(riskValue);
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={riskType.key}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          {riskType.icon}
                          <Typography variant="subtitle1" ml={1}>
                            {riskType.label}
                          </Typography>
                        </Box>
                        
                        <Box mb={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h4">
                              {(riskValue * 100).toFixed(0)}%
                            </Typography>
                            <Chip
                              label={riskInfo.level}
                              color={riskInfo.color}
                              size="small"
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={riskValue * 100}
                            color={riskInfo.color}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary">
                          {riskType.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Alert severity="warning">No detailed risk assessment available</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Risk Factors */}
      <Accordion 
        expanded={expandedPanel === 'factors'} 
        onChange={handlePanelChange('factors')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Contributing Risk Factors</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {riskAssessment?.risk_factors ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Primary Factors:
              </Typography>
              <List dense>
                {riskAssessment.risk_factors.primary_factors?.map((factor, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color={factor.severity === 'high' ? 'error' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${factor.risk_type.replace('_', ' ').toUpperCase()}`}
                      secondary={`Probability: ${(factor.probability * 100).toFixed(0)}% | Severity: ${factor.severity}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              {riskAssessment.risk_factors.contributing_conditions && (
                <Box mt={2}>
                  <Typography variant="body1" gutterBottom>
                    Contributing Conditions:
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(riskAssessment.risk_factors.contributing_conditions).map(([key, value]) => (
                      <Grid item xs={6} sm={4} key={key}>
                        <Box p={1} bgcolor="grey.100" borderRadius={1}>
                          <Typography variant="caption" color="text.secondary">
                            {key.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">No risk factor analysis available</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Recommendations */}
      <Accordion 
        expanded={expandedPanel === 'recommendations'} 
        onChange={handlePanelChange('recommendations')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {riskAssessment?.recommendations ? (
            <List>
              {riskAssessment.recommendations.map((recommendation, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <Visibility color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={recommendation}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  {index < riskAssessment.recommendations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="info">No recommendations available</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Model Information */}
      <Accordion 
        expanded={expandedPanel === 'model'} 
        onChange={handlePanelChange('model')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Model Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {riskAssessment ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Model Version</Typography>
                <Typography variant="body1">{riskAssessment.model_version || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Confidence Score</Typography>
                <Typography variant="body1">
                  {riskAssessment.confidence_score ? `${(riskAssessment.confidence_score * 100).toFixed(0)}%` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Prediction Horizon</Typography>
                <Typography variant="body1">
                  {riskAssessment.prediction_horizon ? `${riskAssessment.prediction_horizon} hours` : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1">
                  {format(new Date(riskAssessment.created_at), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No model information available</Alert>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default RiskDashboard;
