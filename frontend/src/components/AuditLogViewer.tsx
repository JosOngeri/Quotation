import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from './Pagination';

interface AuditLog {
  id: string;
  user_id?: string;
  workspace_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

interface AuditLogViewerProps {
  filters?: {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ filters }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page, pagination.pageSize]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: pagination.page,
        pageSize: pagination.pageSize
      };

      if (filters?.action) params.action = filters.action;
      if (filters?.entityType) params.entityType = filters.entityType;
      if (filters?.userId) params.userId = filters.userId;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;

      const response = await axios.get('/api/v1/audit-logs', { params });
      
      setLogs(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ ...pagination, page: 1, pageSize });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="audit-log-viewer">
      <div className="audit-log-header">
        <h2>Audit Logs</h2>
        <button
          onClick={() => window.open('/api/v1/audit-logs/export', '_blank')}
          className="export-btn"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : (
        <>
          <div className="audit-log-table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User ID</th>
                  <th>IP Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>{formatAction(log.action)}</td>
                    <td>
                      {log.entity_type && (
                        <span>
                          {log.entity_type}
                          {log.entity_id && ` (${log.entity_id.substring(0, 8)})`}
                        </span>
                      )}
                    </td>
                    <td>{log.user_id ? log.user_id.substring(0, 8) : 'N/A'}</td>
                    <td>{log.ip_address || 'N/A'}</td>
                    <td>{getStatusBadge(log.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {logs.length === 0 && (
            <div className="no-logs">No audit logs found</div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogViewer;