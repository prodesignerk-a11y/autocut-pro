import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CompletedPart,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const BUCKET = process.env.S3_BUCKET_NAME || 'autocut-pro-videos';
const PRESIGNED_URL_EXPIRES = 3600; // 1 hour

export const s3 = {
  client: s3Client,
  bucket: BUCKET,

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    sizeBytes: number
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES,
    });

    logger.debug('Generated presigned upload URL', { key, contentType });
    return url;
  },

  async getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES,
    });

    return url;
  },

  async deleteObject(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    logger.debug('Deleted S3 object', { key });
  },

  async copyObject(sourceKey: string, destKey: string): Promise<void> {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${sourceKey}`,
        Key: destKey,
      })
    );
    logger.debug('Copied S3 object', { sourceKey, destKey });
  },

  generateChunkKey(uploadSessionId: string, chunkIndex: number): string {
    return `uploads/chunks/${uploadSessionId}/chunk_${String(chunkIndex).padStart(6, '0')}`;
  },

  generateVideoKey(userId: string, fileName: string, type: 'original' | 'output'): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `videos/${userId}/${type}/${timestamp}_${sanitized}`;
  },

  async initiateMultipartUpload(
    key: string,
    contentType: string
  ): Promise<string> {
    const response = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      })
    );

    if (!response.UploadId) {
      throw new Error('Failed to initiate multipart upload');
    }

    logger.debug('Initiated multipart upload', { key, uploadId: response.UploadId });
    return response.UploadId;
  },

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array | string
  ): Promise<{ ETag: string; PartNumber: number }> {
    const response = await s3Client.send(
      new UploadPartCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      })
    );

    if (!response.ETag) {
      throw new Error(`Failed to upload part ${partNumber}`);
    }

    return { ETag: response.ETag, PartNumber: partNumber };
  },

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompletedPart[]
  ): Promise<string> {
    const response = await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    logger.debug('Completed multipart upload', { key, uploadId });
    return response.Location || key;
  },

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
      })
    );
    logger.debug('Aborted multipart upload', { key, uploadId });
  },

  getPublicUrl(key: string): string {
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    return `https://${BUCKET}.s3.amazonaws.com/${key}`;
  },
};

export default s3;
