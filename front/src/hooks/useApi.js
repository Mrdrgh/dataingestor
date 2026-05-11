import { useState, useCallback } from 'react';

/**
 * Custom hook to manage API fetch state (loading, error, data).
 * 
 * @param {Function} apiFunc - The API function to call (e.g., from api endpoints).
 * @param {boolean} [immediate=false] - Whether to call the function immediately on mount.
 * @returns {Object} { execute, data, loading, error, setError, setData }
 */
export function useApi(apiFunc, immediate = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const responseData = await apiFunc(...args);
        setData(responseData);
        return responseData;
      } catch (err) {
        setError(err.message || 'Something went wrong');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  return { execute, data, setData, loading, error, setError };
}
