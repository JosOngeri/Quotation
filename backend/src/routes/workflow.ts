import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { WorkflowEngineService } from '../services/workflow-engine';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const workflowEngine = new WorkflowEngineService(pool);

/**
 * @swagger
 * /api/v1/workflows:
 *   get:
 *     summary: List workflow definitions
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workflows listed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const workspaceId = (req as any).workspaceId;
    const workflows = await workflowEngine.listWorkflows(workspaceId);

    res.json({
      data: workflows
    });
  } catch (error) {
    console.error('List workflows error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list workflows'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows:
 *   post:
 *     summary: Create workflow definition
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trigger
 *               - actions
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               trigger:
 *                 type: object
 *               conditions:
 *                 type: array
 *               actions:
 *                 type: array
 *               enabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       400:
 *         description: Invalid request
 */
router.post('/', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const userId = (req as any).userId;
    const workspaceId = (req as any).workspaceId;
    const workflow = req.body;

    const workflowId = await workflowEngine.createWorkflow(workflow, userId, workspaceId);

    res.status(201).json({
      data: {
        id: workflowId,
        message: 'Workflow created successfully'
      }
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create workflow'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   get:
 *     summary: Get workflow definition
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workflow not found
 */
router.get('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowEngine.getWorkflow(id);

    if (!workflow) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Workflow not found'
        }
      });
    }

    res.json({
      data: workflow
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get workflow'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   put:
 *     summary: Update workflow definition
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               trigger:
 *                 type: object
 *               conditions:
 *                 type: array
 *               actions:
 *                 type: array
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Workflow updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Workflow not found
 */
router.put('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = req.body;

    await workflowEngine.updateWorkflow(id, workflow);

    res.json({
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update workflow'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/{id}:
 *   delete:
 *     summary: Delete workflow definition
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Workflow not found
 */
router.delete('/:id', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await workflowEngine.deleteWorkflow(id);

    res.json({
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete workflow'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/{id}/execute:
 *   post:
 *     summary: Execute workflow
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               triggerData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workflow executed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/execute', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { triggerData } = req.body;
    const userId = (req as any).userId;

    const executionId = await workflowEngine.executeWorkflow(id, triggerData, userId);

    res.json({
      data: {
        executionId,
        message: 'Workflow executed successfully'
      }
    });
  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to execute workflow'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/{id}/executions:
 *   get:
 *     summary: Get workflow executions
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow executions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workflow not found
 */
router.get('/:id/executions', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const executions = await workflowEngine.getWorkflowExecutions(id);

    res.json({
      data: executions
    });
  } catch (error) {
    console.error('Get workflow executions error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get workflow executions'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/workflows/templates:
 *   get:
 *     summary: Get workflow templates
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workflow templates retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/templates/list', authenticateTenant, requireRole(['tenant_admin']), async (req, res) => {
  try {
    const templates = workflowEngine.getWorkflowTemplates();

    res.json({
      data: templates
    });
  } catch (error) {
    console.error('Get workflow templates error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get workflow templates'
      }
    });
  }
});

export default router;