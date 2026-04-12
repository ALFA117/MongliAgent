import Anthropic from '@anthropic-ai/sdk';
import { Subtask, ServiceName } from './types';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Solo servicios que existen en producción
const SERVICE_COSTS: Record<'search' | 'summarize', number> = {
  search: 0.01,
  summarize: 0.02,
};

export async function planResearch(
  question: string,
  budgetUsdc: number
): Promise<Subtask[]> {
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

  // Si el planner devuelve vacío, forzar al menos una búsqueda
  if (subtasks.length === 0) {
    subtasks.push({
      id: uuidv4(),
      service: 'search' as ServiceName,
      input: question,
      reason: 'Búsqueda directa de la pregunta de investigación',
      cost: SERVICE_COSTS.search,
      status: 'pending',
    });
  }

  return subtasks;
}
