/**
 * Agents API Routes
 */

import { Router } from 'express';
import { agentRegistry } from '../../agents/registry';

export const agentsRouter = Router();

/**
 * GET /api/agents
 * Get list of all agents with status and metrics
 */
agentsRouter.get('/', async (req, res) => {
  try {
    const agents = agentRegistry.getAll();
    return res.json(agents);
  } catch (error) {
    console.error('Get agents error:', error);
    return res.status(500).json({
      error: 'Failed to get agents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/agents/:id
 * Get agent detail with run history
 */
agentsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const runs = agent.getRuns ? agent.getRuns() : [];

    return res.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.getStatus(),
      config: agent.getConfig(),
      metrics: agent.getMetrics(),
      currentRun: agent.getCurrentRun ? agent.getCurrentRun() : undefined,
      lastRun: agent.getLastRun ? agent.getLastRun() : undefined,
      runs: runs.slice(0, 20), // Last 20 runs
    });
  } catch (error) {
    console.error('Get agent detail error:', error);
    return res.status(500).json({
      error: 'Failed to get agent detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/agents/:id/run
 * Trigger manual agent run
 */
agentsRouter.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Run agent asynchronously
    agent.run().catch((error) => {
      console.error(`Agent ${id} run failed:`, error);
    });

    // Return immediately with current run info
    const currentRun = agent.getCurrentRun ? agent.getCurrentRun() : undefined;

    return res.json({
      success: true,
      message: `Agent ${agent.name} started`,
      run: currentRun,
    });
  } catch (error) {
    console.error('Run agent error:', error);
    return res.status(500).json({
      error: 'Failed to run agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/agents/:id/stop
 * Stop currently running agent
 */
agentsRouter.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await agent.stop();

    return res.json({
      success: true,
      message: `Agent ${agent.name} stopped`,
    });
  } catch (error) {
    console.error('Stop agent error:', error);
    return res.status(500).json({
      error: 'Failed to stop agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/agents/:id/config
 * Update agent configuration
 */
agentsRouter.put('/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const config = req.body;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await agent.updateConfig(config);

    return res.json({
      success: true,
      message: `Agent ${agent.name} configuration updated`,
      config: agent.getConfig(),
    });
  } catch (error) {
    console.error('Update agent config error:', error);
    return res.status(500).json({
      error: 'Failed to update agent configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/agents/:id/enable
 * Enable agent
 */
agentsRouter.post('/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await agent.enable();

    return res.json({
      success: true,
      message: `Agent ${agent.name} enabled`,
      status: agent.getStatus(),
    });
  } catch (error) {
    console.error('Enable agent error:', error);
    return res.status(500).json({
      error: 'Failed to enable agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/agents/:id/disable
 * Disable agent
 */
agentsRouter.post('/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await agent.disable();

    return res.json({
      success: true,
      message: `Agent ${agent.name} disabled`,
      status: agent.getStatus(),
    });
  } catch (error) {
    console.error('Disable agent error:', error);
    return res.status(500).json({
      error: 'Failed to disable agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/agents/:id/logs
 * Get agent logs with pagination
 */
agentsRouter.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const level = req.query.level as string | undefined;

    const agent = agentRegistry.get(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const logs = await agent.getLogs(limit, offset, level as any);

    return res.json({
      logs,
      pagination: {
        limit,
        offset,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Get agent logs error:', error);
    return res.status(500).json({
      error: 'Failed to get agent logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
