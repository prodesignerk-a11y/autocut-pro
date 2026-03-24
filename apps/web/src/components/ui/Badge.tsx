'use client';

import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { JobStatus } from '@autocut/shared';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
};

export function Badge({ variant = 'default', children, className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          variantClasses[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const statusVariantMap: Record<JobStatus, BadgeVariant> = {
  [JobStatus.Uploaded]: 'info',
  [JobStatus.Queued]: 'purple',
  [JobStatus.Processing]: 'warning',
  [JobStatus.Completed]: 'success',
  [JobStatus.Failed]: 'error',
};

const statusLabelMap: Record<JobStatus, string> = {
  [JobStatus.Uploaded]: 'Uploaded',
  [JobStatus.Queued]: 'In Queue',
  [JobStatus.Processing]: 'Processing',
  [JobStatus.Completed]: 'Completed',
  [JobStatus.Failed]: 'Failed',
};

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: JobStatus | string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const jobStatus = status as JobStatus;
  const variant = statusVariantMap[jobStatus] || 'default';
  const label = statusLabelMap[jobStatus] || status;

  return (
    <Badge variant={variant} className={className} {...props}>
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          {
            'bg-blue-400': jobStatus === JobStatus.Uploaded,
            'bg-purple-400': jobStatus === JobStatus.Queued,
            'bg-amber-400 animate-pulse': jobStatus === JobStatus.Processing,
            'bg-emerald-400': jobStatus === JobStatus.Completed,
            'bg-red-400': jobStatus === JobStatus.Failed,
          }
        )}
      />
      {label}
    </Badge>
  );
}
