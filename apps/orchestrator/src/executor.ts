import Anthropic from '@anthropic-ai/sdk';
import { payAndFetch, WalletConfig } from '@mongliagent/stellar-utils';
import { Session, Subtask } from './types';
import { appendLog } from './sessions';
import { planResearch } from './planner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// URLs configurables por variable de entorno — Railway asigna una URL por servicio
function getServiceUrls(): Record<string, string> {
  const searchBase = process.env.SERVICE_SEARCH_URL ?? 'http://localhost:3001';
  const summaryBase = process.env.SERVICE_SUMMARY_URL ?? 'http://localhost:3002';
  return {
    search: `${searchBase}/buscar`,
    summarize: `${summaryBase}/resumir`,
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
    // summarize
    fetchOptions = { method: 'POST', body: { texto: subtask.input, text: subtask.input } };
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
        `### Subtarea: ${subtask.service} — "${subtask.input}"\nRazón: ${subtask.reason}\nResultado:\n${JSON.stringify(result, null, 2)}`
    )
    .join('\n\n');

  const budgetUsed = session.balanceUsed.toFixed(4);
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(1);

  const prompt = `Eres un analista de investigación. Escribe un reporte de investigación conciso en markdown, completamente en español.

Pregunta: ${session.question}
Presupuesto usado: $${budgetUsed} / $${session.budgetUsdc} USDC
Tiempo de investigación: ${elapsed}s

Resultados de investigación:
${resultText}

Escribe un reporte en markdown con estas secciones (usa encabezados markdown correctos):
1. **Resumen ejecutivo** — 2-3 oraciones que respondan la pregunta directamente
2. **Hallazgos clave** — puntos en viñetas con los resultados de la investigación
3. **Fuentes y costos** — tabla markdown: | Fuente | Tipo | Costo |
4. **Conclusión** — 1-2 oraciones

Sé factual, conciso y basa todo en los resultados proporcionados. Todo en español.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text'
    ? message.content[0].text
    : 'Error al generar el reporte.';
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
