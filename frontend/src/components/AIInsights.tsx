import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Insight {
  type: string;
  title: string;
  description: string;
  priority: string;
}

interface AIInsightsData {
  insights: Insight[];
  generatedAt: string;
  confidence: number;
}

const AIInsights: React.FC = () => {
  const [insightsData, setInsightsData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/v1/ai/insights');
      setInsightsData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch AI insights');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityIcon = (type: string): string => {
    switch (type) {
      case 'alert':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'opportunity':
        return '💡';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="ai-insights">
      <div className="insights-header">
        <h2>AI-Powered Insights</h2>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Generating insights...</div>
      ) : (
        <>
          {insightsData && insightsData.insights.length > 0 ? (
            <div className="insights-list">
              {insightsData.insights.map((insight, index) => (
                <div key={index} className="insight-card">
                  <div className="insight-header">
                    <span className="insight-icon">{getPriorityIcon(insight.type)}</span>
                    <h3 className="insight-title">{insight.title}</h3>
                    <span 
                      className="insight-priority"
                      style={{ color: getPriorityColor(insight.priority) }}
                    >
                      {insight.priority}
                    </span>
                  </div>
                  <p className="insight-description">{insight.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-insights">
              <p>No insights available at this time.</p>
            </div>
          )}

          {insightsData && (
            <div className="insights-footer">
              <div className="confidence-meter">
                <span>Confidence: </span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${insightsData.confidence}%` }}
                  />
                </div>
                <span>{insightsData.confidence}%</span>
              </div>
              <div className="generated-at">
                Generated: {new Date(insightsData.generatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIInsights;