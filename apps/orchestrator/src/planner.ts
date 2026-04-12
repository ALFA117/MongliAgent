import Anthropic from '@anthropic-ai/sdk';
import { Subtask, ServiceName } from './types';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SERVICE_COSTS: Record<'search' | 'summarize', number> = {
  search: 0.01,
  summarize: 0.02,
};

function fallbackPlan(question: string, budgetUsdc: number): Subtask[] {
  const tasks: Subtask[] = [];

  // Siempre buscar
  tasks.push({
    id: uuidv4(),
    service: 'search' as ServiceName,
    input: question,
    reason: 'Búsqueda principal sobre la pregunta',
    cost: SERVICE_COSTS.search,
    status: 'pending',
  });

  // Segunda búsqueda si hay presupuesto
  if (budgetUsdc >= SERVICE_COSTS.search * 2) {
    tasks.push({
      id: uuidv4(),
      service: 'search' as ServiceName,
      input: `últimas noticias ${question}`,
      reason: 'Búsqueda complementaria de noticias recientes',
      cost: SERVICE_COSTS.search,
      status: 'pending',
    });
  }

  // Resumen si hay presupuesto suficiente
  if (budgetUsdc >= SERVICE_COSTS.search * 2 + SERVICE_COSTS.summarize) {
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

Planifica máximo 3 subtareas concretas para responder la pregunta. Mantén el costo total dentro del presupuesto.
Prefiere "search" como herramienta primaria. Usa "summarize" solo si necesitas condensar contenido extenso.

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

    const subtasks: Subtask[] = parsed
      .slice(0, 3)
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
