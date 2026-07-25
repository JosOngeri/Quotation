import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PerformanceSummary {
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  slowRequests: number;
}

interface SlowRequest {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

const PerformanceDashboard: React.FC = () => {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [slowRequests, setSlowRequests] = useState<SlowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, slowRequestsResponse] = await Promise.all([
        axios.get('/api/v1/performance/metrics'),
        axios.get('/api/v1/performance/metrics/slow?threshold=1000')
      ]);

      setSummary(summaryResponse.data.data);
      setSlowRequests(slowRequestsResponse.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getResponseTimeColor = (ms: number): string => {
    if (ms < 200) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    if (ms < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const getErrorRateColor = (rate: number): string => {
    if (rate < 1) return 'text-green-600';
    if (rate < 5) return 'text-yellow-600';
    if (rate < 10) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h2>Performance Dashboard</h2>
        <div className="dashboard-controls">
          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {summary && (
        <div className="performance-summary">
          <h3>Performance Summary</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Requests</div>
              <div className="metric-value">{summary.totalRequests.toLocaleString()}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Average Response Time</div>
              <div className={`metric-value ${getResponseTimeColor(summary.averageResponseTime)}`}>
                {formatResponseTime(summary.averageResponseTime)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">P95 Response Time</div>
              <div className={`metric-value ${getResponseTimeColor(summary.p95ResponseTime)}`}>
                {formatResponseTime(summary.p95ResponseTime)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">P99 Response Time</div>
              <div className={`metric-value ${getResponseTimeColor(summary.p99ResponseTime)}`}>
                {formatResponseTime(summary.p99ResponseTime)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Error Rate</div>
              <div className={`metric-value ${getErrorRateColor(summary.errorRate)}`}>
                {formatPercentage(summary.errorRate)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Slow Requests</div>
              <div className="metric-value">{summary.slowRequests.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {slowRequests.length > 0 && (
        <div className="slow-requests">
          <h3>Slow Requests ({'>'}1s)</h3>
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Method</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {slowRequests.slice(0, 20).map((request, index) => (
                  <tr key={index}>
                    <td>{new Date(request.timestamp).toLocaleString()}</td>
                    <td>{request.method}</td>
                    <td>{request.url}</td>
                    <td>{request.statusCode}</td>
                    <td className={getResponseTimeColor(request.responseTime)}>
                      {formatResponseTime(request.responseTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {slowRequests.length === 0 && summary && (
        <div className="no-issues">
          <p>No performance issues detected</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;