import { Pool } from 'pg';

interface ReportDataSource {
  type: 'table' | 'query' | 'api';
  name: string;
  config: any;
}

interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  format?: string;
}

interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: any;
}

interface ReportGrouping {
  field: string;
  sort: 'asc' | 'desc';
}

interface ReportVisualization {
  type: 'table' | 'chart' | 'graph';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  xAxis?: string;
  yAxis?: string;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  dataSource: ReportDataSource;
  fields: ReportField[];
  filters: ReportFilter[];
  grouping: ReportGrouping[];
  visualization: ReportVisualization;
  createdBy: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ReportBuilderService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Available data sources
  getAvailableDataSources(): ReportDataSource[] {
    return [
      {
        type: 'table',
        name: 'quotes',
        config: {
          table: 'quote',
          relationships: ['client', 'project']
        }
      },
      {
        type: 'table',
        name: 'projects',
        config: {
          table: 'project',
          relationships: ['client', 'quote']
        }
      },
      {
        type: 'table',
        name: 'clients',
        config: {
          table: 'client',
          relationships: []
        }
      },
      {
        type: 'table',
        name: 'analytics_summary',
        config: {
          table: 'analytics_summary',
          relationships: []
        }
      }
    ];
  }

  // Get available fields for a data source
  getAvailableFields(dataSource: string): ReportField[] {
    const fieldMap: Record<string, ReportField[]> = {
      quotes: [
        { id: 'id', name: 'Quote ID', type: 'string', source: 'quote.id' },
        { id: 'title', name: 'Title', type: 'string', source: 'quote.title' },
        { id: 'total_amount', name: 'Total Amount', type: 'number', source: 'quote.total_amount_minor', aggregation: 'sum' },
        { id: 'status', name: 'Status', type: 'string', source: 'quote.status' },
        { id: 'created_at', name: 'Created Date', type: 'date', source: 'quote.created_at' },
        { id: 'client_name', name: 'Client Name', type: 'string', source: 'client.name' },
        { id: 'conversion_days', name: 'Conversion Days', type: 'number', source: 'quote_analytics.conversion_days', aggregation: 'avg' }
      ],
      projects: [
        { id: 'id', name: 'Project ID', type: 'string', source: 'project.id' },
        { id: 'name', name: 'Project Name', type: 'string', source: 'project.name' },
        { id: 'estimated_cost', name: 'Estimated Cost', type: 'number', source: 'project.estimated_cost_minor', aggregation: 'sum' },
        { id: 'actual_cost', name: 'Actual Cost', type: 'number', source: 'project.actual_cost_minor', aggregation: 'sum' },
        { id: 'cost_variance', name: 'Cost Variance', type: 'number', source: 'project_analytics.cost_variance_minor', aggregation: 'avg' },
        { id: 'status', name: 'Status', type: 'string', source: 'project.status' },
        { id: 'start_date', name: 'Start Date', type: 'date', source: 'project.start_date' },
        { id: 'end_date', name: 'End Date', type: 'date', source: 'project.end_date' }
      ],
      clients: [
        { id: 'id', name: 'Client ID', type: 'string', source: 'client.id' },
        { id: 'name', name: 'Client Name', type: 'string', source: 'client.name' },
        { id: 'email', name: 'Email', type: 'string', source: 'client.email' },
        { id: 'total_quotes', name: 'Total Quotes', type: 'number', source: 'client_analytics.total_quotes', aggregation: 'sum' },
        { id: 'total_revenue', name: 'Total Revenue', type: 'number', source: 'client_analytics.total_revenue_minor', aggregation: 'sum' },
        { id: 'conversion_rate', name: 'Conversion Rate', type: 'number', source: 'client_analytics.conversion_rate', aggregation: 'avg' }
      ],
      analytics_summary: [
        { id: 'month', name: 'Month', type: 'string', source: 'analytics_summary.month' },
        { id: 'total_quotes', name: 'Total Quotes', type: 'number', source: 'analytics_summary.total_quotes' },
        { id: 'total_projects', name: 'Total Projects', type: 'number', source: 'analytics_summary.total_projects' },
        { id: 'total_revenue', name: 'Total Revenue', type: 'number', source: 'analytics_summary.total_revenue_minor' },
        { id: 'conversion_rate', name: 'Conversion Rate', type: 'number', source: 'analytics_summary.conversion_rate' }
      ]
    };

    return fieldMap[dataSource] || [];
  }

  // Save report definition
  async saveReportDefinition(report: Partial<ReportDefinition>, userId: string, workspaceId: string): Promise<string> {
    try {
      const reportId = report.id || this.generateId();
      
      await this.pool.query(
        `INSERT INTO report_definition 
         (id, name, description, data_source, fields, filters, grouping, visualization, created_by, workspace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) 
         DO UPDATE SET 
           name = $2,
           description = $3,
           data_source = $4,
           fields = $5,
           filters = $6,
           grouping = $7,
           visualization = $8,
           updated_at = CURRENT_TIMESTAMP`,
        [
          reportId,
          report.name,
          report.description,
          JSON.stringify(report.dataSource),
          JSON.stringify(report.fields),
          JSON.stringify(report.filters),
          JSON.stringify(report.grouping),
          JSON.stringify(report.visualization),
          userId,
          workspaceId
        ]
      );

      return reportId;
    } catch (error) {
      console.error('Error saving report definition:', error);
      throw new Error('Failed to save report definition');
    }
  }

