import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { emergencyAPI } from '../../services/api';

// Async thunks
export const fetchActiveAlerts = createAsyncThunk(
  'alerts/fetchActive',
  async ({ latitude, longitude, radius = 50 }, { rejectWithValue }) => {
    try {
      const response = await emergencyAPI.getActiveAlerts(latitude, longitude, radius);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch alerts');
    }
  }
);

const initialState = {
  alerts: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert: (state, action) => {
      state.alerts.unshift(action.payload);
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    updateAlert: (state, action) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = action.payload;
      }
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchActiveAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addAlert, removeAlert, updateAlert, clearAlerts, clearError } = alertsSlice.actions;
export default alertsSlice.reducer;
