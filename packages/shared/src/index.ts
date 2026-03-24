// ============================================================
// Enums
// ============================================================

export enum JobStatus {
  Uploaded = 'uploaded',
  Queued = 'queued',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum ProcessingMode {
  Light = 'light',
  Medium = 'medium',
  Aggressive = 'aggressive',
}

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export enum SubscriptionStatus {
  Active = 'active',
  Canceled = 'canceled',
  Incomplete = 'incomplete',
  IncompleteExpired = 'incomplete_expired',
  PastDue = 'past_due',
  Trialing = 'trialing',
  Unpaid = 'unpaid',
}

// ============================================================
// Core Interfaces
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxFileSizeMb: number;
  maxVideosPerMonth: number;
  maxDurationMinutes: number;
  price: number;
  stripePriceId: string | null;
  features: Record<string, unknown>;
  createdAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  plan?: SubscriptionPlan;
}

export interface VideoProject {
  id: string;
  userId: string;
  originalFileName: string;
  originalDuration: number | null;
  originalSize: number;
  storageKeyOriginal: string;
  storageKeyOutput: string | null;
  outputFileName: string | null;
  status: JobStatus;
  processingMode: ProcessingMode;
  paddingMs: number;
  noiseReduction: boolean;
  overlapVoiceDetection: boolean;
  finalDuration: number | null;
  removedDuration: number | null;
  reductionPercent: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  jobs?: ProcessingJob[];
}

export interface ProcessingJob {
  id: string;
  videoProjectId: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  workerLogs: WorkerLogEntry[];
  createdAt: Date;
  updatedAt: Date;
  videoProject?: VideoProject;
}

export interface WorkerLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface UploadSession {
  id: string;
  userId: string;
  videoProjectId: string | null;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  storageKey: string;
  expiresAt: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLog {
  id: string;
  userId: string;
  videoProjectId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================
// Request / Response types
// ============================================================

export interface ChunkUploadParams {
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  checksum?: string;
}

export interface CreateUploadSessionRequest {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  processingMode?: ProcessingMode;
  paddingMs?: number;
  noiseReduction?: boolean;
  overlapVoiceDetection?: boolean;
}

export interface CreateUploadSessionResponse {
  sessionId: string;
  storageKey: string;
  expiresAt: string;
}

export interface PresignChunkResponse {
  presignedUrl: string;
  chunkIndex: number;
  storageKey: string;
}

export interface CompleteUploadRequest {
  processingMode: ProcessingMode;
  paddingMs?: number;
  noiseReduction?: boolean;
  overlapVoiceDetection?: boolean;
}

export interface CompleteUploadResponse {
  videoProjectId: string;
  jobId: string;
}

export interface JobProgressEvent {
  jobId: string;
  videoProjectId: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  message?: string;
  updatedAt: string;
}

export interface VideoJobData {
  videoProjectId: string;
  userId: string;
  storageKeyOriginal: string;
  storageKeyOutput: string;
  processingMode: ProcessingMode;
  paddingMs: number;
  noiseReduction: boolean;
  overlapVoiceDetection: boolean;
}

export interface VideoProbeResult {
  duration: number;
  codec: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  audioCodec: string | null;
  format: string;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export interface TimelineSegment {
  start: number;
  end: number;
}

export interface ProcessResult {
  outputPath: string;
  finalDuration: number;
  removedDuration: number;
  reductionPercent: number;
}

// ============================================================
// API Response wrapper
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// Auth types
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================================
// Dashboard / Stats types
// ============================================================

export interface DashboardStats {
  totalVideos: number;
  videosThisMonth: number;
  storageUsedBytes: number;
  totalTimeSavedSeconds: number;
  completedVideos: number;
  failedVideos: number;
  processingVideos: number;
}

export interface AdminStats extends DashboardStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeJobs: number;
  queuedJobs: number;
}
