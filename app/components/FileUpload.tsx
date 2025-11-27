'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024 // 50MB
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('');

    // Check file count
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check total size
    const currentSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const newSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > maxSize) {
      setError(`Total file size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Add new files
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    const updated = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updated);
    onFilesChange(updated);

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => f.errors[0]?.message).join(', ');
      setError(`Some files were rejected: ${reasons}`);
    }
  }, [uploadedFiles, maxFiles, maxSize, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt'],
    },
    maxSize,
    multiple: true,
    // @ts-ignore - Enable folder upload in supported browsers
    ...({ webkitdirectory: true, directory: true, mozdirectory: true } as any),
  });

  const removeFile = (id: string) => {
    const updated = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updated);
    onFilesChange(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const totalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto mb-4 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} size={48} />
        {isDragActive ? (
          <p className="text-lg font-semibold text-primary-600">Drop files here...</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Drag & drop files or folders here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported: PDF, Word (DOCX/DOC), Images (JPG/PNG), Text files, and entire folders
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Max {maxFiles} files, {Math.round(maxSize / 1024 / 1024)}MB total
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </h3>
            <span className="text-sm text-gray-500">
              Total: {formatSize(totalSize)} / {Math.round(maxSize / 1024 / 1024)}MB
            </span>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* File Icon/Preview */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center text-2xl bg-gray-100 rounded">
                    {getFileIcon(file.type)}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {file.status === 'success' && (
                    <CheckCircle className="text-green-500" size={20} />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="text-red-500" size={20} />
                  )}
                  {file.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Remove file"
                  >
                    <X size={20} className="text-gray-500 hover:text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {uploadedFiles.length === 0 && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>📎 Tip:</strong> Upload documents like:
          </p>
          <ul className="text-sm text-blue-700 mt-2 ml-5 list-disc space-y-1">
            <li>CV/Resume (PDF or Word)</li>
            <li>Award certificates and letters</li>
            <li>Published articles or papers</li>
            <li>Media coverage (screenshots or PDFs)</li>
            <li>Letters of recommendation</li>
            <li>Competition results or rankings</li>
          </ul>
        </div>
      )}
    </div>
  );
}
