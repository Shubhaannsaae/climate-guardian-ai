import React, { useState } from 'react';
import { Grid, Box, Typography } from '@mui/material';
import ClimateMap from '../components/Map/ClimateMap';
import AlertMap from '../components/Map/AlertMap';
import RiskDashboard from '../components/Dashboard/RiskDashboard';
import EmergencyPanel from '../components/Dashboard/EmergencyPanel';
import WeatherChart from '../components/Charts/WeatherChart';
import RiskChart from '../components/Charts/RiskChart';

const Dashboard = () => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const handleStationSelect = (station) => {
    setSelectedStation(station);
  };

  const handleAlertSelect = (alert) => {
    setSelectedAlert(alert);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Climate Risk Intelligence Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Maps Row */}
        <Grid item xs={12} lg={6}>
          <ClimateMap
            height={500}
            onStationSelect={handleStationSelect}
            selectedStation={selectedStation}
          />
        </Grid>
        <Grid item xs={12} lg={6}>
          <AlertMap
            height={500}
            onAlertSelect={handleAlertSelect}
            selectedAlert={selectedAlert}
          />
        </Grid>

        {/* Risk Assessment and Emergency Panel */}
        <Grid item xs={12} lg={6}>
          <RiskDashboard selectedStation={selectedStation} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <EmergencyPanel />
        </Grid>

        {/* Charts Row */}
        <Grid item xs={12} lg={6}>
          <WeatherChart selectedStation={selectedStation} height={400} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RiskChart selectedStation={selectedStation} height={400} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
