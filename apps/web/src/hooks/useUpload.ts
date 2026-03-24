'use client';

import { useState, useCallback } from 'react';
import { uploadsApi, uploadChunkToS3 } from '@/lib/api';
import { ProcessingMode } from '@autocut/shared';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;

interface UploadOptions {
  processingMode: ProcessingMode;
  paddingMs: number;
  noiseReduction: boolean;
  overlapVoiceDetection: boolean;
}

interface UploadState {
  status: 'idle' | 'preparing' | 'uploading' | 'completing' | 'done' | 'error';
  progress: number;
  currentChunk: number;
  totalChunks: number;
  sessionId: string | null;
  videoProjectId: string | null;
  jobId: string | null;
  error: string | null;
  bytesUploaded: number;
  totalBytes: number;
}

interface UseUploadReturn {
  state: UploadState;
  upload: (file: File, options: UploadOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    currentChunk: 0,
    totalChunks: 0,
    sessionId: null,
    videoProjectId: null,
    jobId: null,
    error: null,
    bytesUploaded: 0,
    totalBytes: 0,
  });

  const [cancelRequested, setCancelRequested] = useState(false);

  const cancel = useCallback(() => {
    setCancelRequested(true);
    setState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  const reset = useCallback(() => {
    setCancelRequested(false);
    setState({
      status: 'idle',
      progress: 0,
      currentChunk: 0,
      totalChunks: 0,
      sessionId: null,
      videoProjectId: null,
      jobId: null,
      error: null,
      bytesUploaded: 0,
      totalBytes: 0,
    });
  }, []);

  const upload = useCallback(
    async (file: File, options: UploadOptions) => {
      setCancelRequested(false);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      setState({
        status: 'preparing',
        progress: 0,
        currentChunk: 0,
        totalChunks,
        sessionId: null,
        videoProjectId: null,
        jobId: null,
        error: null,
        bytesUploaded: 0,
        totalBytes: file.size,
      });

      try {
        // Step 1: Create upload session
        const sessionRes = await uploadsApi.createSession({
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          processingMode: options.processingMode,
          paddingMs: options.paddingMs,
          noiseReduction: options.noiseReduction,
          overlapVoiceDetection: options.overlapVoiceDetection,
        });

        const sessionId = sessionRes.data.data!.sessionId;

        setState((prev) => ({
          ...prev,
          status: 'uploading',
          sessionId,
        }));

        // Step 2: Upload chunks
        let bytesUploaded = 0;

        for (let i = 0; i < totalChunks; i++) {
          if (cancelRequested) {
            await uploadsApi.cancelSession(sessionId);
            return;
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          // Get presigned URL for this chunk
          let presignedUrl: string | null = null;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const presignRes = await uploadsApi.presignChunk(sessionId, i);
              presignedUrl = presignRes.data.data!.presignedUrl;
              break;
            } catch (err) {
              if (attempt === MAX_RETRIES - 1) throw err;
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }

          if (!presignedUrl) throw new Error('Failed to get presigned URL');

          // Upload chunk directly to S3
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              await uploadChunkToS3(presignedUrl, chunk, (chunkProgress) => {
                const chunkBytes = chunk.size * (chunkProgress / 100);
                const totalProgress = bytesUploaded + chunkBytes;
                const overallProgress = Math.round((totalProgress / file.size) * 100);

                setState((prev) => ({
                  ...prev,
                  progress: overallProgress,
                  currentChunk: i + 1,
                }));
              });
              break;
            } catch (err) {
              if (attempt === MAX_RETRIES - 1) throw err;
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }

          // Mark chunk as uploaded in server
          await uploadsApi.markChunkUploaded(sessionId, i);

          bytesUploaded += chunk.size;
          setState((prev) => ({
            ...prev,
            progress: Math.round((bytesUploaded / file.size) * 100),
            currentChunk: i + 1,
            bytesUploaded,
          }));
        }

        // Step 3: Complete upload and start processing
        setState((prev) => ({ ...prev, status: 'completing', progress: 100 }));

        const completeRes = await uploadsApi.completeSession(sessionId, {
          processingMode: options.processingMode,
          paddingMs: options.paddingMs,
          noiseReduction: options.noiseReduction,
          overlapVoiceDetection: options.overlapVoiceDetection,
        });

        const { videoProjectId, jobId } = completeRes.data.data!;

        setState((prev) => ({
          ...prev,
          status: 'done',
          videoProjectId,
          jobId,
        }));
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed';

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
      }
    },
    [cancelRequested]
  );

  return { state, upload, cancel, reset };
}
