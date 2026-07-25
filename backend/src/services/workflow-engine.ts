import { Pool } from 'pg';

interface WorkflowTrigger {
  type: 'time' | 'event' | 'manual';
  config: any;
}

interface WorkflowAction {
  type: 'email' | 'notification' | 'update' | 'create' | 'api_call';
  config: any;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdBy: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  triggeredBy: string;
  triggerData: any;
  result: any;
  error: string;
  startedAt: Date;
  completedAt: Date;
}

export class WorkflowEngineService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create workflow definition
  async createWorkflow(workflow: Partial<WorkflowDefinition>, userId: string, workspaceId: string): Promise<string> {
    try {
      const workflowId = workflow.id || this.generateId();
      
      await this.pool.query(
        `INSERT INTO workflow_definition 
         (id, name, description, trigger, conditions, actions, enabled, created_by, workspace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          workflowId,
          workflow.name,
          workflow.description,
          JSON.stringify(workflow.trigger),
          JSON.stringify(workflow.conditions),
          JSON.stringify(workflow.actions),
          workflow.enabled !== false,
          userId,
          workspaceId
        ]
      );

      return workflowId;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw new Error('Failed to create workflow');
    }
  }

  // Get workflow definition
  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM workflow_definition WHERE id = $1',
        [workflowId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        trigger: JSON.parse(row.trigger),
        conditions: JSON.parse(row.conditions),
        actions: JSON.parse(row.actions),
        enabled: row.enabled,
        createdBy: row.created_by,
        workspaceId: row.workspace_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting workflow:', error);
      throw new Error('Failed to get workflow');
    }
  }

  // List workflows
  async listWorkflows(workspaceId: string): Promise<WorkflowDefinition[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM workflow_definition WHERE workspace_id = $1 ORDER BY created_at DESC',
        [workspaceId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        trigger: JSON.parse(row.trigger),
        conditions: JSON.parse(row.conditions),
        actions: JSON.parse(row.actions),
        enabled: row.enabled,
        createdBy: row.created_by,
        workspaceId: row.workspace_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error listing workflows:', error);
      throw new Error('Failed to list workflows');
    }
  }

  // Update workflow
  async updateWorkflow(workflowId: string, workflow: Partial<WorkflowDefinition>): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE workflow_definition 
         SET name = $2, description = $3, trigger = $4, conditions = $5, actions = $6, enabled = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          workflowId,
          workflow.name,
          workflow.description,
          JSON.stringify(workflow.trigger),
          JSON.stringify(workflow.conditions),
          JSON.stringify(workflow.actions),
          workflow.enabled !== false
        ]
      );
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw new Error('Failed to update workflow');
    }
  }

  // Delete workflow
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM workflow_definition WHERE id = $1', [workflowId]);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw new Error('Failed to delete workflow');
    }
  }

  // Execute workflow
  async executeWorkflow(workflowId: string, triggerData: any, triggeredBy: string): Promise<string> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (!workflow.enabled) {
        throw new Error('Workflow is disabled');
      }

      // Create execution record
      const executionId = this.generateId();
      await this.pool.query(
        `INSERT INTO workflow_execution 
         (id, workflow_id, status, triggered_by, trigger_data, started_at)
         VALUES ($1, $2, 'running', $3, $4, CURRENT_TIMESTAMP)`,
        [executionId, workflowId, triggeredBy, JSON.stringify(triggerData)]
      );

      try {
        // Check conditions
        if (workflow.conditions && workflow.conditions.length > 0) {
          const conditionsMet = await this.checkConditions(workflow.conditions, triggerData);
          if (!conditionsMet) {
            await this.updateExecution(executionId, 'completed', { message: 'Conditions not met' });
            return executionId;
          }
        }

        // Execute actions
        const actionResults = [];
        for (const action of workflow.actions) {
          const result = await this.executeAction(action, triggerData);
          actionResults.push(result);
        }

        await this.updateExecution(executionId, 'completed', { actionResults });
        return executionId;
      } catch (error) {
        await this.updateExecution(executionId, 'failed', null, (error as Error).message);
        throw error;
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw new Error('Failed to execute workflow');
    }
  }

  // Check workflow conditions
  private async checkConditions(conditions: WorkflowCondition[], data: any): Promise<boolean> {
    try {
      for (const condition of conditions) {
        const fieldValue = this.getFieldValue(data, condition.field);
        const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
        
        if (!conditionMet) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking conditions:', error);
      return false;
    }
  }

  // Get field value from nested object
  private getFieldValue(data: any, field: string): any {
    const keys = field.split('.');
    let value = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  // Evaluate condition
  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === conditionValue;
      case 'ne':
        return fieldValue !== conditionValue;
      case 'gt':
        return fieldValue > conditionValue;
      case 'gte':
        return fieldValue >= conditionValue;
      case 'lt':
        return fieldValue < conditionValue;
      case 'lte':
        return fieldValue <= conditionValue;
      case 'like':
        return typeof fieldValue === 'string' && fieldValue.includes(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  // Execute workflow action
  private async executeAction(action: WorkflowAction, data: any): Promise<any> {
    try {
      switch (action.type) {
        case 'email':
          return await this.executeEmailAction(action.config, data);
        case 'notification':
          return await this.executeNotificationAction(action.config, data);
        case 'update':
          return await this.executeUpdateAction(action.config, data);
        case 'create':
          return await this.executeCreateAction(action.config, data);
        case 'api_call':
          return await this.executeApiCallAction(action.config, data);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      throw error;
    }
  }

  // Execute email action
  private async executeEmailAction(config: any, data: any): Promise<any> {
    // In a real implementation, this would send an email
    console.log('Sending email:', config, data);
    return { type: 'email', status: 'sent', config };
  }

  // Execute notification action
  private async executeNotificationAction(config: any, data: any): Promise<any> {
    // In a real implementation, this would send a notification
    console.log('Sending notification:', config, data);
    return { type: 'notification', status: 'sent', config };
  }

  // Execute update action
  private async executeUpdateAction(config: any, data: any): Promise<any> {
    try {
      const { table, updates, where } = config;
      
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updates);
      
      let query = `UPDATE ${table} SET ${setClause}`;
      const params = [...values];
      
      if (where) {
        const whereClause = Object.keys(where).map((key, index) => `${key} = $${values.length + index + 1}`).join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(where));
      }
      
      await this.pool.query(query, params);
      
      return { type: 'update', status: 'completed', table };
    } catch (error) {
      console.error('Error executing update action:', error);
      throw error;
    }
  }

  // Execute create action
  private async executeCreateAction(config: any, data: any): Promise<any> {
    try {
      const { table, record } = config;
      
      const columns = Object.keys(record).join(', ');
      const placeholders = Object.keys(record).map((_, index) => `$${index + 1}`).join(', ');
      const values = Object.values(record);
      
      const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
      const result = await this.pool.query(query, values);
      
      return { type: 'create', status: 'completed', table, record: result.rows[0] };
    } catch (error) {
      console.error('Error executing create action:', error);
      throw error;
    }
  }

  // Execute API call action
  private async executeApiCallAction(config: any, data: any): Promise<any> {
    // In a real implementation, this would make an HTTP request
    console.log('Making API call:', config, data);
    return { type: 'api_call', status: 'completed', config };
  }

  // Update execution record
  private async updateExecution(executionId: string, status: string, result: any, error?: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE workflow_execution 
         SET status = $2, result = $3, error = $4, completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [executionId, status, JSON.stringify(result), error]
      );
    } catch (error) {
      console.error('Error updating execution:', error);
    }
  }

  // Get workflow executions
  async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM workflow_execution WHERE workflow_id = $1 ORDER BY started_at DESC',
        [workflowId]
      );

      return result.rows.map(row => ({
        id: row.id,
        workflowId: row.workflow_id,
        status: row.status,
        triggeredBy: row.triggered_by,
        triggerData: JSON.parse(row.trigger_data),
        result: row.result ? JSON.parse(row.result) : null,
        error: row.error,
        startedAt: row.started_at,
        completedAt: row.completed_at
      }));
    } catch (error) {
      console.error('Error getting workflow executions:', error);
      throw new Error('Failed to get workflow executions');
    }
  }

  // Get workflow templates
  getWorkflowTemplates(): WorkflowDefinition[] {
    return [
      {
        id: 'template_quote_approval',
        name: 'Quote Approval Workflow',
        description: 'Automatically notify managers when quotes exceed a certain amount',
        trigger: {
          type: 'event',
          config: {
            event: 'quote.created',
            field: 'total_amount',
            operator: 'gt',
            value: 100000
          }
        },
        conditions: [
          {
            field: 'total_amount',
            operator: 'gt',
            value: 100000
          }
        ],
        actions: [
          {
            type: 'notification',
            config: {
              recipients: ['managers'],
              message: 'Quote requires approval: ${quote.title} - $${quote.total_amount}'
            }
          },
          {
            type: 'email',
            config: {
              to: '${client.email}',
              subject: 'Quote Review Required',
              body: 'Your quote requires manager approval.'
            }
          }
        ],
        enabled: true,
        createdBy: 'system',
        workspaceId: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'template_project_overdue',
        name: 'Project Overdue Notification',
        description: 'Notify stakeholders when projects are overdue',
        trigger: {
          type: 'time',
          config: {
            schedule: 'daily',
            condition: 'project.end_date < current_date AND project.status != completed'
          }
        },
        conditions: [],
        actions: [
          {
            type: 'notification',
            config: {
              recipients: ['project_manager', 'client'],
              message: 'Project ${project.name} is overdue'
            }
          },
          {
            type: 'update',
            config: {
              table: 'project',
              updates: { status: 'overdue' },
              where: { id: '${project.id}' }
            }
          }
        ],
        enabled: true,
        createdBy: 'system',
        workspaceId: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Generate ID
  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}