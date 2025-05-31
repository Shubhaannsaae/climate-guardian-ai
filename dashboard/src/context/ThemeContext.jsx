import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { STORAGE_KEYS, THEME_CONFIG } from '../utils/constants';

// Initial state
const initialState = {
  mode: localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_CONFIG.MODES.LIGHT,
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  fontSize: 'medium',
  density: 'standard',
};

// Action types
const ActionTypes = {
  SET_MODE: 'SET_MODE',
  SET_PRIMARY_COLOR: 'SET_PRIMARY_COLOR',
  SET_SECONDARY_COLOR: 'SET_SECONDARY_COLOR',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_DENSITY: 'SET_DENSITY',
  RESET_THEME: 'RESET_THEME',
};

// Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_MODE:
      return { ...state, mode: action.payload };
    case ActionTypes.SET_PRIMARY_COLOR:
      return { ...state, primaryColor: action.payload };
    case ActionTypes.SET_SECONDARY_COLOR:
      return { ...state, secondaryColor: action.payload };
    case ActionTypes.SET_FONT_SIZE:
      return { ...state, fontSize: action.payload };
    case ActionTypes.SET_DENSITY:
      return { ...state, density: action.payload };
    case ActionTypes.RESET_THEME:
      return initialState;
    default:
      return state;
  }
};

// Create context
const ThemeContext = createContext();

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};

// Theme provider component
export const ThemeContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, state.mode);
  }, [state.mode]);

  // Detect system theme preference
  useEffect(() => {
    if (state.mode === THEME_CONFIG.MODES.AUTO) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Auto mode will be handled by MUI theme creation
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.mode]);

  // Get effective theme mode
  const getEffectiveMode = () => {
    if (state.mode === THEME_CONFIG.MODES.AUTO) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? THEME_CONFIG.MODES.DARK 
        : THEME_CONFIG.MODES.LIGHT;
    }
    return state.mode;
  };

  // Get font size multiplier
  const getFontSizeMultiplier = () => {
    switch (state.fontSize) {
      case 'small': return 0.875;
      case 'large': return 1.125;
      case 'extra-large': return 1.25;
      default: return 1;
    }
  };

  // Get density spacing
  const getDensitySpacing = () => {
    switch (state.density) {
      case 'compact': return 6;
      case 'comfortable': return 10;
      default: return 8;
    }
  };

  // Create MUI theme
  const createMuiTheme = () => {
    const effectiveMode = getEffectiveMode();
    const fontMultiplier = getFontSizeMultiplier();
    const spacing = getDensitySpacing();

    return createTheme({
      palette: {
        mode: effectiveMode,
        primary: {
          main: state.primaryColor,
        },
        secondary: {
          main: state.secondaryColor,
        },
        background: {
          default: effectiveMode === 'dark' ? '#121212' : '#f5f5f5',
          paper: effectiveMode === 'dark' ? '#1e1e1e' : '#ffffff',
        },
      },
      typography: {
        fontSize: 14 * fontMultiplier,
        h1: { fontSize: `${2.5 * fontMultiplier}rem` },
        h2: { fontSize: `${2 * fontMultiplier}rem` },
        h3: { fontSize: `${1.75 * fontMultiplier}rem` },
        h4: { fontSize: `${1.5 * fontMultiplier}rem` },
        h5: { fontSize: `${1.25 * fontMultiplier}rem` },
        h6: { fontSize: `${1 * fontMultiplier}rem` },
        body1: { fontSize: `${1 * fontMultiplier}rem` },
        body2: { fontSize: `${0.875 * fontMultiplier}rem` },
        caption: { fontSize: `${0.75 * fontMultiplier}rem` },
      },
      spacing: spacing,
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: spacing,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: spacing * 2,
              boxShadow: effectiveMode === 'dark' 
                ? '0 2px 8px rgba(0,0,0,0.3)' 
                : '0 2px 8px rgba(0,0,0,0.1)',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              borderBottom: `1px solid ${effectiveMode === 'dark' ? '#333' : '#e0e0e0'}`,
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderRight: `1px solid ${effectiveMode === 'dark' ? '#333' : '#e0e0e0'}`,
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              padding: spacing * 1.5,
            },
            sizeSmall: {
              padding: spacing,
            },
          },
        },
        MuiListItem: {
          styleOverrides: {
            root: {
              paddingTop: spacing,
              paddingBottom: spacing,
            },
          },
        },
      },
    });
  };

  // Theme actions
  const setMode = (mode) => {
    dispatch({ type: ActionTypes.SET_MODE, payload: mode });
  };

  const setPrimaryColor = (color) => {
    dispatch({ type: ActionTypes.SET_PRIMARY_COLOR, payload: color });
  };

  const setSecondaryColor = (color) => {
    dispatch({ type: ActionTypes.SET_SECONDARY_COLOR, payload: color });
  };

  const setFontSize = (size) => {
    dispatch({ type: ActionTypes.SET_FONT_SIZE, payload: size });
  };

  const setDensity = (density) => {
    dispatch({ type: ActionTypes.SET_DENSITY, payload: density });
  };

  const resetTheme = () => {
    dispatch({ type: ActionTypes.RESET_THEME });
  };

  const toggleMode = () => {
    const newMode = state.mode === THEME_CONFIG.MODES.LIGHT 
      ? THEME_CONFIG.MODES.DARK 
      : THEME_CONFIG.MODES.LIGHT;
    setMode(newMode);
  };

  // Context value
  const value = {
    // State
    mode: state.mode,
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    fontSize: state.fontSize,
    density: state.density,
    effectiveMode: getEffectiveMode(),

    // Actions
    setMode,
    setPrimaryColor,
    setSecondaryColor,
    setFontSize,
    setDensity,
    resetTheme,
    toggleMode,

    // Utilities
    isDarkMode: getEffectiveMode() === THEME_CONFIG.MODES.DARK,
    isAutoMode: state.mode === THEME_CONFIG.MODES.AUTO,
  };

  const muiTheme = createMuiTheme();

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
