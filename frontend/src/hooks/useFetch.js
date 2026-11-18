import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

// Loads data from the API when the component appears (or when `path`
// changes) and tracks the three states every page must handle:
// loading, error, and the data itself.
//
//   const { data, loading, error, reload } = useFetch('/trainers');
export function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api(path));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
