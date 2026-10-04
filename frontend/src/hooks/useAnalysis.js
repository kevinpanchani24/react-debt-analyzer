import { useState, useEffect, useRef, useCallback } from 'react';
import { analysisApi } from '../services/api';

const POLL_INTERVAL = 3000;

const useAnalysis = (analysisId) => {
  const [analysis,    setAnalysis]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [dbStatus,    setDbStatus]    = useState('unknown'); // 'unknown' | 'connecting' | 'ready'
  const intervalRef  = useRef(null);
  const mountedRef   = useRef(true);

  const stopPolling = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const fetchAnalysis = useCallback(async () => {
    if (!analysisId || !mountedRef.current) return;

    try {
      const { data } = await analysisApi.getStatus(analysisId);
      if (!mountedRef.current) return;

      setAnalysis(data);
      setError(null);
      setDbStatus('ready');

      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
        setLoading(false);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const msg = err.message || '';

      // 503 = backend running but DB not connected yet — keep polling silently
      if (msg.includes('Database not connected') || msg.includes('503')) {
        setDbStatus('connecting');
        setError(null); // don't show error — just show "waiting for DB"
        return;
      }

      // 404 = analysis ID doesn't exist — hard stop
      if (msg.includes('not found') || msg.includes('404') || msg.includes('Invalid')) {
        setError(msg);
        stopPolling();
        setLoading(false);
        return;
      }

      // Anything else (network glitch, timeout) — keep polling, show warning
      setError(msg);
    }
  }, [analysisId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!analysisId) { setLoading(false); return; }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setDbStatus('unknown');

    fetchAnalysis();
    intervalRef.current = setInterval(fetchAnalysis, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [analysisId, fetchAnalysis]);

  return { analysis, loading, error, dbStatus, refetch: fetchAnalysis };
};

export default useAnalysis;
