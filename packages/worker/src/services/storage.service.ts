import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { workerLogger as logger } from '../logger';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET = process.env.S3_BUCKET_NAME || 'autocut-pro-videos';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/autocut';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function downloadToTemp(s3Key: string): Promise<string> {
  const fileName = path.basename(s3Key);
  const localPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);

  logger.info('Downloading file from S3', { s3Key, localPath });

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`No body in S3 response for key: ${s3Key}`);
  }

  const writeStream = fs.createWriteStream(localPath);
  await pipeline(response.Body as Readable, writeStream);

  const stats = fs.statSync(localPath);
  logger.info('File downloaded', { localPath, sizeBytes: stats.size });

  return localPath;
}

export async function uploadResult(localPath: string, s3Key: string): Promise<void> {
  logger.info('Uploading result to S3', { localPath, s3Key });

  const stats = fs.statSync(localPath);
  const fileStream = fs.createReadStream(localPath);

  const ext = path.extname(localPath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
  };

  const contentType = contentTypeMap[ext] || 'video/mp4';

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: fileStream,
      ContentType: contentType,
      ContentLength: stats.size,
    })
  );

  logger.info('Upload complete', { s3Key, sizeBytes: stats.size });
}

export async function cleanupTemp(paths: string[]): Promise<void> {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug('Cleaned up temp file', { filePath });
      }
    } catch (err) {
      logger.warn('Failed to cleanup temp file', {
        filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export function getTempPath(prefix: string, ext: string = '.mp4'): string {
  return path.join(TEMP_DIR, `${prefix}_${Date.now()}${ext}`);
}
