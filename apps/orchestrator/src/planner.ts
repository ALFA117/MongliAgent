import Anthropic from '@anthropic-ai/sdk';
import { Subtask, ServiceName } from './types';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SERVICE_COSTS: Record<ServiceName, number> = {
  search: 0.01,
  summarize: 0.02,
  facts: 0.005,
};

export async function planResearch(
  question: string,
  budgetUsdc: number
): Promise<Subtask[]> {
  const prompt = `You are a research planning assistant for an autonomous agent with a USDC budget.

Available services:
- "search"    → web search for current information         | cost: $0.01 USDC
- "summarize" → AI summarization of a text passage        | cost: $0.02 USDC
- "facts"     → structured fact sheet about a topic       | cost: $0.005 USDC

Budget: ${budgetUsdc} USDC
Research question: ${question}

Plan at most 3 concrete subtasks to answer the question. Keep total cost within budget.
Prefer "search" as the primary tool. Use "facts" for quick background context. Use "summarize" only if you need to condense lengthy found content.

Respond with ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "service": "search" | "summarize" | "facts",
    "input": "<the query string or text to process>",
    "reason": "<one sentence: why this subtask is needed>"
  }
]`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';

  let parsed: Array<{ service: string; input: string; reason: string }>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  }

  const subtasks: Subtask[] = parsed.slice(0, 3).map((item) => ({
    id: uuidv4(),
    service: (item.service as ServiceName) ?? 'facts',
    input: item.input ?? '',
    reason: item.reason ?? '',
    cost: SERVICE_COSTS[(item.service as ServiceName)] ?? 0.01,
    status: 'pending',
  }));

  return subtasks;
}