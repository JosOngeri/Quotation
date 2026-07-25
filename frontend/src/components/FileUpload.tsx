import React, { useState, useRef } from 'react';
import axios from 'axios';

interface FileUploadProps {
  uploadType?: 'quotes' | 'projects' | 'suppliers' | 'general';
  entityType?: string;
  entityId?: string;
  onUploadComplete?: (files: any[]) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
  maxFiles?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  uploadType = 'general',
  entityType,
  entityId,
  onUploadComplete,
  onError,
  multiple = false,
  maxFiles = 5
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (multiple && files.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      onError?.('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF');
      return;
    }

    // Validate file sizes (10MB max)
    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      onError?.('File size exceeds 10MB limit');
      return;
    }

    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      onError?.('No files selected');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        if (multiple) {
          formData.append('files', file);
        } else {
          formData.append('file', file);
        }
      });

      formData.append('uploadType', uploadType);
      if (entityType) formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);

      const endpoint = multiple 
        ? '/api/v1/files/upload-multiple'
        : '/api/v1/files/upload';

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        }
      });

      onUploadComplete?.(response.data.data);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Upload failed';
      onError?.(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="file-upload">
      <div className="upload-area">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple={multiple}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
          className="file-input"
          disabled={uploading}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="select-files-btn"
          disabled={uploading}
        >
          {multiple ? 'Select Files' : 'Select File'}
        </button>

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files:</h4>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({formatFileSize(file.size)})
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <button
            onClick={handleUpload}
            className="upload-btn"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        )}

        {uploading && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}
      </div>

      <div className="upload-info">
        <p>Allowed file types: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF</p>
        <p>Maximum file size: 10MB</p>
        {multiple && <p>Maximum files: {maxFiles}</p>}
      </div>
    </div>
  );
};

export default FileUpload;