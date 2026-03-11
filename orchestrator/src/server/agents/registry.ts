/**
 * Agent Registry
 * Central management of all agents
 */

import { ScraperAgent } from './ScraperAgent';
import { ScoringAgent } from './ScoringAgent';
import { TailoringAgent } from './TailoringAgent';
import { InboxAgent } from './InboxAgent';
import type { IAgent, Agent } from './types';

class AgentRegistry {
  private agents: Map<string, IAgent> = new Map();

  constructor() {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    this.register(new ScraperAgent());
    this.register(new ScoringAgent());
    this.register(new TailoringAgent());
    this.register(new InboxAgent());
  }

  register(agent: IAgent) {
    this.agents.set(agent.id, agent);
  }

  get(id: string): IAgent | undefined {
    return this.agents.get(id);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.getStatus(),
      config: agent.getConfig(),
      metrics: agent.getMetrics(),
      currentRun: agent.getCurrentRun ? agent.getCurrentRun() : undefined,
      lastRun: agent.getLastRun ? agent.getLastRun() : undefined,
    }));
  }

  list(): string[] {
    return Array.from(this.agents.keys());
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();
