'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { videosApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VideoProject, JobStatus } from '@autocut/shared';
import {
  Video,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import bytes from 'bytes';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Queued', value: 'queued' },
  { label: 'Failed', value: 'failed' },
];

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: videosRes, isLoading } = useQuery({
    queryKey: ['videos', page, statusFilter],
    queryFn: () =>
      videosApi.list({ page, pageSize: 10, status: statusFilter || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => videosApi.delete(id),
    onSuccess: () => {
      toast.success('Video deleted');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
    onError: () => {
      toast.error('Failed to delete video');
    },
  });

  const videos = (videosRes?.data.data?.items || []) as VideoProject[];
  const totalPages = videosRes?.data.data?.totalPages || 1;
  const total = videosRes?.data.data?.total || 0;

  async function handleDownload(video: VideoProject) {
    try {
      const res = await videosApi.getDownloadUrl(video.id);
      if (res.data.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank');
      }
    } catch {
      toast.error('Failed to get download link');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    setDeletingId(id);
    deleteMutation.mutate(id);
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Video History</h1>
          <p className="text-gray-400 mt-1">
            {total} video{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/upload">
          <Button size="sm">Upload New</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-gray-500" />
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value);
              setPage(1);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              statusFilter === value
                ? 'bg-primary-600/20 text-primary-300 border border-primary-600/40'
                : 'bg-surface-muted text-gray-400 border border-surface-border hover:text-gray-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-20 text-center">
            <Video size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No videos found</p>
            <p className="text-gray-600 text-sm mt-1">
              {statusFilter ? 'Try a different filter' : 'Upload your first video'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-surface-border text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">File</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Duration</div>
              <div className="col-span-2">Reduction</div>
              <div className="col-span-1">Size</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-surface-border">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-muted/30 transition-colors"
                >
                  {/* File */}
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {video.originalFileName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <StatusBadge status={video.status as JobStatus} />
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 text-sm text-gray-300">
                    {video.originalDuration ? (
                      <div>
                        <span>{formatDuration(video.originalDuration)}</span>
                        {video.finalDuration && (
                          <span className="text-primary-400 ml-1.5">
                            → {formatDuration(video.finalDuration)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>

                  {/* Reduction */}
                  <div className="col-span-2">
                    {video.reductionPercent ? (
                      <span className="text-sm font-medium text-emerald-400">
                        {video.reductionPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </div>

                  {/* Size */}
                  <div className="col-span-1 text-xs text-gray-500">
                    {bytes(Number(video.originalSize), { unitSeparator: ' ' })}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center gap-1">
                    <Link href={`/jobs/${video.jobs?.[0]?.id || video.id}`}>
                      <button className="p-1.5 text-gray-500 hover:text-primary-400 transition-colors" title="View details">
                        <ExternalLink size={14} />
                      </button>
                    </Link>

                    {video.status === JobStatus.Completed && (
                      <button
                        onClick={() => handleDownload(video)}
                        className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {video.status === JobStatus.Failed && (
                      <button
                        onClick={async () => {
                          try {
                            await videosApi.reprocess(video.id);
                            toast.success('Reprocessing started');
                            queryClient.invalidateQueries({ queryKey: ['videos'] });
                          } catch {
                            toast.error('Failed to reprocess');
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-amber-400 transition-colors"
                        title="Retry"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={deletingId === video.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
