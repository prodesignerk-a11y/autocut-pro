'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/upload/UploadZone';
import { ChunkedUploader } from '@/components/upload/ChunkedUploader';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProcessingMode } from '@autocut/shared';
import {
  Zap,
  Scissors,
  Radio,
  Info,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const MODE_OPTIONS = [
  {
    value: ProcessingMode.Light,
    label: 'Light',
    description: 'Remove long silences only (>1.5s). Conservative — great for interviews.',
    icon: Radio,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    value: ProcessingMode.Medium,
    label: 'Medium',
    description: 'Remove silences >0.8s. Balanced for most content types.',
    icon: Scissors,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
  },
  {
    value: ProcessingMode.Aggressive,
    label: 'Aggressive',
    description: 'Remove silences >0.3s. Maximum cuts for lectures and tutorials.',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(ProcessingMode.Medium);
  const [paddingMs, setPaddingMs] = useState(200);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [overlapVoiceDetection, setOverlapVoiceDetection] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setIsUploading(false);
    setUploadComplete(false);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadComplete(false);
  }, []);

  const handleStartUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a video file first');
      return;
    }
    setIsUploading(true);
  };

  const handleUploadComplete = (videoProjectId: string, jobId: string) => {
    setUploadComplete(true);
    toast.success('Upload complete! Processing started.');
    setTimeout(() => {
      router.push(`/jobs/${jobId}`);
    }, 1500);
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
    setIsUploading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Video</h1>
        <p className="text-gray-400 mt-1">
          Upload your video and our AI will automatically remove silences and pauses.
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Select Video File</CardTitle>
          <CardDescription>
            Supported formats: MP4, MOV, AVI, WebM, MKV — up to 2GB
          </CardDescription>
        </CardHeader>

        {isUploading ? (
          <ChunkedUploader
            file={selectedFile!}
            options={{ processingMode, paddingMs, noiseReduction, overlapVoiceDetection }}
            onComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        ) : (
          <UploadZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
          />
        )}
      </Card>

      {/* Processing Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Mode</CardTitle>
          <CardDescription>
            Choose how aggressively silences are removed
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-3 gap-3">
          {MODE_OPTIONS.map(({ value, label, description, icon: Icon, color, bg, border }) => (
            <button
              key={value}
              onClick={() => setProcessingMode(value)}
              disabled={isUploading}
              className={clsx(
                'p-4 rounded-xl border-2 text-left transition-all',
                processingMode === value
                  ? `${border} ${bg}`
                  : 'border-surface-border bg-surface-muted hover:border-gray-600'
              )}
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className={clsx('font-semibold text-sm', processingMode === value ? color : 'text-white')}>
                {label}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Advanced Options */}
      <Card>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-gray-400" />
            <span className="font-semibold text-white">Advanced Options</span>
          </div>
          {showAdvanced ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-5 pt-5 border-t border-surface-border">
            {/* Padding */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-sm font-medium text-white">Voice Padding</label>
                  <p className="text-xs text-gray-500">Buffer kept around speech segments</p>
                </div>
                <span className="text-sm font-mono text-primary-400">{paddingMs}ms</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={50}
                value={paddingMs}
                onChange={(e) => setPaddingMs(parseInt(e.target.value))}
                disabled={isUploading}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>50ms (tight)</span>
                <span>500ms (loose)</span>
              </div>
            </div>

            {/* Noise Reduction */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">Noise Reduction</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Increase silence threshold to handle background noise
                </p>
              </div>
              <button
                onClick={() => setNoiseReduction(!noiseReduction)}
                disabled={isUploading}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                  noiseReduction ? 'bg-primary-600' : 'bg-surface-border'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                    noiseReduction ? 'translate-x-4' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Overlap Voice Detection */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">Conservative Voice Detection</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Apply extra padding to avoid cutting speech edges
                </p>
              </div>
              <button
                onClick={() => setOverlapVoiceDetection(!overlapVoiceDetection)}
                disabled={isUploading}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                  overlapVoiceDetection ? 'bg-primary-600' : 'bg-surface-border'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                    overlapVoiceDetection ? 'translate-x-4' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                Increasing padding reduces aggression. Values above 300ms are recommended for
                content with rapid speech or multiple speakers.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Submit */}
      {!isUploading && !uploadComplete && (
        <Button
          size="lg"
          onClick={handleStartUpload}
          disabled={!selectedFile}
          leftIcon={<Upload size={18} />}
          className="w-full"
        >
          Start Upload & Processing
        </Button>
      )}
    </div>
  );
}

function Upload({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
