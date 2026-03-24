'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, videosApi } from '@/lib/api';
import { JobProgress } from '@/components/jobs/JobProgress';
import { VideoMetrics } from '@/components/jobs/VideoMetrics';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { JobStatus } from '@autocut/shared';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  FileVideo,
  Terminal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [showLogs, setShowLogs] = useState(false);

  const { data: jobRes, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.getStatus(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      if (status === JobStatus.Completed || status === JobStatus.Failed) return false;
      return 2000;
    },
  });

  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['job-logs', jobId],
    queryFn: () => jobsApi.getLogs(jobId),
    enabled: showLogs,
    refetchInterval: showLogs ? 5000 : false,
  });

  const job = jobRes?.data.data;

  async function handleDownload() {
    if (!job?.videoProject?.id) return;
    try {
      const res = await videosApi.getDownloadUrl(job.videoProject.id);
      if (res.data.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank');
        toast.success('Download started');
      }
    } catch {
      toast.error('Failed to get download link');
    }
  }

  async function handleRetry() {
    if (!job?.videoProject?.id) return;
    try {
      await videosApi.reprocess(job.videoProject.id);
      toast.success('Reprocessing started');
    } catch {
      toast.error('Failed to start reprocessing');
    }
  }

  if (jobLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-card rounded animate-pulse" />
        <div className="h-64 bg-surface-card rounded-xl animate-pulse" />
        <div className="h-48 bg-surface-card rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-400">Job not found</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.back()}
        >
          Go back
        </Button>
      </div>
    );
  }

  const isComplete = job.status === JobStatus.Completed;
  const isFailed = job.status === JobStatus.Failed;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileVideo size={20} className="text-primary-400" />
            <h1 className="text-xl font-bold text-white truncate max-w-sm">
              {job.videoProject?.originalFileName || 'Processing Job'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={job.status as JobStatus} />
            <span className="text-xs text-gray-500">
              Started{' '}
              {job.startedAt
                ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                : 'not yet'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <Button
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download size={14} />}
            >
              Download
            </Button>
          )}
          {isFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Progress</CardTitle>
        </CardHeader>
        <JobProgress jobId={jobId} onRetry={handleRetry} />
      </Card>

      {/* Metrics */}
      {(job.videoProject?.originalDuration || job.videoProject?.finalDuration) && (
        <Card>
          <CardHeader>
            <CardTitle>Video Metrics</CardTitle>
          </CardHeader>
          <VideoMetrics
            originalDuration={job.videoProject?.originalDuration ?? null}
            finalDuration={job.videoProject?.finalDuration ?? null}
            removedDuration={job.videoProject?.removedDuration ?? null}
            reductionPercent={job.videoProject?.reductionPercent ?? null}
          />
        </Card>
      )}

      {/* Download card when complete */}
      {isComplete && (
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Your video is ready!</p>
              <p className="text-sm text-gray-400 mt-0.5">
                The processed video has been saved to your storage.
              </p>
            </div>
            <Button
              onClick={handleDownload}
              leftIcon={<Download size={16} />}
            >
              Download
            </Button>
          </div>
        </Card>
      )}

      {/* Worker logs */}
      <Card>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-gray-400" />
            <span className="font-semibold text-white">Worker Logs</span>
          </div>
          <span className="text-xs text-gray-500">{showLogs ? 'Hide' : 'Show'}</span>
        </button>

        {showLogs && (
          <div className="mt-4 rounded-lg bg-[#0a0a14] border border-surface-border overflow-hidden">
            {logsLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading logs...</div>
            ) : (
              <div className="p-4 font-mono text-xs space-y-1 max-h-80 overflow-y-auto">
                {(logsRes?.data.data?.logs || []).length === 0 ? (
                  <p className="text-gray-600">No logs yet</p>
                ) : (
                  (logsRes?.data.data?.logs || []).map((log, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        log.level === 'error'
                          ? 'text-red-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="text-gray-600 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="flex-shrink-0 uppercase">[{log.level}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
