import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { climateAPI } from '../../services/api';

// Async thunks
export const fetchCurrentWeather = createAsyncThunk(
  'weather/fetchCurrent',
  async ({ latitude, longitude }, { rejectWithValue }) => {
    try {
      const response = await climateAPI.getCurrentWeather(latitude, longitude);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch weather');
    }
  }
);

export const fetchWeatherForecast = createAsyncThunk(
  'weather/fetchForecast',
  async ({ latitude, longitude, hours = 24 }, { rejectWithValue }) => {
    try {
      const response = await climateAPI.getWeatherForecast(latitude, longitude, hours);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch forecast');
    }
  }
);

const initialState = {
  currentWeather: null,
  forecast: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    clearWeatherData: (state) => {
      state.currentWeather = null;
      state.forecast = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Current weather
      .addCase(fetchCurrentWeather.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentWeather.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWeather = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchCurrentWeather.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Weather forecast
      .addCase(fetchWeatherForecast.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeatherForecast.fulfilled, (state, action) => {
        state.loading = false;
        state.forecast = action.payload;
      })
      .addCase(fetchWeatherForecast.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearWeatherData, clearError } = weatherSlice.actions;
export default weatherSlice.reducer;
