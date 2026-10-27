// ============================================================
// Shared TypeScript types for the GPT Chat Application
// ============================================================

export type AgentId =
  | 'supervisor-agent'
  | 'weather-agent'
  | 'research-agent'
  | 'activity-agent'
  | 'audit-supervisor-agent'
  | 'frontend-auditor-agent'
  | 'backend-auditor-agent'
  | 'security-auditor-agent'

export interface AgentOption {
  id: AgentId
  name: string
  description: string
  icon: string
  color: string
}

export interface AttachedFile {
  id: string
  name: string
  mimeType: string
  size: number
  dataUrl: string   // base64 data URL — included as context in message
  isImage: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: AttachedFile[]
  timestamp: number
  agentId?: AgentId   // agent that produced this message (assistant only)
}

export interface Conversation {
  id: string
  threadId: string    // Sent to Mastra memory — unique per conversation
  resourceId: string  // User identity for Mastra memory
  agentId: AgentId
  title: string       // Auto-generated from first user message
  messages: Message[]
  createdAt: number
  updatedAt: number
}
