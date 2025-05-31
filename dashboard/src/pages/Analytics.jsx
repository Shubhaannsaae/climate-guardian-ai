import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Download, Refresh } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { climateAPI, emergencyAPI } from '../services/api';
import { subDays, format } from 'date-fns';
import WeatherChart from '../components/Charts/WeatherChart';
import RiskChart from '../components/Charts/RiskChart';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Fetch analytics summary
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['analytics-summary', dateRange],
    queryFn: () => climateAPI.getAnalyticsSummary({
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString(),
    }),
    select: (response) => response.data,
  });

  // Fetch emergency dashboard summary
  const { data: emergencyData } = useQuery({
    queryKey: ['emergency-analytics'],
    queryFn: () => emergencyAPI.getDashboardSummary(),
    select: (response) => response.data,
  });

  const handleExportData = () => {
    // Implementation for data export
    console.log('Exporting analytics data...');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Climate Analytics & Insights</Typography>
        <Box display="flex" gap={1}>
          <Button startIcon={<Download />} onClick={handleExportData}>
            Export Data
          </Button>
          <Button startIcon={<Refresh />} onClick={() => refetch()}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(newValue) => setDateRange(prev => ({ ...prev, start: newValue }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange(prev => ({ ...prev, end: newValue }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  label="Metric"
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  <MenuItem value="temperature">Temperature</MenuItem>
                  <MenuItem value="precipitation">Precipitation</MenuItem>
                  <MenuItem value="humidity">Humidity</MenuItem>
                  <MenuItem value="pressure">Pressure</MenuItem>
                  <MenuItem value="wind_speed">Wind Speed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Region</InputLabel>
                <Select
                  value={selectedRegion}
                  label="Region"
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <MenuItem value="all">All Regions</MenuItem>
                  <MenuItem value="north">North</MenuItem>
                  <MenuItem value="south">South</MenuItem>
                  <MenuItem value="east">East</MenuItem>
                  <MenuItem value="west">West</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Records
              </Typography>
              <Typography variant="h4">
                {analyticsData?.total_records?.toLocaleString() || 0}
              </Typography>
              <Chip label="Last 30 days" size="small" color="primary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Temperature
              </Typography>
              <Typography variant="h4">
                {analyticsData?.temperature_stats?.average?.toFixed(1) || 0}°C
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Range: {analyticsData?.temperature_stats?.minimum?.toFixed(1) || 0}° to {analyticsData?.temperature_stats?.maximum?.toFixed(1) || 0}°
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Risk Assessments
              </Typography>
              <Typography variant="h4">
                {analyticsData?.risk_stats?.total_assessments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Risk: {((analyticsData?.risk_stats?.average_risk || 0) * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Alerts
              </Typography>
              <Typography variant="h4">
                {Object.values(emergencyData?.active_alerts_by_severity || {}).reduce((a, b) => a + b, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical: {emergencyData?.active_alerts_by_severity?.critical || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <WeatherChart height={500} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <RiskChart height={500} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
