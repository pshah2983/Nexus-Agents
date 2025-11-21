
export enum AgentStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  WAITING = 'WAITING'
}

export enum AgentRole {
  RESEARCHER = 'Researcher',
  ANALYST = 'Analyst',
  WRITER = 'Writer'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AgentOutput {
  text: string;
  sources?: GroundingSource[];
}

export interface AgentState {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  status: AgentStatus;
  output: AgentOutput | null;
  error?: string;
}

export interface WorkflowState {
  topic: string;
  isActive: boolean;
  agents: AgentState[];
}

export interface User {
  email: string;
  name: string;
  isVerified: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  blogContent: string;
  agentOutputs: {
    research: AgentOutput;
    analysis: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
