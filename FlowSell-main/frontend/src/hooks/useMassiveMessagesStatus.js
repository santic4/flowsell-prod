import { useState, useEffect } from "react";
import { apiRequest } from '../api/api.js';

export function useMassiveMessagesStatus(jobId) {
  const [status, setStatus] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer;
    const fetchStatus = async () => {
      try {
        const data = await apiRequest(`/api/client-tracking/buyers/${jobId}`);
        if (cancelled) return;
        setStatus(data.statusMessagesMassive || data.status);
        setJob(data);
        const currentStatus = data.statusMessagesMassive || data.status;
        const complete = ['COMPLETED', 'FAILED'].includes(currentStatus);
        setLoading(!complete);
        if (!complete) {
          timer = window.setTimeout(fetchStatus, 4000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    };
    fetchStatus();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [jobId]);

  return { status, job, loading, error };
}
