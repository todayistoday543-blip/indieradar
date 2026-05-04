import Anthropic from '@anthropic-ai/sdk';
import { AGENTS } from './definitions';
import type { AgentRole, AgentTask } from './types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runAgentTask(
  role: AgentRole,
  taskType: string,
  input: Record<string, unknown>
): Promise<AgentTask> {
  const agent = AGENTS[role];
  if (!agent) {
    throw new Error(`Unknown agent role: ${role}`);
  }

  const task: AgentTask = {
    id: crypto.randomUUID(),
    agent: role,
    type: taskType,
    input,
    status: 'running',
    created_at: new Date().toISOString(),
  };

  try {
    const message = await anthropic.messages.create({
      model: agent.model,
      max_tokens: 2048,
      system: agent.system_prompt,
      messages: [
        {
          role: 'user',
          content: `タスク: ${taskType}\n\n入力データ:\n${JSON.stringify(input, null, 2)}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    task.status = 'completed';
    task.output = { result: textBlock?.text || '' };
    task.completed_at = new Date().toISOString();
  } catch (error) {
    task.status = 'failed';
    task.output = {
      error: error instanceof Error ? error.message : 'unknown',
    };
    task.completed_at = new Date().toISOString();
  }

  return task;
}

export async function routeTask(
  description: string
): Promise<{ role: AgentRole; reasoning: string }> {
  const agentList = Object.values(AGENTS)
    .map((a) => `- ${a.role}: ${a.description}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `以下のタスクを最適な部門に振り分けてください。

タスク: ${description}

利用可能な部門:
${agentList}

JSON形式で回答: {"role": "部門名", "reasoning": "理由"}`,
      },
    ],
  });

  const text =
    message.content.find((b) => b.type === 'text')?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { role: 'ceo', reasoning: 'Failed to parse routing response' };
  }

  return JSON.parse(match[0]);
}
