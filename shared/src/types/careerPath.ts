/**
 * Career Path types for progression graph and scenario analysis.
 */

export interface CareerNode {
  id: string;
  title: string;
  level: string;
  sector: string;
  avgSalary: number;
  requiredSkills: string[];
  timeToReach: string;
  isCurrentPosition: boolean;
  isTarget: boolean;
}

export interface CareerEdge {
  from: string;
  to: string;
  probability: number;
  transition: string;
  keySkillsToAcquire?: string[];
}

export interface CareerGraph {
  nodes: CareerNode[];
  edges: CareerEdge[];
  generatedAt: string;
}

export interface ScenarioDetail {
  fromNode: CareerNode;
  toNode: CareerNode;
  probability: number;
  estimatedDuration: string;
  targetSalaryRange: { min: number; max: number };
  gapSkills: {
    skill: string;
    currentLevel?: string;
    requiredLevel: string;
    resources: Array<{
      title: string;
      type: "course" | "certification" | "project" | "book";
      url?: string;
      estimatedHours?: number;
    }>;
  }[];
  typicalCompanies: Array<{
    name: string;
    sector: string;
    hiringFrequency?: "low" | "medium" | "high";
  }>;
  concreteActions: Array<{
    action: string;
    deadline: string;
    priority: "high" | "medium" | "low";
  }>;
  transitionNarrative: string;
}
