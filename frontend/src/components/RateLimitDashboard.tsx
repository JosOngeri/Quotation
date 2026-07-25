import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface RateLimitStat {
  endpoint: string;
  method: string;
  totalRequests: number;
  blockedRequests: number;
  rateLimit: number;
  currentUsage: number;
  resetTime: string;
}

interface RateLimitHistory {
  timestamp: string;
  totalRequests: number;
  blockedRequests: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
  }>;
}

interface RateLimitException {
  id: string;
  endpoint: string;
  method: string;
  userId: string;
  reason: string;
  createdAt: string;
}

const RateLimitDashboard: React.FC = () => {
  const [stats, setStats] = useState<RateLimitStat[]>([]);
  const [history, setHistory] = useState<RateLimitHistory[]>([]);
  const [exceptions, setExceptions] = useState<RateLimitException[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState(24);

  useEffect(() => {
    fetchRateLimitData();
  }, [selectedHours]);

  const fetchRateLimitData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsResponse, historyResponse, exceptionsResponse] = await Promise.all([
        axios.get('/api/v1/rate-limit/stats'),
        axios.get(`/api/v1/rate-limit/history?hours=${selectedHours}`),
        axios.get('/api/v1/rate-limit/exceptions')
      ]);

      setStats(statsResponse.data.data);
      setHistory(historyResponse.data.data);
      setExceptions(exceptionsResponse.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch rate limit data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRateLimit = async (endpoint: string, method: string, newLimit: number) => {
    try {
      await axios.post('/api/v1/rate-limit/update', {
        endpoint,
        method,
        newLimit
      });
      await fetchRateLimitData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update rate limit');
    }
  };

  const handleAddException = async (endpoint: string, method: string, userId?: string) => {
    try {
      await axios.post('/api/v1/rate-limit/exceptions', {
        endpoint,
        method,
        userId,
        reason: 'Admin override'
      });
      await fetchRateLimitData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add exception');
    }
  };

  const handleRemoveException = async (id: string) => {
    try {
      await axios.delete(`/api/v1/rate-limit/exceptions/${id}`);
      await fetchRateLimitData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to remove exception');
    }
  };

  const getUsagePercentage = (current: number, limit: number): number => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return '#dc2626';
    if (percentage >= 70) return '#f59e0b';
    if (percentage >= 50) return '#eab308';
    return '#10b981';
  };

  return (
    <div className="rate-limit-dashboard">
      <div className="dashboard-header">
        <h2>Rate Limit Dashboard</h2>
        <div className="dashboard-controls">
          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(parseInt(e.target.value))}
            className="time-selector"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button
            onClick={fetchRateLimitData}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading rate limit data...</div>
      ) : (
        <>
          <div className="rate-limit-stats">
            <h3>Current Rate Limits</h3>
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Usage</th>
                    <th>Limit</th>
                    <th>Blocked</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => {
                    const usagePercentage = getUsagePercentage(stat.currentUsage, stat.rateLimit);
                    const usageColor = getUsageColor(usagePercentage);
                    
                    return (
                      <tr key={index}>
                        <td>{stat.endpoint}</td>
                        <td>{stat.method}</td>
                        <td>
                          <div className="usage-bar">
                            <div 
                              className="usage-fill"
                              style={{ 
                                width: `${Math.min(usagePercentage, 100)}%`,
                                backgroundColor: usageColor
                              }}
                            />
                          </div>
                          <span className="usage-text">{stat.currentUsage}/{stat.rateLimit}</span>
                        </td>
                        <td>{stat.rateLimit}</td>
                        <td>{stat.blockedRequests}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ color: usageColor }}
                          >
                            {usagePercentage >= 90 ? 'Critical' : usagePercentage >= 70 ? 'High' : usagePercentage >= 50 ? 'Medium' : 'Normal'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              const newLimit = prompt(`Enter new rate limit for ${stat.method} ${stat.endpoint}:`, stat.rateLimit.toString());
                              if (newLimit) {
                                handleUpdateRateLimit(stat.endpoint, stat.method, parseInt(newLimit));
                              }
                            }}
                            className="edit-btn"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rate-limit-history">
            <h3>Rate Limit History</h3>
            <div className="history-chart">
              {history.map((entry, index) => (
                <div key={index} className="history-entry">
                  <div className="history-time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="history-metrics">
                    <div className="history-metric">
                      <span className="metric-label">Total Requests:</span>
                      <span className="metric-value">{entry.totalRequests}</span>
                    </div>
                    <div className="history-metric">
                      <span className="metric-label">Blocked:</span>
                      <span className="metric-value">{entry.blockedRequests}</span>
                    </div>
                  </div>
                  <div className="history-endpoints">
                    {entry.topEndpoints.map((ep, epIndex) => (
                      <div key={epIndex} className="top-endpoint">
                        <span className="endpoint-path">{ep.endpoint}</span>
                        <span className="endpoint-requests">{ep.requests} requests</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rate-limit-exceptions">
            <h3>Rate Limit Exceptions</h3>
            <div className="exceptions-list">
              {exceptions.length > 0 ? (
                exceptions.map((exception) => (
                  <div key={exception.id} className="exception-card">
                    <div className="exception-info">
                      <div className="exception-endpoint">
                        <span className="exception-method">{exception.method}</span>
                        <span className="exception-path">{exception.endpoint}</span>
                      </div>
                      <div className="exception-reason">{exception.reason}</div>
                      <div className="exception-user">User: {exception.userId}</div>
                      <div className="exception-date">
                        Created: {new Date(exception.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveException(exception.id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-exceptions">
                  <p>No rate limit exceptions configured</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RateLimitDashboard;