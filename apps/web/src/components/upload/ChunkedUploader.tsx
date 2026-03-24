'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import bytes from 'bytes';
import { useUpload } from '@/hooks/useUpload';
import { ProcessingMode } from '@autocut/shared';

interface ChunkedUploaderProps {
  file: File;
  options: {
    processingMode: ProcessingMode;
    paddingMs: number;
    noiseReduction: boolean;
    overlapVoiceDetection: boolean;
  };
  onComplete: (videoProjectId: string, jobId: string) => void;
  onError: (error: string) => void;
  autoStart?: boolean;
}

export function ChunkedUploader({
  file,
  options,
  onComplete,
  onError,
  autoStart = true,
}: ChunkedUploaderProps) {
  const { state, upload } = useUpload();

  useEffect(() => {
    if (autoStart && file) {
      upload(file, options);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.status === 'done' && state.videoProjectId && state.jobId) {
      onComplete(state.videoProjectId, state.jobId);
    }
  }, [state.status, state.videoProjectId, state.jobId, onComplete]);

  useEffect(() => {
    if (state.status === 'error' && state.error) {
      onError(state.error);
    }
  }, [state.status, state.error, onError]);

  const statusMessages: Record<string, string> = {
    idle: 'Ready to upload',
    preparing: 'Creating upload session...',
    uploading: `Uploading chunk ${state.currentChunk} of ${state.totalChunks}`,
    completing: 'Finalizing upload...',
    done: 'Upload complete! Starting processing...',
    error: state.error || 'Upload failed',
  };

  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300 font-medium truncate max-w-xs">{file.name}</span>
        <span className="text-gray-500 flex-shrink-0 ml-2">
          {bytes(file.size, { unitSeparator: ' ' })}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{statusMessages[state.status]}</span>
          <span>{state.progress}%</span>
        </div>
        <div className="h-2 bg-surface-border rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              state.status === 'error'
                ? 'bg-red-500'
                : state.status === 'done'
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-primary-600 to-violet-500'
            )}
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Chunk details */}
      {state.status === 'uploading' && state.totalChunks > 1 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: state.totalChunks }, (_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-sm transition-colors',
                i < state.currentChunk
                  ? 'bg-primary-500'
                  : i === state.currentChunk
                  ? 'bg-primary-400 animate-pulse'
                  : 'bg-surface-border'
              )}
            />
          ))}
        </div>
      )}

      {/* Bytes progress */}
      {state.status === 'uploading' && (
        <p className="text-xs text-gray-500">
          {bytes(state.bytesUploaded, { unitSeparator: ' ' })} /{' '}
          {bytes(state.totalBytes, { unitSeparator: ' ' })}
        </p>
      )}

      {/* Status icon */}
      <div className="flex items-center gap-2">
        {state.status === 'done' && (
          <>
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              Upload complete — processing started
            </span>
          </>
        )}
        {state.status === 'error' && (
          <>
            <XCircle size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{state.error}</span>
          </>
        )}
        {['preparing', 'uploading', 'completing'].includes(state.status) && (
          <>
            <Loader2 size={16} className="text-primary-400 animate-spin" />
            <span className="text-sm text-gray-400">
              Please keep this page open
            </span>
          </>
        )}
      </div>
    </div>
  );
}
