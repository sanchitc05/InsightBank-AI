import { useState, useEffect, useCallback } from 'react';
import { getStatements } from '../services/api';

export default function useStatements() {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStatements();
      setStatements(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load statements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { statements, loading, error, refetch: fetch };
}
