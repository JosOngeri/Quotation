import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DataSource {
  type: string;
  name: string;
  config: any;
}

interface Field {
  id: string;
  name: string;
  type: string;
  source: string;
  aggregation?: string;
}

interface Filter {
  field: string;
  operator: string;
  value: any;
}

interface Grouping {
  field: string;
  sort: string;
}

interface Visualization {
  type: string;
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
}

interface ReportDefinition {
  id?: string;
  name: string;
  description: string;
  dataSource: DataSource;
  fields: Field[];
  filters: Filter[];
  grouping: Grouping[];
  visualization: Visualization;
}

const ReportBuilder: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [currentReport, setCurrentReport] = useState<Partial<ReportDefinition>>({
    name: '',
    description: '',
    dataSource: null as any,
    fields: [],
    filters: [],
    grouping: [],
    visualization: { type: 'table' }
  });
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [reportResults, setReportResults] = useState<any>(null);

  useEffect(() => {
    fetchDataSources();
    fetchReports();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await axios.get('/api/v1/reports/data-sources');
      setDataSources(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch data sources');
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get('/api/v1/reports');
      setReports(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch reports');
    }
  };

  const handleDataSourceChange = async (dataSourceName: string) => {
    setSelectedDataSource(dataSourceName);
    try {
      const response = await axios.get(`/api/v1/reports/fields?dataSource=${dataSourceName}`);
      setAvailableFields(response.data.data);
      
      const selectedSource = dataSources.find(ds => ds.name === dataSourceName);
      setCurrentReport({
        ...currentReport,
        dataSource: selectedSource
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch fields');
    }
  };

  const handleFieldToggle = (field: Field) => {
    const currentFields = currentReport.fields || [];
    const exists = currentFields.find(f => f.id === field.id);
    
    if (exists) {
      setCurrentReport({
        ...currentReport,
        fields: currentFields.filter(f => f.id !== field.id)
      });
    } else {
      setCurrentReport({
        ...currentReport,
        fields: [...currentFields, field]
      });
    }
  };

  const handleAddFilter = () => {
    const currentFilters = currentReport.filters || [];
    setCurrentReport({
      ...currentReport,
      filters: [...currentFilters, { field: '', operator: 'eq', value: '' }]
    });
  };

  const handleFilterChange = (index: number, field: string, value: any) => {
    const currentFilters = currentReport.filters || [];
    const updatedFilters = [...currentFilters];
    updatedFilters[index] = { ...updatedFilters[index], [field]: value };
    setCurrentReport({
      ...currentReport,
      filters: updatedFilters
    });
  };

  const handleRemoveFilter = (index: number) => {
    const currentFilters = currentReport.filters || [];
    setCurrentReport({
      ...currentReport,
      filters: currentFilters.filter((_, i) => i !== index)
    });
  };

  const handleAddGrouping = () => {
    const currentGrouping = currentReport.grouping || [];
    setCurrentReport({
      ...currentReport,
      grouping: [...currentGrouping, { field: '', sort: 'asc' }]
    });
  };

  const handleGroupingChange = (index: number, field: string, value: any) => {
    const currentGrouping = currentReport.grouping || [];
    const updatedGrouping = [...currentGrouping];
    updatedGrouping[index] = { ...updatedGrouping[index], [field]: value };
    setCurrentReport({
      ...currentReport,
      grouping: updatedGrouping
    });
  };

  const handleRemoveGrouping = (index: number) => {
    const currentGrouping = currentReport.grouping || [];
    setCurrentReport({
      ...currentReport,
      grouping: currentGrouping.filter((_, i) => i !== index)
    });
  };

  const handleSaveReport = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.post('/api/v1/reports', currentReport);
      await fetchReports();
      setMode('list');
      setCurrentReport({
        name: '',
        description: '',
        dataSource: null as any,
        fields: [],
        filters: [],
        grouping: [],
        visualization: { type: 'table' }
      });
      setSelectedDataSource('');
      setAvailableFields([]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReport = async (reportId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`/api/v1/reports/${reportId}/execute`);
      setReportResults(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to execute report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (reportId: string, format: string) => {
    try {
      const response = await axios.get(`/api/v1/reports/${reportId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to export report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/reports/${reportId}`);
      await fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete report');
    }
  };

  const handleEditReport = (report: ReportDefinition) => {
    setCurrentReport(report);
    setSelectedDataSource(report.dataSource.name);
    setMode('edit');
  };

  if (mode === 'list') {
    return (
      <div className="report-builder">
        <div className="report-header">
          <h2>Report Builder</h2>
          <button
            onClick={() => setMode('create')}
            className="create-btn"
          >
            Create New Report
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="reports-list">
          {reports.length > 0 ? (
            reports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-info">
                  <h3>{report.name}</h3>
                  <p>{report.description}</p>
                  <div className="report-meta">
                    <span>Data Source: {report.dataSource.name}</span>
                    <span>Fields: {report.fields.length}</span>
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    onClick={() => handleExecuteReport(report.id!)}
                    className="execute-btn"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => handleExportReport(report.id!, 'csv')}
                    className="export-btn"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleEditReport(report)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id!)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-reports">
              <p>No reports found. Create your first report to get started.</p>
            </div>
          )}
        </div>

        {reportResults && (
          <div className="report-results">
            <h3>Report Results</h3>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    {Object.keys(reportResults.data[0] || {}).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportResults.data.map((row: any, index: number) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td key={cellIndex}>{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="report-builder">
      <div className="report-header">
        <h2>{mode === 'create' ? 'Create New Report' : 'Edit Report'}</h2>
        <button
          onClick={() => setMode('list')}
          className="cancel-btn"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="report-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Report Name</label>
            <input
              type="text"
              value={currentReport.name}
              onChange={(e) => setCurrentReport({ ...currentReport, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={currentReport.description}
              onChange={(e) => setCurrentReport({ ...currentReport, description: e.target.value })}
              className="form-textarea"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Data Source</h3>
          <div className="form-group">
            <label>Select Data Source</label>
            <select
              value={selectedDataSource}
              onChange={(e) => handleDataSourceChange(e.target.value)}
              className="form-select"
            >
              <option value="">Select a data source</option>
              {dataSources.map((ds) => (
                <option key={ds.name} value={ds.name}>{ds.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedDataSource && (
          <>
            <div className="form-section">
              <h3>Fields</h3>
              <div className="fields-grid">
                {availableFields.map((field) => (
                  <div key={field.id} className="field-item">
                    <input
                      type="checkbox"
                      checked={currentReport.fields?.some(f => f.id === field.id)}
                      onChange={() => handleFieldToggle(field)}
                    />
                    <label>{field.name}</label>
                    {field.aggregation && (
                      <select
                        value={currentReport.fields?.find(f => f.id === field.id)?.aggregation || ''}
                        onChange={(e) => {
                          const updatedFields = currentReport.fields?.map(f => 
                            f.id === field.id ? { ...f, aggregation: e.target.value } : f
                          ) || [];
                          setCurrentReport({ ...currentReport, fields: updatedFields });
                        }}
                        className="aggregation-select"
                      >
                        <option value="">No aggregation</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="count">Count</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>Filters</h3>
              {(currentReport.filters || []).map((filter, index) => (
                <div key={index} className="filter-row">
                  <select
                    value={filter.field}
                    onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select field</option>
                    {availableFields.map((field) => (
                      <option key={field.id} value={field.source}>{field.name}</option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                    className="form-select"
                  >
                    <option value="eq">Equals</option>
                    <option value="ne">Not Equals</option>
                    <option value="gt">Greater Than</option>
                    <option value="gte">Greater Than or Equal</option>
                    <option value="lt">Less Than</option>
                    <option value="lte">Less Than or Equal</option>
                    <option value="like">Like</option>
                    <option value="in">In</option>
                    <option value="between">Between</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    className="form-input"
                  />
                  <button
                    onClick={() => handleRemoveFilter(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddFilter}
                className="add-btn"
              >
                Add Filter
              </button>
            </div>

            <div className="form-section">
              <h3>Grouping</h3>
              {(currentReport.grouping || []).map((group, index) => (
                <div key={index} className="grouping-row">
                  <select
                    value={group.field}
                    onChange={(e) => handleGroupingChange(index, 'field', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select field</option>
                    {availableFields.map((field) => (
                      <option key={field.id} value={field.source}>{field.name}</option>
                    ))}
                  </select>
                  <select
                    value={group.sort}
                    onChange={(e) => handleGroupingChange(index, 'sort', e.target.value)}
                    className="form-select"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                  <button
                    onClick={() => handleRemoveGrouping(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddGrouping}
                className="add-btn"
              >
                Add Grouping
              </button>
            </div>

            <div className="form-section">
              <h3>Visualization</h3>
              <div className="form-group">
                <label>Visualization Type</label>
                <select
                  value={currentReport.visualization?.type}
                  onChange={(e) => setCurrentReport({
                    ...currentReport,
                    visualization: { ...currentReport.visualization, type: e.target.value }
                  })}
                  className="form-select"
                >
                  <option value="table">Table</option>
                  <option value="chart">Chart</option>
                  <option value="graph">Graph</option>
                </select>
              </div>
              {currentReport.visualization?.type === 'chart' && (
                <div className="form-group">
                  <label>Chart Type</label>
                  <select
                    value={currentReport.visualization?.chartType}
                    onChange={(e) => setCurrentReport({
                      ...currentReport,
                      visualization: { ...currentReport.visualization, chartType: e.target.value }
                    })}
                    className="form-select"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                onClick={handleSaveReport}
                disabled={loading}
                className="save-btn"
              >
                {loading ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportBuilder;