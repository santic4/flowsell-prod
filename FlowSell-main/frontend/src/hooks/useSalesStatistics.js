import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useSalesStatistics = ({ from, to, enabled = true }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!enabled || !from || !to) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    apiRequest(`/api/statistics/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, from, refreshKey, to]);

  return { data, loading, error, refresh };
};

export default useSalesStatistics;
