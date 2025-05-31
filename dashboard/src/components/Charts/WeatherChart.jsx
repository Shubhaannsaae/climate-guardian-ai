import React, { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, TimeScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { useQuery } from '@tanstack/react-query';
import { climateAPI } from '../../services/api';
import { format, subDays } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  TimeScale
);

const WeatherChart = ({ selectedStation, height = 400 }) => {
  const chartRef = useRef(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [parameter, setParameter] = useState('temperature');

  // Fetch weather data based on selected station and time range
  const { data: weatherData, isLoading, refetch } = useQuery({
    queryKey: ['weather-chart-data', selectedStation?.id, timeRange],
    queryFn: () => {
      const endTime = new Date();
      const startTime = getStartTime(timeRange);
      
      return climateAPI.getClimateData({
        station_id: selectedStation?.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        limit: getDataLimit(timeRange),
      });
    },
    select: (response) => response.data,
    enabled: !!selectedStation,
    refetchInterval: getRefreshInterval(timeRange),
  });

  const getStartTime = (range) => {
    const now = new Date();
    switch (range) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      default: return subDays(now, 1);
    }
  };

  const getDataLimit = (range) => {
    switch (range) {
      case '1h': return 60;
      case '6h': return 360;
      case '24h': return 288;
      case '7d': return 672;
      case '30d': return 720;
      default: return 288;
    }
  };

  const getRefreshInterval = (range) => {
    switch (range) {
      case '1h':
      case '6h': return 60000; // 1 minute
      case '24h': return 300000; // 5 minutes
      case '7d': return 900000; // 15 minutes
      case '30d': return 1800000; // 30 minutes
      default: return 300000;
    }
  };

  const getParameterConfig = (param) => {
    const configs = {
      temperature: {
        label: 'Temperature (°C)',
        color: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        yAxisLabel: 'Temperature (°C)',
      },
      humidity: {
        label: 'Humidity (%)',
        color: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        yAxisLabel: 'Humidity (%)',
      },
      pressure: {
        label: 'Pressure (hPa)',
        color: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        yAxisLabel: 'Pressure (hPa)',
      },
      wind_speed: {
        label: 'Wind Speed (m/s)',
        color: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        yAxisLabel: 'Wind Speed (m/s)',
      },
      precipitation: {
        label: 'Precipitation (mm)',
        color: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        yAxisLabel: 'Precipitation (mm)',
      },
    };
    return configs[param] || configs.temperature;
  };

  const prepareChartData = () => {
    if (!weatherData || weatherData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const config = getParameterConfig(parameter);
    const sortedData = weatherData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      labels: sortedData.map(item => new Date(item.timestamp)),
      datasets: [
        {
          label: config.label,
          data: sortedData.map(item => item[parameter]),
          borderColor: config.color,
          backgroundColor: config.backgroundColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: timeRange === '1h' || timeRange === '6h' ? 3 : 1,
          pointHoverRadius: 5,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${getParameterConfig(parameter).label} - ${selectedStation?.name || 'No Station Selected'}`,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const config = getParameterConfig(parameter);
            return `${config.label}: ${context.parsed.y?.toFixed(2) || 'N/A'}`;
          },
          title: function(context) {
            return format(new Date(context[0].parsed.x), 'MMM dd, yyyy HH:mm');
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
          tooltipFormat: 'MMM dd, yyyy HH:mm',
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: getParameterConfig(parameter).yAxisLabel,
        },
        beginAtZero: parameter === 'precipitation',
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  };

  const handleDownloadChart = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `weather-chart-${parameter}-${timeRange}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Card sx={{ height: height + 100 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Weather Data Visualization</Typography>
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

        <Box display="flex" gap={2} mb={3}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Parameter</InputLabel>
            <Select
              value={parameter}
              label="Parameter"
              onChange={(e) => setParameter(e.target.value)}
            >
              <MenuItem value="temperature">Temperature</MenuItem>
              <MenuItem value="humidity">Humidity</MenuItem>
              <MenuItem value="pressure">Pressure</MenuItem>
              <MenuItem value="wind_speed">Wind Speed</MenuItem>
              <MenuItem value="precipitation">Precipitation</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="6h">Last 6 Hours</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ height: height, position: 'relative' }}>
          {!selectedStation ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>Select a weather station to view data</Typography>
            </Box>
          ) : isLoading ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>Loading weather data...</Typography>
            </Box>
          ) : weatherData && weatherData.length > 0 ? (
            <Line ref={chartRef} data={prepareChartData()} options={chartOptions} />
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <Typography>No data available for the selected time range</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeatherChart;