  // Get report definition
  async getReportDefinition(reportId: string): Promise<ReportDefinition | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM report_definition WHERE id = $1',
        [reportId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        dataSource: JSON.parse(row.data_source),
        fields: JSON.parse(row.fields),
        filters: JSON.parse(row.filters),
        grouping: JSON.parse(row.grouping),
        visualization: JSON.parse(row.visualization),
        createdBy: row.created_by,
        workspaceId: row.workspace_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting report definition:', error);
      throw new Error('Failed to get report definition');
    }
  }

  // List report definitions
  async listReportDefinitions(workspaceId: string): Promise<ReportDefinition[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM report_definition WHERE workspace_id = $1 ORDER BY created_at DESC',
        [workspaceId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        dataSource: JSON.parse(row.data_source),
        fields: JSON.parse(row.fields),
        filters: JSON.parse(row.filters),
        grouping: JSON.parse(row.grouping),
        visualization: JSON.parse(row.visualization),
        createdBy: row.created_by,
        workspaceId: row.workspace_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error listing report definitions:', error);
      throw new Error('Failed to list report definitions');
    }
  }

  // Delete report definition
  async deleteReportDefinition(reportId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM report_definition WHERE id = $1', [reportId]);
    } catch (error) {
      console.error('Error deleting report definition:', error);
      throw new Error('Failed to delete report definition');
    }
  }

  // Execute report
  async executeReport(reportId: string, workspaceId: string): Promise<any> {
    try {
      const report = await this.getReportDefinition(reportId);
      
      if (!report) {
        throw new Error('Report not found');
      }

      const query = this.buildQuery(report, workspaceId);
      const result = await this.pool.query(query.query, query.params);

      return {
        data: result.rows,
        metadata: {
          reportId: report.id,
          reportName: report.name,
          executedAt: new Date().toISOString(),
          rowCount: result.rowCount
        }
      };
    } catch (error) {
      console.error('Error executing report:', error);
      throw new Error('Failed to execute report');
    }
  }

  // Build SQL query from report definition
  private buildQuery(report: ReportDefinition, workspaceId: string): { query: string; params: any[] } {
    const dataSource = report.dataSource;
    const fields = report.fields;
    const filters = report.filters;
    const grouping = report.grouping;

    let query = '';
    const params: any[] = [];
    let paramCount = 0;

    // Build SELECT clause
    const selectFields = fields.map(field => {
      if (field.aggregation) {
        return `${field.aggregation.toUpperCase()}(${field.source}) as ${field.id}`;
      }
      return `${field.source} as ${field.id}`;
    });

    query = `SELECT ${selectFields.join(', ')} FROM ${dataSource.config.table}`;

    // Add JOINs for relationships
    if (dataSource.config.relationships && dataSource.config.relationships.length > 0) {
      dataSource.config.relationships.forEach((rel: string) => {
        if (rel === 'client') {
          query += ' JOIN client c ON quote.client_id = c.id';
        } else if (rel === 'project') {
          query += ' LEFT JOIN project p ON quote.id = p.quote_id';
        }
      });
    }

    // Build WHERE clause
    let whereClause = 'WHERE workspace_id = $1';
    params.push(workspaceId);
    paramCount = 1;

    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        paramCount++;
        const operator = this.getSQLOperator(filter.operator);
        whereClause += ` AND ${filter.field} ${operator} $${paramCount}`;
        params.push(filter.value);
      });
    }

    query += ` ${whereClause}`;

    // Build GROUP BY clause
    if (grouping && grouping.length > 0) {
      const groupByFields = grouping.map(g => g.field);
      query += ` GROUP BY ${groupByFields.join(', ')}`;
    }

    // Build ORDER BY clause
    if (grouping && grouping.length > 0) {
      const orderByClause = grouping.map(g => `${g.field} ${g.sort.toUpperCase()}`).join(', ');
      query += ` ORDER BY ${orderByClause}`;
    }

    return { query, params };
  }

  // Get SQL operator
  private getSQLOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'eq': '=',
      'ne': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'like': 'LIKE',
      'in': 'IN',
      'between': 'BETWEEN'
    };

    return operatorMap[operator] || '=';
  }

  // Generate ID
  private generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export report data
  async exportReport(reportId: string, format: 'csv' | 'json' | 'pdf', workspaceId: string): Promise<any> {
    try {
      const reportData = await this.executeReport(reportId, workspaceId);

      if (format === 'csv') {
        return this.exportToCSV(reportData.data);
      } else if (format === 'json') {
        return this.exportToJSON(reportData.data);
      } else if (format === 'pdf') {
        return this.exportToPDF(reportData);
      }

      throw new Error('Unsupported export format');
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new Error('Failed to export report');
    }
  }

  // Export to CSV
  private exportToCSV(data: any[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = data.map(row => headers.map(header => row[header]).join(','));
    
    return [headers.join(','), ...csvRows].join('\n');
  }

  // Export to JSON
  private exportToJSON(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  // Export to PDF (simplified)
  private exportToPDF(reportData: any): any {
    // In a real implementation, this would use a PDF library
    return {
      data: reportData.data,
      format: 'pdf',
      message: 'PDF export requires additional PDF library integration'
    };
  }
}