import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface File {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  upload_type: string;
  description?: string;
  created_at: string;
}

interface FileListProps {
  uploadType?: 'quotes' | 'projects' | 'suppliers' | 'general';
  entityType?: string;
  entityId?: string;
  refreshTrigger?: number;
  onFileDelete?: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  uploadType,
  entityType,
  entityId,
  refreshTrigger,
  onFileDelete
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [uploadType, entityType, entityId, refreshTrigger]);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (uploadType) params.uploadType = uploadType;
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;

      const response = await axios.get('/api/v1/files', { params });
      setFiles(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await axios.get(`/api/v1/files/${fileId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to download file');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/files/${fileId}`);
      setFiles(files.filter(file => file.id !== fileId));
      onFileDelete?.(fileId);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const isImage = (fileType: string) => {
    return fileType.includes('image');
  };

  if (loading) {
    return <div className="file-list loading">Loading files...</div>;
  }

  if (error) {
    return <div className="file-list error">{error}</div>;
  }

  if (files.length === 0) {
    return <div className="file-list empty">No files uploaded</div>;
  }

  return (
    <div className="file-list">
      <h3>Uploaded Files</h3>
      <div className="files-grid">
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <div className="file-icon">
              {getFileIcon(file.file_type)}
            </div>
            <div className="file-info">
              <div className="file-name" title={file.original_filename}>
                {file.original_filename}
              </div>
              <div className="file-meta">
                <span className="file-size">{formatFileSize(file.file_size)}</span>
                <span className="file-date">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
              {file.description && (
                <div className="file-description">{file.description}</div>
              )}
            </div>
            <div className="file-actions">
              <button
                onClick={() => handleDownload(file.id, file.original_filename)}
                className="download-btn"
                title="Download"
              >
                ⬇️
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="delete-btn"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;