'use client';

import { Clock, TrendingDown, Scissors, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface VideoMetricsProps {
  originalDuration: number | null;
  finalDuration: number | null;
  removedDuration: number | null;
  reductionPercent: number | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function VideoMetrics({
  originalDuration,
  finalDuration,
  removedDuration,
  reductionPercent,
}: VideoMetricsProps) {
  if (!originalDuration && !finalDuration) return null;

  const metrics = [
    {
      label: 'Original Duration',
      value: originalDuration ? formatDuration(originalDuration) : '—',
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Final Duration',
      value: finalDuration ? formatDuration(finalDuration) : '—',
      icon: Scissors,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    {
      label: 'Time Removed',
      value: removedDuration ? formatDuration(removedDuration) : '—',
      icon: TrendingDown,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Reduction',
      value: reductionPercent ? `${reductionPercent.toFixed(1)}%` : '—',
      icon: BarChart2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} padding="sm" className="bg-surface-muted border-surface-border">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        </Card>
      ))}

      {/* Before/After comparison bar */}
      {originalDuration && finalDuration && (
        <div className="col-span-2 mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Before</span>
            <span>After</span>
          </div>
          <div className="relative h-4 bg-surface-border rounded-full overflow-hidden">
            {/* Original (background) */}
            <div className="absolute inset-0 bg-blue-500/20 rounded-full" />
            {/* Final (foreground) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-600 to-emerald-500 rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((finalDuration / originalDuration) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            {formatDuration(finalDuration)} / {formatDuration(originalDuration)} (
            {Math.round((finalDuration / originalDuration) * 100)}% of original)
          </p>
        </div>
      )}
    </div>
  );
}
