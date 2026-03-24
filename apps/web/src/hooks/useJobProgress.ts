'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { jobsApi } from '@/lib/api';
import { JobStatus } from '@autocut/shared';

interface JobProgressData {
  id: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  videoProject: {
    id: string;
    status: string;
    originalFileName: string;
    originalDuration: number | null;
    finalDuration: number | null;
    removedDuration: number | null;
    reductionPercent: number | null;
    errorMessage: string | null;
  };
  updatedAt: string;
}

interface UseJobProgressReturn {
  data: JobProgressData | null;
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
  isFailed: boolean;
  refetch: () => void;
}

const POLL_INTERVAL = 2000; // 2 seconds
const TERMINAL_STATUSES = [JobStatus.Completed, JobStatus.Failed];

export function useJobProgress(jobId: string | null): UseJobProgressReturn {
  const [data, setData] = useState<JobProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await jobsApi.getStatus(jobId);
      if (!mountedRef.current) return;

      if (res.data.success && res.data.data) {
        setData(res.data.data as JobProgressData);
        setError(null);

        // Stop polling when terminal status reached
        if (TERMINAL_STATUSES.includes(res.data.data.status as JobStatus)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch job status';
      setError(errorMsg);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [jobId]);

  const refetch = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    mountedRef.current = true;

    if (!jobId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchStatus();

    // Only start polling if not already in terminal state
    if (!data || !TERMINAL_STATUSES.includes(data.status)) {
      intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop polling when terminal state reached
  useEffect(() => {
    if (data && TERMINAL_STATUSES.includes(data.status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const isComplete = data?.status === JobStatus.Completed;
  const isFailed = data?.status === JobStatus.Failed;

  return { data, isLoading, error, isComplete, isFailed, refetch };
}
