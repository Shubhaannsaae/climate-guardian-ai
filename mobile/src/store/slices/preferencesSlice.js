import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_PREFERENCES } from '../../utils/constants';

const initialState = {
  ...DEFAULT_PREFERENCES,
  isLoaded: false,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences: (state, action) => {
      return {
        ...state,
        ...action.payload,
        isLoaded: true,
      };
    },
    updateNotificationPreference: (state, action) => {
      const { key, value } = action.payload;
      state.notifications[key] = value;
    },
    updateLocationPreference: (state, action) => {
      const { key, value } = action.payload;
      state.location[key] = value;
    },
    updateDisplayPreference: (state, action) => {
      const { key, value } = action.payload;
      state.display[key] = value;
    },
    updatePrivacyPreference: (state, action) => {
      const { key, value } = action.payload;
      state.privacy[key] = value;
    },
    resetPreferences: () => {
      return {
        ...DEFAULT_PREFERENCES,
        isLoaded: true,
      };
    },
  },
});

export const {
  setPreferences,
  updateNotificationPreference,
  updateLocationPreference,
  updateDisplayPreference,
  updatePrivacyPreference,
  resetPreferences,
} = preferencesSlice.actions;

export default preferencesSlice.reducer;
