import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  id?: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
}

const WorkflowBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [templates, setTemplates] = useState<WorkflowDefinition[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Partial<WorkflowDefinition>>({
    name: '',
    description: '',
    trigger: { type: 'manual', config: {} },
    conditions: [],
    actions: [],
    enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await axios.get('/api/v1/workflows');
      setWorkflows(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch workflows');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/v1/workflows/templates/list');
      setTemplates(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch templates');
    }
  };

  const handleSaveWorkflow = async () => {
    setLoading(true);
    setError(null);

    try {
      if (currentWorkflow.id) {
        await axios.put(`/api/v1/workflows/${currentWorkflow.id}`, currentWorkflow);
      } else {
        await axios.post('/api/v1/workflows', currentWorkflow);
      }
      
      await fetchWorkflows();
      setMode('list');
      setCurrentWorkflow({
        name: '',
        description: '',
        trigger: { type: 'manual', config: {} },
        conditions: [],
        actions: [],
        enabled: true
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      await axios.post(`/api/v1/workflows/${workflowId}/execute`, {
        triggerData: {}
      });
      alert('Workflow executed successfully');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to execute workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/workflows/${workflowId}`);
      await fetchWorkflows();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete workflow');
    }
  };

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow);
    setMode('edit');
  };

  const handleUseTemplate = (template: WorkflowDefinition) => {
    const newWorkflow = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      description: template.description
    };
    setCurrentWorkflow(newWorkflow);
    setShowTemplates(false);
    setMode('create');
  };

  const handleAddCondition = () => {
    const currentConditions = currentWorkflow.conditions || [];
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: [...currentConditions, { field: '', operator: 'eq', value: '' }]
    });
  };

  const handleConditionChange = (index: number, field: string, value: any) => {
    const currentConditions = currentWorkflow.conditions || [];
    const updatedConditions = [...currentConditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: updatedConditions
    });
  };

  const handleRemoveCondition = (index: number) => {
    const currentConditions = currentWorkflow.conditions || [];
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: currentConditions.filter((_, i) => i !== index)
    });
  };

  const handleAddAction = () => {
    const currentActions = currentWorkflow.actions || [];
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: [...currentActions, { type: 'notification', config: {} }]
    });
  };

  const handleActionChange = (index: number, field: string, value: any) => {
    const currentActions = currentWorkflow.actions || [];
    const updatedActions = [...currentActions];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: updatedActions
    });
  };

  const handleRemoveAction = (index: number) => {
    const currentActions = currentWorkflow.actions || [];
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentActions.filter((_, i) => i !== index)
    });
  };

  if (mode === 'list') {
    return (
      <div className="workflow-builder">
        <div className="workflow-header">
          <h2>Workflow Automation</h2>
          <div className="header-actions">
            <button
              onClick={() => setShowTemplates(true)}
              className="templates-btn"
            >
              Use Template
            </button>
            <button
              onClick={() => setMode('create')}
              className="create-btn"
            >
              Create Workflow
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showTemplates && (
          <div className="templates-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Workflow Templates</h3>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>
              <div className="templates-list">
                {templates.map((template) => (
                  <div key={template.id} className="template-card">
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="use-template-btn"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="workflows-list">
          {workflows.length > 0 ? (
            workflows.map((workflow) => (
              <div key={workflow.id} className="workflow-card">
                <div className="workflow-info">
                  <div className="workflow-header-row">
                    <h3>{workflow.name}</h3>
                    <span className={`status-badge ${workflow.enabled ? 'enabled' : 'disabled'}`}>
                      {workflow.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p>{workflow.description}</p>
                  <div className="workflow-meta">
                    <span>Trigger: {workflow.trigger.type}</span>
                    <span>Actions: {workflow.actions.length}</span>
                    <span>Conditions: {workflow.conditions.length}</span>
                  </div>
                </div>
                <div className="workflow-actions">
                  <button
                    onClick={() => handleExecuteWorkflow(workflow.id!)}
                    disabled={!workflow.enabled}
                    className="execute-btn"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => handleEditWorkflow(workflow)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id!)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-workflows">
              <p>No workflows found. Create your first workflow or use a template to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-builder">
      <div className="workflow-header">
        <h2>{mode === 'create' ? 'Create Workflow' : 'Edit Workflow'}</h2>
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

      <div className="workflow-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Workflow Name</label>
            <input
              type="text"
              value={currentWorkflow.name}
              onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={currentWorkflow.description}
              onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, description: e.target.value })}
              className="form-textarea"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={currentWorkflow.enabled}
                onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, enabled: e.target.checked })}
              />
              Enable Workflow
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Trigger Configuration</h3>
          <div className="form-group">
            <label>Trigger Type</label>
            <select
              value={currentWorkflow.trigger?.type}
              onChange={(e) => setCurrentWorkflow({
                ...currentWorkflow,
                trigger: { type: e.target.value as any, config: {} }
              })}
              className="form-select"
            >
              <option value="manual">Manual</option>
              <option value="time">Time-based</option>
              <option value="event">Event-based</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Conditions</h3>
          {(currentWorkflow.conditions || []).map((condition, index) => (
            <div key={index} className="condition-row">
              <input
                type="text"
                placeholder="Field (e.g., quote.total_amount)"
                value={condition.field}
                onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                className="form-input"
              />
              <select
                value={condition.operator}
                onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
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
              </select>
              <input
                type="text"
                placeholder="Value"
                value={condition.value}
                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                className="form-input"
              />
              <button
                onClick={() => handleRemoveCondition(index)}
                className="remove-btn"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddCondition}
            className="add-btn"
          >
            Add Condition
          </button>
        </div>

        <div className="form-section">
          <h3>Actions</h3>
          {(currentWorkflow.actions || []).map((action, index) => (
            <div key={index} className="action-row">
              <select
                value={action.type}
                onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                className="form-select"
              >
                <option value="notification">Send Notification</option>
                <option value="email">Send Email</option>
                <option value="update">Update Record</option>
                <option value="create">Create Record</option>
                <option value="api_call">API Call</option>
              </select>
              <button
                onClick={() => handleRemoveAction(index)}
                className="remove-btn"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddAction}
            className="add-btn"
          >
            Add Action
          </button>
        </div>

        <div className="form-actions">
          <button
            onClick={handleSaveWorkflow}
            disabled={loading}
            className="save-btn"
          >
            {loading ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;