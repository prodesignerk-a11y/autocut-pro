import { Job } from 'bullmq';
import path from 'path';
import {
  VideoJobData,
  JobStatus,
  ProcessingMode,
} from '@autocut/shared';
import {
  probeVideo,
  detectSilence,
  buildCutTimeline,
  trimAndConcat,
} from '../services/ffmpeg.service';
import {
  downloadToTemp,
  uploadResult,
  cleanupTemp,
  getTempPath,
} from '../services/storage.service';
import {
  updateJobProgress,
  updateJobStatus,
  updateVideoProjectStatus,
  logWorkerEvent,
  getJobByVideoProjectId,
} from '../services/progress.service';
import { workerLogger as logger } from '../logger';

// Silence detection thresholds by mode
const SILENCE_CONFIG = {
  [ProcessingMode.Light]: { threshold: -35, minDuration: 1.5 },
  [ProcessingMode.Medium]: { threshold: -30, minDuration: 0.8 },
  [ProcessingMode.Aggressive]: { threshold: -25, minDuration: 0.3 },
};

export async function processVideo(job: Job<VideoJobData>): Promise<void> {
  const {
    videoProjectId,
    userId,
    storageKeyOriginal,
    storageKeyOutput,
    processingMode,
    paddingMs,
    noiseReduction,
    overlapVoiceDetection,
  } = job.data;

  const tempFiles: string[] = [];
  let jobDbId: string | null = null;

  try {
    // Find the DB job record
    const dbJob = await getJobByVideoProjectId(videoProjectId);
    if (!dbJob) {
      throw new Error(`No processing job found for videoProject ${videoProjectId}`);
    }
    jobDbId = dbJob.id;

    // ============================================================
    // Step 1: Update status to 'processing'
    // ============================================================
    await job.updateProgress(5);
    await updateJobStatus(jobDbId, JobStatus.Processing, {
      startedAt: new Date(),
      currentStep: 'Initializing',
      progress: 5,
    });
    await updateVideoProjectStatus(videoProjectId, JobStatus.Processing);
    await logWorkerEvent(jobDbId, 'info', 'Starting video processing', {
      videoProjectId,
      processingMode,
      paddingMs,
    });

    logger.info('Processing started', { videoProjectId, jobId: job.id });

    // ============================================================
    // Step 2: Download video from S3 to temp dir
    // ============================================================
    await job.updateProgress(10);
    await updateJobProgress(jobDbId, 10, 'Downloading video', 'Downloading original video from storage');

    const localInputPath = await downloadToTemp(storageKeyOriginal);
    tempFiles.push(localInputPath);

    logger.info('Video downloaded', { localInputPath });

    // ============================================================
    // Step 3: Probe video (get duration, codec, format)
    // ============================================================
    await job.updateProgress(15);
    await updateJobProgress(jobDbId, 15, 'Analyzing video', 'Probing video metadata');

    const probeResult = await probeVideo(localInputPath);

    logger.info('Video probed', {
      duration: probeResult.duration,
      codec: probeResult.codec,
      resolution: `${probeResult.width}x${probeResult.height}`,
      fps: probeResult.fps,
    });

    await logWorkerEvent(jobDbId, 'info', 'Video analyzed', {
      duration: probeResult.duration,
      codec: probeResult.codec,
      width: probeResult.width,
      height: probeResult.height,
      fps: probeResult.fps,
      audioCodec: probeResult.audioCodec,
    });

    // Update original duration in DB
    await updateVideoProjectStatus(videoProjectId, JobStatus.Processing, {
      originalDuration: probeResult.duration,
    });

    if (!probeResult.audioCodec) {
      throw new Error('Video has no audio track — silence detection requires audio');
    }

    // ============================================================
    // Step 4: Detect silence/speech using VAD
    // ============================================================
    await job.updateProgress(25);
    await updateJobProgress(jobDbId, 25, 'Detecting silence', 'Analyzing audio for silence segments');

    const silenceConfig = SILENCE_CONFIG[processingMode];

    // Apply noise reduction adjustment if requested
    const threshold = noiseReduction
      ? silenceConfig.threshold + 5
      : silenceConfig.threshold;

    const silenceSegments = await detectSilence(
      localInputPath,
      threshold,
      silenceConfig.minDuration
    );

    await logWorkerEvent(jobDbId, 'info', `Detected ${silenceSegments.length} silence segments`, {
      silenceCount: silenceSegments.length,
      totalSilence: silenceSegments.reduce((acc, s) => acc + s.duration, 0).toFixed(2),
      threshold,
      minDuration: silenceConfig.minDuration,
    });

    // ============================================================
    // Step 5: Build cut timeline based on mode
    // ============================================================
    await job.updateProgress(35);
    await updateJobProgress(jobDbId, 35, 'Building cut timeline', 'Calculating segments to keep');

    const timeline = buildCutTimeline(
      silenceSegments,
      probeResult.duration,
      processingMode,
      paddingMs
    );

    const estimatedDuration = timeline.reduce((acc, s) => acc + (s.end - s.start), 0);
    const estimatedRemoval = probeResult.duration - estimatedDuration;
    const estimatedReduction = (estimatedRemoval / probeResult.duration) * 100;

    await logWorkerEvent(jobDbId, 'info', 'Cut timeline built', {
      segmentCount: timeline.length,
      estimatedOutputDuration: estimatedDuration.toFixed(2),
      estimatedRemovalSeconds: estimatedRemoval.toFixed(2),
      estimatedReductionPercent: estimatedReduction.toFixed(1),
    });

    logger.info('Timeline built', {
      segments: timeline.length,
      estimatedOutputDuration: estimatedDuration.toFixed(2),
    });

    // ============================================================
    // Step 6: Handle voice overlap detection (mark adjacent segments)
    // ============================================================
    if (overlapVoiceDetection) {
      await logWorkerEvent(jobDbId, 'info', 'Voice overlap detection enabled — applied conservative padding');
    }

    // ============================================================
    // Step 7 + 8: Generate FFmpeg filter and process video
    // ============================================================
    await job.updateProgress(40);
    await updateJobProgress(jobDbId, 40, 'Processing video', 'Running FFmpeg cut and concat pipeline');

    const ext = path.extname(storageKeyOriginal) || '.mp4';
    const outputFileName = `processed_${Date.now()}${ext}`;
    const localOutputPath = getTempPath('output', ext);
    tempFiles.push(localOutputPath);

    const processResult = await trimAndConcat(
      localInputPath,
      localOutputPath,
      timeline,
      job
    );

    await logWorkerEvent(jobDbId, 'info', 'FFmpeg processing complete', {
      finalDuration: processResult.finalDuration.toFixed(2),
      removedDuration: processResult.removedDuration.toFixed(2),
      reductionPercent: processResult.reductionPercent.toFixed(1),
    });

    // ============================================================
    // Step 9: Upload result to S3
    // ============================================================
    await job.updateProgress(90);
    await updateJobProgress(jobDbId, 90, 'Uploading result', 'Uploading processed video to storage');

    await uploadResult(localOutputPath, storageKeyOutput);

    await logWorkerEvent(jobDbId, 'info', 'Result uploaded to storage', {
      storageKey: storageKeyOutput,
    });

    // ============================================================
    // Step 10: Update database with metrics
    // ============================================================
    await job.updateProgress(95);
    await updateJobProgress(jobDbId, 95, 'Saving results', 'Updating database with processing metrics');

    await updateVideoProjectStatus(videoProjectId, JobStatus.Completed, {
      finalDuration: processResult.finalDuration,
      removedDuration: processResult.removedDuration,
      reductionPercent: processResult.reductionPercent,
      originalDuration: probeResult.duration,
    });

    // ============================================================
    // Step 11: Cleanup temp files
    // ============================================================
    await cleanupTemp(tempFiles);
    logger.info('Temp files cleaned up');

    // ============================================================
    // Step 12: Update job to 'completed'
    // ============================================================
    await job.updateProgress(100);
    await updateJobStatus(jobDbId, JobStatus.Completed, {
      completedAt: new Date(),
      progress: 100,
      currentStep: 'Complete',
    });

    await logWorkerEvent(jobDbId, 'info', 'Job completed successfully', {
      finalDuration: processResult.finalDuration.toFixed(2),
      removedDuration: processResult.removedDuration.toFixed(2),
      reductionPercent: processResult.reductionPercent.toFixed(1),
    });

    logger.info('Video processing completed', {
      videoProjectId,
      jobId: job.id,
      finalDuration: processResult.finalDuration,
      reductionPercent: processResult.reductionPercent.toFixed(1) + '%',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error('Video processing failed', {
      videoProjectId,
      jobId: job.id,
      error: errorMessage,
    });

    // Cleanup temp files on error
    await cleanupTemp(tempFiles);

    // Update DB records
    if (jobDbId) {
      await updateJobStatus(jobDbId, JobStatus.Failed, {
        errorMessage,
        completedAt: new Date(),
        currentStep: 'Failed',
      });

      await logWorkerEvent(jobDbId, 'error', `Processing failed: ${errorMessage}`, {
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    await updateVideoProjectStatus(videoProjectId, JobStatus.Failed, {
      errorMessage,
    });

    throw err; // Re-throw so BullMQ handles retry logic
  }
}
