import { Session, LogEntry, LogEntryType, ServiceName } from './types';

const sessions = new Map<string, Session>();

export function createSession(id: string, question: string, budgetUsdc: number): Session {
  const session: Session = {
    id,
    question,
    budgetUsdc,
    status: 'planning',
    log: [],
    subtasks: [],
    report: null,
    balanceUsed: 0,
    startTime: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function appendLog(
  session: Session,
  type: LogEntryType,
  message: string,
  extra?: {
    service?: ServiceName;
    txHash?: string;
    amountPaid?: string;
    balanceAfter?: number;
  }
): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    type,
    message,
    ...extra,
  };
  session.log.push(entry);
  console.log(`[${session.id.slice(0, 8)}] [${type}] ${message}`);
}