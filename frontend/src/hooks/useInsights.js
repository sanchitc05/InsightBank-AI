import { useState, useEffect, useCallback } from 'react';
import { getInsights } from '../services/api';

export default function useInsights(statementId) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!statementId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getInsights(statementId);
      setInsights(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [statementId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { insights, loading, error, refetch: fetch };
}
