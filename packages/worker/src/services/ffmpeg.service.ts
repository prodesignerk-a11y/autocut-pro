import ffmpeg from 'fluent-ffmpeg';
import { Job } from 'bullmq';
import path from 'path';
import fs from 'fs';
import {
  VideoProbeResult,
  SilenceSegment,
  TimelineSegment,
  ProcessingMode,
  ProcessResult,
  VideoJobData,
} from '@autocut/shared';
import { workerLogger as logger } from '../logger';

// Set FFmpeg paths from env
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export async function probeVideo(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`FFprobe failed: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      const format = metadata.format;

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const fps = videoStream.r_frame_rate
        ? eval(videoStream.r_frame_rate) // e.g. "30000/1001" -> 29.97
        : 30;

      resolve({
        duration: parseFloat(format.duration as string) || 0,
        codec: videoStream.codec_name || 'unknown',
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: parseInt(format.bit_rate as string) || 0,
        fps,
        audioCodec: audioStream?.codec_name || null,
        format: format.format_name || 'unknown',
      });
    });
  });
}

export async function detectSilence(
  filePath: string,
  threshold: number = -30,
  minDuration: number = 0.5
): Promise<SilenceSegment[]> {
  return new Promise((resolve, reject) => {
    const silences: SilenceSegment[] = [];
    let stderr = '';

    ffmpeg(filePath)
      .audioFilters(`silencedetect=noise=${threshold}dB:duration=${minDuration}`)
      .format('null')
      .output('/dev/null')
      .on('stderr', (line: string) => {
        stderr += line + '\n';

        // Parse silence_start
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        if (startMatch) {
          silences.push({
            start: parseFloat(startMatch[1]),
            end: 0,
            duration: 0,
          });
        }

        // Parse silence_end
        const endMatch = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);
        if (endMatch && silences.length > 0) {
          const last = silences[silences.length - 1];
          last.end = parseFloat(endMatch[1]);
          last.duration = parseFloat(endMatch[2]);
        }
      })
      .on('end', () => {
        // Filter out incomplete entries
        const complete = silences.filter((s) => s.end > s.start);
        logger.info('Silence detection complete', {
          count: complete.length,
          totalSilence: complete.reduce((acc, s) => acc + s.duration, 0).toFixed(2),
        });
        resolve(complete);
      })
      .on('error', (err: Error) => {
        logger.error('FFmpeg silence detection error', { error: err.message });
        reject(new Error(`Silence detection failed: ${err.message}`));
      })
      .run();
  });
}

export function buildCutTimeline(
  silenceSegments: SilenceSegment[],
  totalDuration: number,
  mode: ProcessingMode,
  paddingMs: number
): TimelineSegment[] {
  const paddingSec = paddingMs / 1000;

  // Mode thresholds
  const modeConfig = {
    [ProcessingMode.Light]: { minSilence: 1.5, padding: Math.max(paddingSec, 0.3) },
    [ProcessingMode.Medium]: { minSilence: 0.8, padding: Math.max(paddingSec, 0.2) },
    [ProcessingMode.Aggressive]: { minSilence: 0.3, padding: Math.max(paddingSec, 0.1) },
  };

  const config = modeConfig[mode];

  // Filter silences by minimum duration
  const significantSilences = silenceSegments.filter(
    (s) => s.duration >= config.minSilence
  );

  if (significantSilences.length === 0) {
    // No silences to cut — return full video
    return [{ start: 0, end: totalDuration }];
  }

  // Build speech segments (inverse of silence)
  const speechSegments: TimelineSegment[] = [];
  let cursor = 0;

  for (const silence of significantSilences) {
    const speechStart = cursor;
    // Add padding before silence end
    const speechEnd = silence.start + config.padding;

    if (speechEnd > speechStart + 0.05) {
      // Avoid tiny segments < 50ms
      speechSegments.push({
        start: Math.max(0, speechStart),
        end: Math.min(totalDuration, speechEnd),
      });
    }

    // Next speech starts after silence with padding
    cursor = silence.end - config.padding;
  }

  // Add final segment
  if (cursor < totalDuration - 0.05) {
    speechSegments.push({
      start: Math.max(0, cursor),
      end: totalDuration,
    });
  }

  // Merge overlapping segments
  const merged: TimelineSegment[] = [];
  for (const seg of speechSegments) {
    if (merged.length === 0) {
      merged.push({ ...seg });
    } else {
      const last = merged[merged.length - 1];
      if (seg.start <= last.end + 0.01) {
        last.end = Math.max(last.end, seg.end);
      } else {
        merged.push({ ...seg });
      }
    }
  }

  logger.info('Timeline built', {
    mode,
    originalDuration: totalDuration,
    segments: merged.length,
    estimatedOutputDuration: merged.reduce((acc, s) => acc + (s.end - s.start), 0).toFixed(2),
  });

  return merged;
}

export function generateSelectFilter(segments: TimelineSegment[]): string {
  const conditions = segments
    .map((s) => `between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})`)
    .join('+');
  return conditions;
}

export async function trimAndConcat(
  inputPath: string,
  outputPath: string,
  segments: TimelineSegment[],
  job: Job<VideoJobData>
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const totalInputDuration = segments.reduce(
      (acc, s) => acc + (s.end - s.start),
      0
    );

    const selectConditions = generateSelectFilter(segments);

    // Build filter_complex
    // Use select/aselect for frame-accurate cutting, then setpts/asetpts to reset timestamps
    const filterComplex = [
      `[0:v]select='${selectConditions}',setpts=N/FRAME_RATE/TB[v]`,
      `[0:a]aselect='${selectConditions}',asetpts=N/SR/TB[a]`,
    ].join(';');

    let lastProgress = 0;

    ffmpeg(inputPath)
      .complexFilter(filterComplex)
      .map('[v]')
      .map('[a]')
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (progress: { percent?: number; timemark?: string }) => {
        const percent = progress.percent || 0;
        if (percent - lastProgress >= 5) {
          lastProgress = percent;
          job.updateProgress(Math.min(90, Math.round(40 + percent * 0.5)));
          logger.debug('FFmpeg progress', { percent: percent.toFixed(1) });
        }
      })
      .on('end', async () => {
        // Probe output to get actual final duration
        let finalDuration = totalInputDuration;
        try {
          const probed = await probeVideo(outputPath);
          finalDuration = probed.duration;
        } catch {
          // fallback estimate
        }

        const originalDuration = segments.reduce(
          (acc, s) => acc + (s.end - s.start),
          0
        );
        const removedDuration = originalDuration - finalDuration;
        const reductionPercent =
          originalDuration > 0
            ? (removedDuration / originalDuration) * 100
            : 0;

        resolve({
          outputPath,
          finalDuration,
          removedDuration: Math.max(0, removedDuration),
          reductionPercent: Math.max(0, reductionPercent),
        });
      })
      .on('error', (err: Error, stdout: string, stderr: string) => {
        logger.error('FFmpeg trimAndConcat error', {
          error: err.message,
          stderr,
        });
        reject(new Error(`FFmpeg processing failed: ${err.message}`));
      })
      .run();
  });
}
