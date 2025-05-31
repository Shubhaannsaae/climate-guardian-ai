import React, { useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip, Grid } from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js';
import { Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { climateAPI } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const RiskChart = ({ selectedStation, height = 400 }) => {
  const chartRef = useRef(null);
  const [chartType, setChartType] = useState('bar');

  // Fetch risk assessment data
  const { data: riskData, isLoading, refetch } = useQuery({
    queryKey: ['risk-chart-data', selectedStation?.id],
    queryFn: async () => {
      if (!selectedStation) return null;
      
      // Get latest climate data first
      const climateResponse = await climateAPI.getClimateData({
        station_id: selectedStation.id,
        limit: 1,
      });
      
      if (climateResponse.data.length === 0) return null;
      
      // Get risk assessment for latest data
      const riskResponse = await climateAPI.getRiskAssessment(climateResponse.data[0].id);
      return riskResponse.data;
    },
    enabled: !!selectedStation,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const riskTypes = [
    { key: 'flood_risk', label: 'Flood Risk', color: '#2196f3' },
    { key: 'drought_risk', label: 'Drought Risk', color: '#ff9800' },
    { key: 'storm_risk', label: 'Storm Risk', color: '#9c27b0' },
    { key: 'heat_wave_risk', label: 'Heat Wave Risk', color: '#f44336' },
    { key: 'cold_wave_risk', label: 'Cold Wave Risk', color: '#00bcd4' },
    { key: 'wildfire_risk', label: 'Wildfire Risk', color: '#ff5722' },
  ];

  const prepareBarChartData = () => {
    if (!riskData) return { labels: [], datasets: [] };

    return {
      labels: riskTypes.map(type => type.label),
      datasets: [
        {
          label: 'Risk Level (%)',
          data: riskTypes.map(type => (riskData[type.key] || 0) * 100),
          backgroundColor: riskTypes.map(type => type.color + '80'), // Add transparency
          borderColor: riskTypes.map(type => type.color),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  const prepareDoughnutData = () => {
    if (!riskData) return { labels: [], datasets: [] };

    const nonZeroRisks = riskTypes.filter(type => (riskData[type.key] || 0) > 0);
    
    if (nonZeroRisks.length === 0) {
      return {
        labels: ['No Risk'],
        datasets: [{
          data: [100],
          backgroundColor: ['#e0e0e0'],
          borderColor: ['#bdbdbd'],
          borderWidth: 2,
        }],
      };
    }

    return {
      labels: nonZeroRisks.map(type => type.label),
      datasets: [
        {
          data: nonZeroRisks.map(type => (riskData[type.key] || 0) * 100),
          backgroundColor: nonZeroRisks.map(type => type.color + '80'),
          borderColor: nonZeroRisks.map(type => type.color),
          borderWidth: 2,
        },
      ],
    };
  };

  const preparePolarData = () => {
    if (!riskData) return { labels: [], datasets: [] };

    return {
      labels: riskTypes.map(type => type.label),
      datasets: [
        {
          label: 'Risk Level (%)',
          data: riskTypes.map(type => (riskData[type.key] || 0) * 100),
          backgroundColor: riskTypes.map(type => type.color + '60'),
          borderColor: riskTypes.map(type => type.color),
          borderWidth: 2,
        },
      ],
    };
  };

  const getChartData = () => {
    switch (chartType) {
      case 'doughnut':
        return prepareDoughnutData();
      case 'polar':
        return preparePolarData();
      default:
        return prepareBarChartData();
    }
  };

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: chartType === 'bar' ? 'top' : 'right',
        },
        title: {
          display: true,
          text: `Risk Assessment - ${selectedStation?.name || 'No Station Selected'}`,
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed?.y !== undefined ? context.parsed.y : context.parsed;
              return `${context.label}: ${value?.toFixed(1) || 0}%`;
            },
          },
        },
      },
    };

    if (chartType === 'bar') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Risk Level (%)',
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              },
            },
          },
          x: {
            title: {
              display: true,
              text: 'Risk Types',
            },
          },
        },
      };
    }

    if (chartType === 'polar') {
      return {
        ...baseOptions,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              },
            },
          },
        },
      };
    }

    return baseOptions;
  };

  const renderChart = () => {
    const data = getChartData();
    const options = getChartOptions();

    switch (chartType) {
      case 'doughnut':
        return <Doughnut ref={chartRef} data={data} options={options} />;
      case 'polar':
        return <PolarArea ref={chartRef} data={data} options={options} />;
      default:
        return <Bar ref={chartRef} data={data} options={options} />;
    }
  };

  const handleDownloadChart = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `risk-chart-${chartType}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
    }
  };

  const getOverallRiskLevel = () => {
    if (!riskData) return { level: 'Unknown', color: 'text.secondary' };
    
    const overallRisk = riskData.overall_risk || 0;
    if (overallRisk >= 0.8) return { level: 'Critical', color: 'error.main' };
    if (overallRisk >= 0.6) return { level: 'High', color: 'warning.main' };
    if (overallRisk >= 0.4) return { level: 'Medium', color: 'info.main' };
    if (overallRisk >= 0.2) return { level: 'Low', color: 'success.main' };
    return { level: 'Minimal', color: 'success.main' };
  };

  const overallRisk = getOverallRiskLevel();

  return (
    <Card sx={{ height: height + 140 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Risk Analysis</Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Download Chart">
              <IconButton size="small" onClick={handleDownloadChart}>
                <Download />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton size="small" onClick={() => refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6}>
            <FormControl size="small" fullWidth>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => setChartType(e.target.value)}
              >
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="doughnut">Doughnut Chart</MenuItem>
                <MenuItem value="polar">Polar Area Chart</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              bgcolor="grey.50"
              borderRadius={1}
              p={1}
            >
              <Typography variant="body2" color="text.secondary" mr={1}>
                Overall Risk:
              </Typography>
              <Typography variant="body2" fontWeight="bold" color={overallRisk.color}>
                {overallRisk.level} ({riskData ? (riskData.overall_risk * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ height: height, position: 'relative' }}>
          {!selectedStation ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>Select a weather station to view risk analysis</Typography>
            </Box>
          ) : isLoading ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>Loading risk assessment...</Typography>
            </Box>
          ) : riskData ? (
            renderChart()
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>No risk assessment available</Typography>
            </Box>
          )}
        </Box>

        {riskData && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Model: {riskData.model_version || 'Unknown'} | 
              Confidence: {riskData.confidence_score ? `${(riskData.confidence_score * 100).toFixed(0)}%` : 'N/A'} | 
              Horizon: {riskData.prediction_horizon || 'N/A'} hours
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskChart;
