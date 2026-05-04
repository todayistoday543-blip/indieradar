export type AgentRole =
  | 'ceo'
  | 'content'
  | 'moderation'
  | 'analytics'
  | 'engineering'
  | 'growth'
  | 'i18n'
  | 'finance';

export interface AgentTask {
  id: string;
  agent: AgentRole;
  type: string;
  input: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface AgentDefinition {
  role: AgentRole;
  name: string;
  description: string;
  system_prompt: string;
  capabilities: string[];
  model: 'claude-haiku-4-5-20241022' | 'claude-sonnet-4-5-20241022';
}
