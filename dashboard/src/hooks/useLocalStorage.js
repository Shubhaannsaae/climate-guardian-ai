import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage with JSON serialization
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value
 * @returns {array} [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Set value in state and localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to this localStorage key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook for managing multiple localStorage values
 * @param {object} initialValues - Object with key-value pairs
 * @returns {object} Object with values and setter functions
 */
export const useMultipleLocalStorage = (initialValues) => {
  const [values, setValues] = useState(() => {
    const stored = {};
    Object.keys(initialValues).forEach(key => {
      try {
        const item = window.localStorage.getItem(key);
        stored[key] = item ? JSON.parse(item) : initialValues[key];
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        stored[key] = initialValues[key];
      }
    });
    return stored;
  });

  const setStoredValue = useCallback((key, value) => {
    try {
      const valueToStore = value instanceof Function ? value(values[key]) : value;
      setValues(prev => ({ ...prev, [key]: valueToStore }));
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [values]);

  const removeStoredValue = useCallback((key) => {
    try {
      window.localStorage.removeItem(key);
      setValues(prev => ({ ...prev, [key]: initialValues[key] }));
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [initialValues]);

  const clearAll = useCallback(() => {
    try {
      Object.keys(initialValues).forEach(key => {
        window.localStorage.removeItem(key);
      });
      setValues(initialValues);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, [initialValues]);

  return {
    values,
    setStoredValue,
    removeStoredValue,
    clearAll,
  };
};

export default useLocalStorage;
