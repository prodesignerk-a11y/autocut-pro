'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, X } from 'lucide-react';
import { clsx } from 'clsx';
import bytes from 'bytes';

const ACCEPTED_TYPES = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  'video/x-matroska': ['.mkv'],
  'video/mpeg': ['.mpeg', '.mpg'],
};

const MAX_SIZE_BYTES = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || '2048') * 1024 * 1024;

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, selectedFile, onClear, disabled }: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    disabled: disabled || !!selectedFile,
  });

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-primary-600/50 rounded-xl p-8 bg-primary-600/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-600/20 flex items-center justify-center flex-shrink-0">
            <FileVideo size={28} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{selectedFile.name}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {bytes(selectedFile.size, { unitSeparator: ' ' })}
            </p>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-primary-500 bg-primary-600/10'
            : 'border-surface-border hover:border-primary-600/60 hover:bg-surface-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div
            className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all',
              isDragActive
                ? 'bg-primary-600/30'
                : 'bg-surface-muted'
            )}
          >
            <Upload
              size={28}
              className={clsx(
                'transition-colors',
                isDragActive ? 'text-primary-400' : 'text-gray-500'
              )}
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-white">
              {isDragActive ? 'Drop your video here' : 'Upload your video'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Drag & drop or{' '}
              <span className="text-primary-400 hover:text-primary-300 cursor-pointer">
                browse files
              </span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            <span>MP4</span>
            <span>•</span>
            <span>MOV</span>
            <span>•</span>
            <span>AVI</span>
            <span>•</span>
            <span>WebM</span>
            <span>•</span>
            <span>MKV</span>
          </div>

          <p className="text-xs text-gray-600">
            Maximum file size: {bytes(MAX_SIZE_BYTES, { unitSeparator: ' ' })}
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {errors.map((e) => (
                <p key={e.code} className="text-sm text-red-400">
                  {e.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
