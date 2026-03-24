'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { videosApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VideoProject, JobStatus } from '@autocut/shared';
import {
  Upload,
  Video,
  Clock,
  TrendingDown,
  ArrowRight,
  Download,
  BarChart2,
} from 'lucide-react';
import bytes from 'bytes';
import { formatDistanceToNow } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export default function DashboardPage() {
  const { data: videosRes, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => videosApi.list({ page: 1, pageSize: 10 }),
  });

  const videos = (videosRes?.data.data?.items || []) as VideoProject[];
  const total = videosRes?.data.data?.total || 0;

  // Calculate stats
  const completedVideos = videos.filter((v) => v.status === JobStatus.Completed);
  const processingVideos = videos.filter((v) => v.status === JobStatus.Processing);
  const totalTimeSaved = completedVideos.reduce(
    (acc, v) => acc + (v.removedDuration || 0),
    0
  );
  const totalStorageBytes = videos.reduce(
    (acc, v) => acc + Number(v.originalSize || 0),
    0
  );

  const stats = [
    {
      label: 'Total Videos',
      value: total.toString(),
      icon: Video,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Processing Now',
      value: processingVideos.length.toString(),
      icon: BarChart2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Storage Used',
      value: bytes(totalStorageBytes, { unitSeparator: ' ' }) || '0 B',
      icon: Upload,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    {
      label: 'Time Saved',
      value: formatDuration(totalTimeSaved),
      icon: Clock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  // Build chart data (last 7 items)
  const chartData = videos
    .slice(0, 7)
    .reverse()
    .map((v) => ({
      name: v.originalFileName.slice(0, 8) + '...',
      original: v.originalDuration ? Math.round(v.originalDuration / 60) : 0,
      final: v.finalDuration ? Math.round(v.finalDuration / 60) : 0,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
        </div>
        <Link href="/upload">
          <Button leftIcon={<Upload size={16} />}>Upload Video</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} padding="sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown size={18} className="text-primary-400" />
            <h2 className="font-semibold text-white">Video Duration Comparison (minutes)</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="original" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="final" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="name" stroke="#4a4a6a" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis stroke="#4a4a6a" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#16161f',
                  border: '1px solid #1e1e2e',
                  borderRadius: '8px',
                  color: '#f8f8ff',
                }}
              />
              <Area
                type="monotone"
                dataKey="original"
                stroke="#3b82f6"
                fill="url(#original)"
                name="Original"
              />
              <Area
                type="monotone"
                dataKey="final"
                stroke="#8b5cf6"
                fill="url(#final)"
                name="Processed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Recent videos */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-white">Recent Videos</h2>
          <Link
            href="/history"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center">
            <Video size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No videos yet</p>
            <p className="text-gray-600 text-sm mt-1">Upload your first video to get started</p>
            <Link href="/upload" className="mt-4 inline-block">
              <Button size="sm" className="mt-4">
                Upload Video
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {videos.slice(0, 5).map((video) => (
              <div key={video.id} className="py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                  <Video size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {video.originalFileName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })} ·{' '}
                    {bytes(Number(video.originalSize), { unitSeparator: ' ' })}
                    {video.reductionPercent && (
                      <span className="text-emerald-400 ml-1.5">
                        · {video.reductionPercent.toFixed(0)}% reduced
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={video.status as JobStatus} />
                {video.status === JobStatus.Completed && (
                  <Link href={`/jobs/${video.jobs?.[0]?.id}`}>
                    <button className="p-2 text-gray-500 hover:text-primary-400 transition-colors">
                      <Download size={15} />
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
