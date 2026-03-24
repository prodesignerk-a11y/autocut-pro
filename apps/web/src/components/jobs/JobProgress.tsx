'use client';

import { useJobProgress } from '@/hooks/useJobProgress';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JobStatus } from '@autocut/shared';
import { CheckCircle, XCircle, RefreshCw, Clock, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const STEPS = [
  'Initializing',
  'Downloading video',
  'Analyzing video',
  'Detecting silence',
  'Building cut timeline',
  'Processing video',
  'Uploading result',
  'Saving results',
  'Complete',
];

interface JobProgressProps {
  jobId: string;
  onRetry?: () => void;
}

export function JobProgress({ jobId, onRetry }: JobProgressProps) {
  const { data, isLoading, error, isComplete, isFailed } = useJobProgress(jobId);

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-3 py-8 justify-center">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400">Loading job status...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-400">{error}</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => {}}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const currentStepIndex = STEPS.findIndex(
    (s) => s.toLowerCase() === data.currentStep?.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={data.status} />
          <span className="text-sm text-gray-400">
            {data.currentStep || 'Waiting...'}
          </span>
        </div>
        {isComplete && (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Complete</span>
          </div>
        )}
        {isFailed && (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle size={16} />
            <span className="text-sm font-medium">Failed</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span>{data.progress}%</span>
        </div>
        <div className="h-3 bg-surface-border rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              isFailed
                ? 'bg-red-500'
                : isComplete
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-primary-600 to-violet-500'
            )}
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>

      {/* Steps timeline */}
      <div className="space-y-2">
        {STEPS.slice(0, -1).map((step, idx) => {
          const isDone = currentStepIndex > idx || isComplete;
          const isActive = currentStepIndex === idx && !isComplete && !isFailed;
          const isPending = currentStepIndex < idx && !isComplete;

          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  isDone && 'bg-emerald-500/20',
                  isActive && 'bg-primary-500/20',
                  isPending && 'bg-surface-border',
                  isFailed && isActive && 'bg-red-500/20'
                )}
              >
                {isDone ? (
                  <CheckCircle size={12} className="text-emerald-400" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
              </div>
              <span
                className={clsx(
                  'text-sm',
                  isDone && 'text-gray-400',
                  isActive && 'text-white font-medium',
                  isPending && 'text-gray-600'
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timing info */}
      {data.startedAt && (
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-surface-border">
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            Started:{' '}
            {new Date(data.startedAt).toLocaleTimeString()}
          </span>
          {data.completedAt && (
            <span className="flex items-center gap-1.5">
              <Zap size={12} />
              Duration:{' '}
              {(
                (new Date(data.completedAt).getTime() -
                  new Date(data.startedAt).getTime()) /
                1000
              ).toFixed(0)}
              s
            </span>
          )}
        </div>
      )}

      {/* Error display */}
      {isFailed && data.errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 font-medium mb-1">Error</p>
          <p className="text-sm text-red-300/70 font-mono">{data.errorMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry Processing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
