import Anthropic from '@anthropic-ai/sdk';
import { Subtask, ServiceName } from './types';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SERVICE_COSTS: Record<'search' | 'summarize', number> = {
  search: 0.01,
  summarize: 0.02,
};

const SEARCH_VARIATIONS = [
  (q: string) => q,
  (q: string) => `últimas noticias ${q}`,
  (q: string) => `${q} análisis expertos`,
  (q: string) => `${q} datos estadísticas`,
  (q: string) => `${q} tendencias 2025`,
  (q: string) => `${q} pros contras`,
  (q: string) => `${q} ejemplos casos reales`,
  (q: string) => `${q} impacto futuro`,
  (q: string) => `${q} comparativa alternativas`,
  (q: string) => `investigación científica ${q}`,
];

function fallbackPlan(question: string, budgetUsdc: number): Subtask[] {
  const tasks: Subtask[] = [];

  // Calcular cuántas búsquedas caben en el presupuesto (máximo 10)
  const maxSearches = Math.min(
    Math.floor(budgetUsdc / SERVICE_COSTS.search),
    SEARCH_VARIATIONS.length
  );
  const numSearches = Math.max(1, maxSearches);

  for (let i = 0; i < numSearches; i++) {
    tasks.push({
      id: uuidv4(),
      service: 'search' as ServiceName,
      input: SEARCH_VARIATIONS[i](question),
      reason: i === 0 ? 'Búsqueda principal sobre la pregunta' : `Búsqueda complementaria ángulo ${i + 1}`,
      cost: SERVICE_COSTS.search,
      status: 'pending',
    });
  }

  // Resumen si queda presupuesto
  const usedSoFar = numSearches * SERVICE_COSTS.search;
  if (budgetUsdc - usedSoFar >= SERVICE_COSTS.summarize) {
    tasks.push({
      id: uuidv4(),
      service: 'summarize' as ServiceName,
      input: question,
      reason: 'Síntesis de los resultados encontrados',
      cost: SERVICE_COSTS.summarize,
      status: 'pending',
    });
  }

  return tasks;
}

export async function planResearch(
  question: string,
  budgetUsdc: number
): Promise<Subtask[]> {
  try {
    const prompt = `Eres un asistente de planificación de investigación para un agente autónomo con presupuesto en USDC.

Servicios disponibles:
- "search"    → búsqueda web de información actual    | costo: $0.01 USDC
- "summarize" → resumen con IA de un texto dado       | costo: $0.02 USDC

Presupuesto: ${budgetUsdc} USDC
Pregunta de investigación: ${question}

Presupuesto máximo de subtareas: ${Math.min(Math.floor(budgetUsdc / 0.01), 10)} subtareas (respetando el presupuesto de ${budgetUsdc} USDC).
Planifica TODAS las subtareas que puedas dentro del presupuesto, hasta ese máximo. No limites artificialmente a 3.
Prefiere "search" como herramienta primaria con ángulos distintos de la pregunta. Usa "summarize" solo al final si queda presupuesto.

Responde SOLO con un array JSON válido — sin markdown, sin explicaciones:
[
  {
    "service": "search" | "summarize",
    "input": "<la consulta o texto a procesar>",
    "reason": "<una oración: por qué esta subtarea es necesaria>"
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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

    const maxTasks = Math.min(Math.floor(budgetUsdc / 0.01), 10);
    const subtasks: Subtask[] = parsed
      .slice(0, maxTasks)
      .filter((item) => item.service === 'search' || item.service === 'summarize')
      .map((item) => {
        const svc = item.service as 'search' | 'summarize';
        return {
          id: uuidv4(),
          service: svc as ServiceName,
          input: item.input ?? '',
          reason: item.reason ?? '',
          cost: SERVICE_COSTS[svc],
          status: 'pending',
        };
      });

    if (subtasks.length > 0) return subtasks;

    // Claude devolvió vacío — usar fallback
    return fallbackPlan(question, budgetUsdc);
  } catch (err) {
    // Sin créditos o error de API — plan simple sin LLM
    console.warn('[planner] Claude API no disponible, usando plan básico:', String(err));
    return fallbackPlan(question, budgetUsdc);
  }
}
