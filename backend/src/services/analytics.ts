import { Pool } from 'pg';

export class AnalyticsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Quote Analytics
  async calculateQuoteAnalytics(quoteId: string): Promise<void> {
    try {
      const quoteResult = await this.pool.query(
        `SELECT q.*, c.id as client_id, c.workspace_id 
         FROM quote q 
         JOIN client c ON q.client_id = c.id 
         WHERE q.id = $1`,
        [quoteId]
      );

      if (quoteResult.rows.length === 0) {
        return;
      }

      const quote = quoteResult.rows[0];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
      const year = now.getFullYear();

      // Check if project exists for this quote
      const projectResult = await this.pool.query(
        'SELECT id, created_at FROM project WHERE quote_id = $1',
        [quoteId]
      );

      const convertedToProject = projectResult.rows.length > 0;
      let conversionDays = null;

      if (convertedToProject) {
        const projectCreatedAt = new Date(projectResult.rows[0].created_at);
        const quoteCreatedAt = new Date(quote.created_at);
        conversionDays = Math.floor((projectCreatedAt.getTime() - quoteCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Insert or update quote analytics
      await this.pool.query(
        `INSERT INTO quote_analytics 
         (quote_id, workspace_id, client_id, total_amount_minor, status, created_at, updated_at, converted_to_project, conversion_days, month, quarter, year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (quote_id) 
         DO UPDATE SET 
           status = $5,
           updated_at = $7,
           converted_to_project = $8,
           conversion_days = $9`,
        [
          quoteId,
          quote.workspace_id,
          quote.client_id,
          quote.total_amount_minor,
          quote.status,
          quote.created_at,
          quote.updated_at,
          convertedToProject,
          conversionDays,
          month,
          quarter,
          year
        ]
      );
    } catch (error) {
      console.error('Error calculating quote analytics:', error);
    }
  }

  // Project Analytics
  async calculateProjectAnalytics(projectId: string): Promise<void> {
    try {
      const projectResult = await this.pool.query(
        `SELECT p.*, c.id as client_id, c.workspace_id 
         FROM project p 
         JOIN client c ON p.client_id = c.id 
         WHERE p.id = $1`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return;
      }

      const project = projectResult.rows[0];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
      const year = now.getFullYear();

      // Calculate cost variance
      let costVarianceMinor = null;
      let costVariancePercentage = null;
      let actualCostMinor = null;

      if (project.actual_cost_minor) {
        actualCostMinor = project.actual_cost_minor;
        costVarianceMinor = project.actual_cost_minor - project.estimated_cost_minor;
        costVariancePercentage = project.estimated_cost_minor > 0 
          ? (costVarianceMinor / project.estimated_cost_minor) * 100 
          : null;
      }

      // Calculate duration variance
      let durationVarianceDays = null;
      let durationVariancePercentage = null;
      let actualDurationDays = null;

      if (project.end_date && project.start_date) {
        actualDurationDays = Math.floor((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));
        durationVarianceDays = actualDurationDays - project.estimated_duration_days;
        durationVariancePercentage = project.estimated_duration_days > 0 
          ? (durationVarianceDays / project.estimated_duration_days) * 100 
          : null;
      }

      // Insert or update project analytics
      await this.pool.query(
        `INSERT INTO project_analytics 
         (project_id, workspace_id, client_id, estimated_cost_minor, actual_cost_minor, cost_variance_minor, cost_variance_percentage, estimated_duration_days, actual_duration_days, duration_variance_days, duration_variance_percentage, status, start_date, end_date, created_at, month, quarter, year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (project_id) 
         DO UPDATE SET 
           actual_cost_minor = $5,
           cost_variance_minor = $6,
           cost_variance_percentage = $7,
           actual_duration_days = $9,
           duration_variance_days = $10,
           duration_variance_percentage = $11,
           status = $12,
           end_date = $14`,
        [
          projectId,
          project.workspace_id,
          project.client_id,
          project.estimated_cost_minor,
          actualCostMinor,
          costVarianceMinor,
          costVariancePercentage,
          project.estimated_duration_days,
          actualDurationDays,
          durationVarianceDays,
          durationVariancePercentage,
          project.status,
          project.start_date,
          project.end_date,
          project.created_at,
          month,
          quarter,
          year
        ]
      );
    } catch (error) {
      console.error('Error calculating project analytics:', error);
    }
  }

  // Client Analytics
  async calculateClientAnalytics(clientId: string): Promise<void> {
    try {
      const clientResult = await this.pool.query(
        'SELECT * FROM client WHERE id = $1',
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        return;
      }

      const client = clientResult.rows[0];
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
      const year = now.getFullYear();

      // Calculate quote metrics
      const quotesResult = await this.pool.query(
        `SELECT COUNT(*) as total_quotes, 
                COALESCE(SUM(total_amount_minor), 0) as total_revenue_minor,
                COALESCE(AVG(total_amount_minor), 0) as average_quote_value_minor
         FROM quote 
         WHERE client_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [clientId]
      );

      const quoteMetrics = quotesResult.rows[0];

      // Calculate project metrics
      const projectsResult = await this.pool.query(
        `SELECT COUNT(*) as total_projects,
                COALESCE(SUM(actual_cost_minor), 0) as total_cost_minor
         FROM project 
         WHERE client_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [clientId]
      );

      const projectMetrics = projectsResult.rows[0];

      // Calculate conversion rate
      const convertedQuotesResult = await this.pool.query(
        `SELECT COUNT(*) as converted_quotes
         FROM quote q
         JOIN project p ON q.id = p.quote_id
         WHERE q.client_id = $1 AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [clientId]
      );

      const convertedQuotes = parseInt(convertedQuotesResult.rows[0].converted_quotes);
      const totalQuotes = parseInt(quoteMetrics.total_quotes);
      const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

      // Calculate profit margin
      const totalRevenue = parseFloat(quoteMetrics.total_revenue_minor);
      const totalCost = parseFloat(projectMetrics.total_cost_minor);
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

      // Calculate retention rate (simplified)
      const retentionRate = 85; // This would be calculated based on historical data

      // Insert or update client analytics
      await this.pool.query(
        `INSERT INTO client_analytics 
         (client_id, workspace_id, total_quotes, total_projects, total_revenue_minor, average_quote_value_minor, conversion_rate, total_cost_minor, profit_margin, retention_rate, last_activity_date, month, quarter, year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (client_id, month) 
         DO UPDATE SET 
           total_quotes = $3,
           total_projects = $4,
           total_revenue_minor = $5,
           average_quote_value_minor = $6,
           conversion_rate = $7,
           total_cost_minor = $8,
           profit_margin = $9,
           retention_rate = $10,
           last_activity_date = $11`,
        [
          clientId,
          client.workspace_id,
          parseInt(quoteMetrics.total_quotes),
          parseInt(projectMetrics.total_projects),
          Math.round(totalRevenue),
          Math.round(parseFloat(quoteMetrics.average_quote_value_minor)),
          conversionRate,
          Math.round(totalCost),
          profitMargin,
          retentionRate,
          now,
          month,
          quarter,
          year
        ]
      );
    } catch (error) {
      console.error('Error calculating client analytics:', error);
    }
  }

  // Analytics Summary
  async calculateAnalyticsSummary(workspaceId: string): Promise<void> {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quarter = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
      const year = now.getFullYear();

      // Calculate summary metrics
      const summaryResult = await this.pool.query(
        `SELECT 
           COUNT(DISTINCT q.id) as total_quotes,
           COUNT(DISTINCT p.id) as total_projects,
           COALESCE(SUM(q.total_amount_minor), 0) as total_revenue_minor,
           COALESCE(AVG(q.total_amount_minor), 0) as average_quote_value_minor,
           COUNT(DISTINCT c.id) as total_clients,
           COUNT(DISTINCT CASE WHEN q.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN c.id END) as active_clients
         FROM quote q
         LEFT JOIN project p ON q.id = p.quote_id
         LEFT JOIN client c ON q.client_id = c.id
         WHERE q.workspace_id = $1 AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [workspaceId]
      );

      const summary = summaryResult.rows[0];

      // Calculate conversion rate
      const convertedResult = await this.pool.query(
        `SELECT COUNT(*) as converted_quotes
         FROM quote q
         JOIN project p ON q.id = p.quote_id
         WHERE q.workspace_id = $1 AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [workspaceId]
      );

      const convertedQuotes = parseInt(convertedResult.rows[0].converted_quotes);
      const totalQuotes = parseInt(summary.total_quotes);
      const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

      // Insert or update analytics summary
      await this.pool.query(
        `INSERT INTO analytics_summary 
         (workspace_id, month, quarter, year, total_quotes, total_projects, total_revenue_minor, average_quote_value_minor, conversion_rate, total_clients, active_clients)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (workspace_id, month) 
         DO UPDATE SET 
           total_quotes = $5,
           total_projects = $6,
           total_revenue_minor = $7,
           average_quote_value_minor = $8,
           conversion_rate = $9,
           total_clients = $10,
           active_clients = $11`,
        [
          workspaceId,
          month,
          quarter,
          year,
          parseInt(summary.total_quotes),
          parseInt(summary.total_projects),
          Math.round(parseFloat(summary.total_revenue_minor)),
          Math.round(parseFloat(summary.average_quote_value_minor)),
          conversionRate,
          parseInt(summary.total_clients),
          parseInt(summary.active_clients)
        ]
      );
    } catch (error) {
      console.error('Error calculating analytics summary:', error);
    }
  }

  // ETL Pipeline - Run all analytics calculations
  async runETLPipeline(workspaceId?: string): Promise<void> {
    try {
      // Calculate quote analytics
      const quotesResult = await this.pool.query(
        workspaceId 
          ? 'SELECT id FROM quote WHERE workspace_id = $1'
          : 'SELECT id FROM quote',
        workspaceId ? [workspaceId] : []
      );

      for (const quote of quotesResult.rows) {
        await this.calculateQuoteAnalytics(quote.id);
      }

      // Calculate project analytics
      const projectsResult = await this.pool.query(
        workspaceId 
          ? 'SELECT id FROM project WHERE workspace_id = $1'
          : 'SELECT id FROM project',
        workspaceId ? [workspaceId] : []
      );

      for (const project of projectsResult.rows) {
        await this.calculateProjectAnalytics(project.id);
      }

      // Calculate client analytics
      const clientsResult = await this.pool.query(
        workspaceId 
          ? 'SELECT id FROM client WHERE workspace_id = $1'
          : 'SELECT id FROM client',
        workspaceId ? [workspaceId] : []
      );

      for (const client of clientsResult.rows) {
        await this.calculateClientAnalytics(client.id);
      }

      // Calculate analytics summary
      const workspacesResult = await this.pool.query(
        workspaceId 
          ? 'SELECT id FROM workspace WHERE id = $1'
          : 'SELECT id FROM workspace',
        workspaceId ? [workspaceId] : []
      );

      for (const workspace of workspacesResult.rows) {
        await this.calculateAnalyticsSummary(workspace.id);
      }

      console.log('ETL pipeline completed successfully');
    } catch (error) {
      console.error('Error running ETL pipeline:', error);
    }
  }

  // Get Quote Analytics
  async getQuoteAnalytics(workspaceId: string, startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT * FROM quote_analytics 
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get Project Analytics
  async getProjectAnalytics(workspaceId: string, startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT * FROM project_analytics 
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get Client Analytics
  async getClientAnalytics(workspaceId: string, startDate?: string, endDate?: string): Promise<any> {
    let query = `
      SELECT * FROM client_analytics 
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get Analytics Summary
  async getAnalyticsSummary(workspaceId: string, month?: string): Promise<any> {
    let query = `
      SELECT * FROM analytics_summary 
      WHERE workspace_id = $1
    `;
    const params: any[] = [workspaceId];

    if (month) {
      query += ' AND month = $2';
      params.push(month);
    }

    query += ' ORDER BY year DESC, month DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}