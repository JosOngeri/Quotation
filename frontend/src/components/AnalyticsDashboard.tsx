import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AnalyticsSummary {
  total_quotes: number;
  total_projects: number;
  total_revenue_minor: number;
  average_quote_value_minor: number;
  conversion_rate: number;
  total_clients: number;
  active_clients: number;
}

interface ConversionRates {
  totalQuotes: number;
  convertedQuotes: number;
  conversionRate: number;
}

interface WinLossRatios {
  wonQuotes: number;
  lostQuotes: number;
  pendingQuotes: number;
  totalQuotes: number;
  winRate: number;
  lossRate: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [winLossRatios, setWinLossRatios] = useState<WinLossRatios | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedMonth]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (selectedMonth) {
        params.month = selectedMonth;
      }

      const [summaryResponse, conversionResponse, winLossResponse] = await Promise.all([
        axios.get('/api/v1/analytics/summary', { params }),
        axios.get('/api/v1/analytics/conversion-rates', { params }),
        axios.get('/api/v1/analytics/win-loss-ratios', { params })
      ]);

      setSummary(summaryResponse.data.data[0] || null);
      setConversionRates(conversionResponse.data.data);
      setWinLossRatios(winLossResponse.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (minorUnits: number): string => {
    return (minorUnits / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const handleRunETL = async () => {
    setLoading(true);
    try {
      await axios.post('/api/v1/analytics/run-etl');
      await fetchAnalyticsData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to run ETL pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>Analytics Dashboard</h2>
        <div className="dashboard-controls">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-selector"
          />
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="refresh-btn"
          >
            Refresh
          </button>
          <button
            onClick={handleRunETL}
            disabled={loading}
            className="etl-btn"
          >
            Run ETL
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading analytics data...</div>
      ) : (
        <>
          {summary && (
            <div className="analytics-summary">
              <h3>Summary Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Quotes</div>
                  <div className="metric-value">{summary.total_quotes}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Projects</div>
                  <div className="metric-value">{summary.total_projects}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Revenue</div>
                  <div className="metric-value">{formatCurrency(summary.total_revenue_minor)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Average Quote Value</div>
                  <div className="metric-value">{formatCurrency(summary.average_quote_value_minor)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Conversion Rate</div>
                  <div className="metric-value">{formatPercentage(summary.conversion_rate)}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active Clients</div>
                  <div className="metric-value">{summary.active_clients}</div>
                </div>
              </div>
            </div>
          )}

          {conversionRates && (
            <div className="conversion-rates">
              <h3>Conversion Rates</h3>
              <div className="conversion-metrics">
                <div className="conversion-item">
                  <div className="conversion-label">Total Quotes</div>
                  <div className="conversion-value">{conversionRates.totalQuotes}</div>
                </div>
                <div className="conversion-item">
                  <div className="conversion-label">Converted Quotes</div>
                  <div className="conversion-value">{conversionRates.convertedQuotes}</div>
                </div>
                <div className="conversion-item">
                  <div className="conversion-label">Conversion Rate</div>
                  <div className="conversion-value">{formatPercentage(conversionRates.conversionRate)}</div>
                </div>
              </div>
            </div>
          )}

          {winLossRatios && (
            <div className="win-loss-ratios">
              <h3>Win/Loss Ratios</h3>
              <div className="win-loss-metrics">
                <div className="win-loss-item won">
                  <div className="win-loss-label">Won Quotes</div>
                  <div className="win-loss-value">{winLossRatios.wonQuotes}</div>
                  <div className="win-loss-rate">{formatPercentage(winLossRatios.winRate)}</div>
                </div>
                <div className="win-loss-item lost">
                  <div className="win-loss-label">Lost Quotes</div>
                  <div className="win-loss-value">{winLossRatios.lostQuotes}</div>
                  <div className="win-loss-rate">{formatPercentage(winLossRatios.lossRate)}</div>
                </div>
                <div className="win-loss-item pending">
                  <div className="win-loss-label">Pending Quotes</div>
                  <div className="win-loss-value">{winLossRatios.pendingQuotes}</div>
                </div>
              </div>
            </div>
          )}

          {!summary && !conversionRates && !winLossRatios && (
            <div className="no-data">
              <p>No analytics data available. Run ETL pipeline to generate analytics.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;