import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

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
        api.get('/analytics/summary', { params }),
        api.get('/analytics/conversion-rates', { params }),
        api.get('/analytics/win-loss-ratios', { params })
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
      await api.post('/analytics/run-etl');
      await fetchAnalyticsData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to run ETL pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-dashboard" aria-busy={loading}>
      <div className="dashboard-header mb-4">
        <div className="dashboard-controls flex flex-col md:flex-row gap-2 items-start md:items-center">
          <label htmlFor="analytics-month" className="sr-only">Select month</label>
          <input
            id="analytics-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-selector input"
          />
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="refresh-btn btn btn-secondary"
            aria-busy={loading}
          >
            Refresh
          </button>
          <button
            onClick={handleRunETL}
            disabled={loading}
            className="etl-btn btn btn-primary"
            aria-busy={loading}
          >
            Run ETL
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message p-4 bg-red-50 text-red-800 rounded mb-4" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading analytics data...</div>
      ) : (
        <>
          {summary && (
            <div className="analytics-summary mb-6">
              <h3 className="font-semibold mb-3">Summary Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Total Quotes</div>
                  <div className="metric-value text-2xl font-bold">{summary.total_quotes}</div>
                </div>
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Total Projects</div>
                  <div className="metric-value text-2xl font-bold">{summary.total_projects}</div>
                </div>
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Total Revenue</div>
                  <div className="metric-value text-2xl font-bold">{formatCurrency(summary.total_revenue_minor)}</div>
                </div>
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Average Quote Value</div>
                  <div className="metric-value text-2xl font-bold">{formatCurrency(summary.average_quote_value_minor)}</div>
                </div>
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Conversion Rate</div>
                  <div className="metric-value text-2xl font-bold">{formatPercentage(summary.conversion_rate)}</div>
                </div>
                <div className="metric-card card p-4">
                  <div className="metric-label text-sm text-gray-600">Active Clients</div>
                  <div className="metric-value text-2xl font-bold">{summary.active_clients}</div>
                </div>
              </div>
            </div>
          )}

          {conversionRates && (
            <div className="conversion-rates mb-6">
              <h3 className="font-semibold mb-3">Conversion Rates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="conversion-item card p-4">
                  <div className="conversion-label text-sm text-gray-600">Total Quotes</div>
                  <div className="conversion-value text-2xl font-bold">{conversionRates.totalQuotes}</div>
                </div>
                <div className="conversion-item card p-4">
                  <div className="conversion-label text-sm text-gray-600">Converted Quotes</div>
                  <div className="conversion-value text-2xl font-bold">{conversionRates.convertedQuotes}</div>
                </div>
                <div className="conversion-item card p-4">
                  <div className="conversion-label text-sm text-gray-600">Conversion Rate</div>
                  <div className="conversion-value text-2xl font-bold">{formatPercentage(conversionRates.conversionRate)}</div>
                </div>
              </div>
            </div>
          )}

          {winLossRatios && (
            <div className="win-loss-ratios mb-6">
              <h3 className="font-semibold mb-3">Win/Loss Ratios</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="win-loss-item won card p-4">
                  <div className="win-loss-label text-sm text-gray-600">Won Quotes</div>
                  <div className="win-loss-value text-2xl font-bold">{winLossRatios.wonQuotes}</div>
                  <div className="win-loss-rate text-green-600">{formatPercentage(winLossRatios.winRate)}</div>
                </div>
                <div className="win-loss-item lost card p-4">
                  <div className="win-loss-label text-sm text-gray-600">Lost Quotes</div>
                  <div className="win-loss-value text-2xl font-bold">{winLossRatios.lostQuotes}</div>
                  <div className="win-loss-rate text-red-600">{formatPercentage(winLossRatios.lossRate)}</div>
                </div>
                <div className="win-loss-item pending card p-4">
                  <div className="win-loss-label text-sm text-gray-600">Pending Quotes</div>
                  <div className="win-loss-value text-2xl font-bold">{winLossRatios.pendingQuotes}</div>
                </div>
              </div>
            </div>
          )}

          {!summary && !conversionRates && !winLossRatios && (
            <div className="no-data text-center p-8 text-gray-600">
              <p>No analytics data available. Run ETL pipeline to generate analytics.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
