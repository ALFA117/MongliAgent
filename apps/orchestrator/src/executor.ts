import Anthropic from '@anthropic-ai/sdk';
import { payAndFetch, WalletConfig } from '@mongliagent/stellar-utils';
import { Session, Subtask } from './types';
import { appendLog } from './sessions';
import { planResearch } from './planner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SERVICE_URLS: Record<string, string> = {
  search: 'http://localhost:3001/search',
  summarize: 'http://localhost:3002/summarize',
  facts: 'http://localhost:3003/facts',
};

function getWallet(): WalletConfig {
  const secretKey = process.env.STELLAR_SECRET_KEY;
  if (!secretKey) throw new Error('STELLAR_SECRET_KEY is not set');
  return { secretKey, network: 'testnet' };
}

async function executeSubtask(
  subtask: Subtask,
  wallet: WalletConfig
): Promise<{ result: unknown; txHash: string }> {
  const url = SERVICE_URLS[subtask.service];

  let fetchOptions: Parameters<typeof payAndFetch>[1];

  if (subtask.service === 'search') {
    fetchOptions = { method: 'POST', body: { query: subtask.input } };
  } else if (subtask.service === 'summarize') {
    fetchOptions = { method: 'POST', body: { text: subtask.input } };
  } else {
    // facts — GET with query param
    fetchOptions = { method: 'GET', params: { topic: subtask.input } };
  }

  const result = await payAndFetch(url, fetchOptions, wallet, subtask.service);
  return { result: result.data, txHash: result.txHash };
}

async function generateReport(
  session: Session,
  results: Array<{ subtask: Subtask; result: unknown }>
): Promise<string> {
  const resultText = results
    .map(
      ({ subtask, result }) =>
        `### Subtask: ${subtask.service} — "${subtask.input}"\nReason: ${subtask.reason}\nResult:\n${JSON.stringify(result, null, 2)}`
    )
    .join('\n\n');

  const budgetUsed = session.balanceUsed.toFixed(4);
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);

  const prompt = `You are a research analyst. Write a concise markdown research report.

Question: ${session.question}
Budget used: $${budgetUsed} / $${session.budgetUsdc} USDC
Research time: ${elapsed}s

Research results:
${resultText}

Write a markdown report with these sections (use proper markdown headings):
1. **Executive Summary** — 2-3 sentences answering the question directly
2. **Key Findings** — bullet points from the research results
3. **Sources & Costs** — a markdown table: | Source | Type | Cost |
4. **Conclusion** — 1-2 sentences

Be factual, concise, and base everything on the provided results.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : 'Report generation failed.';
}

export async function runResearch(session: Session): Promise<void> {
  const wallet = getWallet();

  try {
    // 1. Plan
    appendLog(session, 'info', `Planning research for: "${session.question}"`);
    session.status = 'planning';

    const subtasks = await planResearch(session.question, session.budgetUsdc);
    session.subtasks = subtasks;

    appendLog(session, 'plan', `Plan ready: ${subtasks.length} subtask(s)`);
    subtasks.forEach((t, i) => {
      appendLog(session, 'info', `  ${i + 1}. [${t.service}] ${t.input} ($${t.cost} USDC) — ${t.reason}`);
    });

    // 2. Execute
    session.status = 'executing';
    const completedResults: Array<{ subtask: Subtask; result: unknown }> = [];

    for (const subtask of session.subtasks) {
      const remaining = session.budgetUsdc - session.balanceUsed;

      if (remaining < subtask.cost) {
        subtask.status = 'skipped';
        appendLog(session, 'warning', `Skipping [${subtask.service}]: insufficient budget ($${remaining.toFixed(4)} remaining, need $${subtask.cost})`);
        continue;
      }

      subtask.status = 'running';
      appendLog(session, 'info', `Executing [${subtask.service}]: "${subtask.input}"`);

      try {
        const { result, txHash } = await executeSubtask(subtask, wallet);

        subtask.status = 'completed';
        subtask.result = result;
        subtask.txHash = txHash;
        session.balanceUsed += subtask.cost;

        const balanceAfter = session.budgetUsdc - session.balanceUsed;

        appendLog(session, 'payment', `Paid $${subtask.cost} USDC for [${subtask.service}]`, {
          service: subtask.service,
          txHash,
          amountPaid: String(subtask.cost),
          balanceAfter,
        });

        completedResults.push({ subtask, result });
      } catch (err) {
        subtask.status = 'skipped';
        subtask.error = String(err);
        appendLog(session, 'error', `[${subtask.service}] failed: ${String(err)}`);
      }
    }

    // 3. Generate report
    if (completedResults.length === 0) {
      session.report = '# Research Report\n\nNo results could be retrieved. Please check service availability and budget.';
    } else {
      appendLog(session, 'info', 'Generating final report...');
      session.report = await generateReport(session, completedResults);
    }

    session.status = 'completed';
    session.endTime = Date.now();
    appendLog(session, 'info', `Research complete. Total spent: $${session.balanceUsed.toFixed(4)} USDC in ${((session.endTime - session.startTime) / 1000).toFixed(1)}s`);
  } catch (err) {
    session.status = 'error';
    session.error = String(err);
    session.endTime = Date.now();
    appendLog(session, 'error', `Fatal error: ${String(err)}`);
  }
}