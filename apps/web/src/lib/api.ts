import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession } from 'next-auth/react';
import {
  ApiResponse,
  VideoProject,
  ProcessingJob,
  UploadSession,
  DashboardStats,
  PaginatedResponse,
  ProcessingMode,
  User,
} from '@autocut/shared';

const API_URL =
  typeof window !== 'undefined'
    ? '/api/backend'
    : (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const session = await getSession();
      const token = (session as { accessToken?: string })?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<ApiResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', data),

  logout: () => api.post<ApiResponse>('/auth/logout'),

  me: () => api.get<ApiResponse<User & { subscription?: unknown }>>('/auth/me'),

  refreshToken: (token: string) =>
    api.post<ApiResponse<{ accessToken: string; expiresIn: number }>>(
      '/auth/refresh-token',
      { token }
    ),
};

// ============================================================
// Videos API
// ============================================================

export const videosApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<VideoProject>>>('/videos', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<VideoProject & { jobs: ProcessingJob[] }>>(`/videos/${id}`),

  reprocess: (
    id: string,
    data?: {
      processingMode?: ProcessingMode;
      paddingMs?: number;
      noiseReduction?: boolean;
      overlapVoiceDetection?: boolean;
    }
  ) =>
    api.post<ApiResponse<{ videoProjectId: string; jobId: string }>>(
      `/videos/${id}/reprocess`,
      data
    ),

  delete: (id: string) => api.delete<ApiResponse>(`/videos/${id}`),

  getDownloadUrl: (id: string) =>
    api.get<ApiResponse<{ downloadUrl: string; fileName: string; expiresIn: number }>>(
      `/videos/${id}/download`
    ),
};

// ============================================================
// Jobs API
// ============================================================

export const jobsApi = {
  getStatus: (jobId: string) =>
    api.get<ApiResponse<{
      id: string;
      status: string;
      progress: number;
      currentStep: string | null;
      startedAt: string | null;
      completedAt: string | null;
      errorMessage: string | null;
      videoProject: Partial<VideoProject>;
      updatedAt: string;
    }>>(`/jobs/${jobId}/status`),

  getLogs: (jobId: string) =>
    api.get<ApiResponse<{
      jobId: string;
      logs: Array<{ timestamp: string; level: string; message: string; metadata?: unknown }>;
      status: string;
      progress: number;
      currentStep: string | null;
    }>>(`/jobs/${jobId}/logs`),
};

// ============================================================
// Uploads API
// ============================================================

export const uploadsApi = {
  createSession: (data: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    processingMode?: ProcessingMode;
    paddingMs?: number;
    noiseReduction?: boolean;
    overlapVoiceDetection?: boolean;
  }) =>
    api.post<ApiResponse<{
      sessionId: string;
      storageKey: string;
      expiresAt: string;
    }>>('/uploads/sessions', data),

  presignChunk: (sessionId: string, chunkIndex: number) =>
    api.post<ApiResponse<{ presignedUrl: string; chunkIndex: number; storageKey: string }>>(
      `/uploads/sessions/${sessionId}/presign/${chunkIndex}`
    ),

  markChunkUploaded: (sessionId: string, chunkIndex: number) =>
    api.post<ApiResponse<{ uploadedChunks: number; totalChunks: number; progress: number }>>(
      `/uploads/sessions/${sessionId}/chunk`,
      { chunkIndex }
    ),

  completeSession: (
    sessionId: string,
    data: {
      processingMode: ProcessingMode;
      paddingMs?: number;
      noiseReduction?: boolean;
      overlapVoiceDetection?: boolean;
    }
  ) =>
    api.post<ApiResponse<{ videoProjectId: string; jobId: string }>>(
      `/uploads/sessions/${sessionId}/complete`,
      data
    ),

  getSession: (sessionId: string) =>
    api.get<ApiResponse<UploadSession>>(`/uploads/sessions/${sessionId}`),

  cancelSession: (sessionId: string) =>
    api.delete<ApiResponse>(`/uploads/sessions/${sessionId}`),
};

// ============================================================
// Admin API
// ============================================================

export const adminApi = {
  getJobs: (params?: { page?: number; pageSize?: number; status?: string; userId?: string }) =>
    api.get<ApiResponse<PaginatedResponse<ProcessingJob>>>('/admin/jobs', { params }),

  getUsers: (params?: { page?: number; pageSize?: number; search?: string }) =>
    api.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', { params }),

  getStats: () => api.get<ApiResponse<DashboardStats & { queue: unknown }>>('/admin/stats'),
};

// ============================================================
// Direct S3 upload utility
// ============================================================

export async function uploadChunkToS3(
  presignedUrl: string,
  chunk: Blob,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('S3 upload aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(chunk);
  });
}

export default api;
