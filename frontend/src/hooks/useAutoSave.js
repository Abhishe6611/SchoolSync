import { useState, useEffect } from "react";

/**
 * Custom hook to auto-save form drafts to localStorage.
 * @param {string} key - Unique key for localStorage
 * @param {any} initialValue - Initial state if nothing is saved
 */
export default function useAutoSave(key, initialValue) {
  // Read from localStorage on mount
  const [data, setData] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn("Error reading localStorage", error);
      return initialValue;
    }
  });

  // Write to localStorage whenever data changes
  useEffect(() => {
    try {
      if (data && Object.keys(data).length > 0) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.warn("Error writing to localStorage", error);
    }
  }, [key, data]);

  // Method to clear the saved draft (call this on successful form submit)
  const clearData = () => {
    try {
      window.localStorage.removeItem(key);
      setData(initialValue);
    } catch (error) {
      console.warn("Error clearing localStorage", error);
    }
  };

  return [data, setData, clearData];
}
