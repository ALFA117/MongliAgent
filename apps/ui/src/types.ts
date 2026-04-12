export type ServiceName = 'search' | 'summarize' | 'facts';
export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'skipped';
export type SessionStatus = 'planning' | 'executing' | 'completed' | 'error';
export type LogEntryType = 'info' | 'payment' | 'error' | 'warning' | 'plan';

export interface Subtask {
  id: string;
  service: ServiceName;
  input: string;
  reason: string;
  cost: number;
  status: SubtaskStatus;
  txHash?: string;
  error?: string;
}

export interface LogEntry {
  timestamp: number;
  type: LogEntryType;
  message: string;
  service?: ServiceName;
  txHash?: string;
  amountPaid?: string;
  balanceAfter?: number;
}

export interface SessionState {
  id: string;
  question: string;
  status: SessionStatus;
  budgetUsdc: number;
  balanceUsed: number;
  balanceRemaining: number;
  subtasks: Subtask[];
  log: LogEntry[];
  report: string | null;
  startTime: number;
  endTime?: number;
  error?: string;
}