export type ChatMode = 'chat' | 'image' | 'ppt';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  toolCalls?: ToolCallDisplay[];
  plan?: string[];
  streaming?: boolean;
}

export interface ToolCallDisplay {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'done';
}

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'plan'; steps: string[] }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown>; id: string }
  | { type: 'tool_result'; tool: string; result: string; id: string }
  | { type: 'done' };

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}