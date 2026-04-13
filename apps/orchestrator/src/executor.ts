import Anthropic from '@anthropic-ai/sdk';
import { payAndFetch } from './stellar';
import type { WalletConfig } from './stellar';
import { Session, Subtask } from './types';
import { appendLog } from './sessions';
import { planResearch } from './planner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Todo corre en el mismo servidor — llamamos a localhost en el mismo PORT
function getServiceUrls(): Record<string, string> {
  const base = `http://localhost:${process.env.PORT ?? 3000}`;
  return {
    search: `${base}/buscar`,
    summarize: `${base}/resumir`,
  };
}

function getWallet(): WalletConfig {
  const secretKey = process.env.STELLAR_SECRET_KEY;
  if (!secretKey) throw new Error('STELLAR_SECRET_KEY no está configurado');
  return { secretKey, network: 'testnet' };
}

async function executeSubtask(
  subtask: Subtask,
  wallet: WalletConfig
): Promise<{ result: unknown; txHash: string }> {
  const urls = getServiceUrls();
  const url = urls[subtask.service];

  if (!url) {
    throw new Error(`Servicio desconocido: ${subtask.service}`);
  }

  let fetchOptions: Parameters<typeof payAndFetch>[1];

  if (subtask.service === 'search') {
    fetchOptions = { method: 'POST', body: { consulta: subtask.input, query: subtask.input } };
  } else {
    fetchOptions = { method: 'POST', body: { texto: subtask.input, text: subtask.input } };
  }

  const result = await payAndFetch(url, fetchOptions, wallet, subtask.service);
  return { result: result.data, txHash: result.txHash };
}

function generateReportLocal(
  session: Session,
  results: Array<{ subtask: Subtask; result: unknown }>
): string {
  const budgetUsed = session.balanceUsed.toFixed(4);
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);

  const hallazgos = results.flatMap(({ result }) => {
    const r = result as { results?: { title: string; url: string; snippet: string }[] };
    return (r.results ?? []).slice(0, 3).map(
      (item) => `- **[${item.title}](${item.url})**: ${item.snippet}`
    );
  });

  const fuentes = results.flatMap(({ subtask, result }) => {
    const r = result as { results?: { title: string; url: string }[] };
    return (r.results ?? []).slice(0, 3).map(
      (item) => `| [${item.title.slice(0, 40)}](${item.url}) | ${subtask.service} | $${subtask.cost} USDC |`
    );
  });

  const txLines = session.subtasks
    .filter((t) => t.txHash)
    .map((t) => `- \`${t.txHash}\` — [ver en Stellar Expert](https://stellar.expert/explorer/testnet/tx/${t.txHash})`);

  return `# Reporte de Investigación

**Pregunta:** ${session.question}

---

## Resumen ejecutivo

Se realizaron ${results.length} búsqueda(s) sobre el tema utilizando el protocolo x402 con pagos reales en Stellar Testnet. Se encontraron ${hallazgos.length} resultados relevantes con un costo total de **$${budgetUsed} USDC** en ${elapsed} segundos.

---

## Hallazgos clave

${hallazgos.length > 0 ? hallazgos.join('\n') : '_No se encontraron resultados._'}

---

## Fuentes y costos

| Fuente | Tipo | Costo |
|--------|------|-------|
${fuentes.length > 0 ? fuentes.join('\n') : '| — | — | — |'}

**Total gastado:** $${budgetUsed} USDC

---

## Transacciones on-chain

${txLines.length > 0 ? txLines.join('\n') : '_Sin transacciones registradas._'}

---

## Conclusión

La investigación sobre "${session.question}" fue completada con éxito utilizando micropagos x402 en Stellar Testnet. Cada búsqueda generó una transacción verificable on-chain.
`;
}

async function generateReport(
  session: Session,
  results: Array<{ subtask: Subtask; result: unknown }>
): Promise<string> {
  try {
    const budgetUsed = session.balanceUsed.toFixed(4);
    const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);
    const resultText = results
      .map(
        ({ subtask, result }) =>
          `### Subtarea: ${subtask.service} — "${subtask.input}"\n${JSON.stringify(result, null, 2)}`
      )
      .join('\n\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Escribe un reporte de investigación conciso en markdown en español.\n\nPregunta: ${session.question}\nPresupuesto usado: $${budgetUsed} USDC\nTiempo: ${elapsed}s\n\nResultados:\n${resultText}\n\nSecciones: Resumen ejecutivo, Hallazgos clave (viñetas), Fuentes y costos (tabla), Conclusión.`,
        },
      ],
    });

    return message.content[0].type === 'text'
      ? message.content[0].text
      : generateReportLocal(session, results);
  } catch {
    return generateReportLocal(session, results);
  }
}

export async function runResearch(session: Session): Promise<void> {
  const wallet = getWallet();

  try {
    // 1. Planificar
    appendLog(session, 'info', `Planificando investigación: "${session.question}"`);
    session.status = 'planning';

    const subtasks = await planResearch(session.question, session.budgetUsdc);
    session.subtasks = subtasks;

    appendLog(session, 'plan', `Plan listo: ${subtasks.length} subtarea(s)`);
    subtasks.forEach((t, i) => {
      appendLog(
        session,
        'info',
        `  ${i + 1}. [${t.service}] ${t.input} ($${t.cost} USDC) — ${t.reason}`
      );
    });

    // 2. Ejecutar
    session.status = 'executing';
    const completedResults: Array<{ subtask: Subtask; result: unknown }> = [];

    for (const subtask of session.subtasks) {
      const remaining = session.budgetUsdc - session.balanceUsed;

      if (remaining < subtask.cost) {
        subtask.status = 'skipped';
        appendLog(
          session,
          'warning',
          `Omitiendo [${subtask.service}]: presupuesto insuficiente ($${remaining.toFixed(4)} restante, necesita $${subtask.cost})`
        );
        continue;
      }

      subtask.status = 'running';
      appendLog(session, 'info', `Ejecutando [${subtask.service}]: "${subtask.input}"`);

      try {
        const { result, txHash } = await executeSubtask(subtask, wallet);

        subtask.status = 'completed';
        subtask.result = result;
        subtask.txHash = txHash;
        session.balanceUsed += subtask.cost;

        const balanceAfter = session.budgetUsdc - session.balanceUsed;

        appendLog(
          session,
          'payment',
          `Pagado $${subtask.cost} USDC por [${subtask.service}]`,
          {
            service: subtask.service,
            txHash,
            amountPaid: String(subtask.cost),
            balanceAfter,
          }
        );

        completedResults.push({ subtask, result });
      } catch (err) {
        subtask.status = 'skipped';
        subtask.error = String(err);
        appendLog(session, 'error', `[${subtask.service}] falló: ${String(err)}`);
      }
    }

    // 3. Generar reporte
    if (completedResults.length === 0) {
      session.report =
        '# Reporte de Investigación\n\nNo se pudieron obtener resultados. Verifica la disponibilidad de los servicios y el presupuesto.';
    } else {
      appendLog(session, 'info', 'Generando reporte final...');
      session.report = await generateReport(session, completedResults);
    }

    session.status = 'completed';
    session.endTime = Date.now();
    appendLog(
      session,
      'info',
      `Investigación completada. Total gastado: $${session.balanceUsed.toFixed(4)} USDC en ${(
        (session.endTime - session.startTime) /
        1000
      ).toFixed(1)}s`
    );
  } catch (err) {
    session.status = 'error';
    session.error = String(err);
    session.endTime = Date.now();
    appendLog(session, 'error', `Error fatal: ${String(err)}`);
  }
}
