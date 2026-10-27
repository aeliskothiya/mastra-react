import * as React from 'react'
import type { Conversation, Message, AgentId, AttachedFile } from '../types/chat'

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'nexus-ai-conversations'
const RESOURCE_ID = 'user-001'   // Stable user identity for Mastra memory

// ============================================================
// Helper utilities
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim()
  return cleaned.length > 50 ? cleaned.slice(0, 47) + '…' : cleaned
}

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

function saveToStorage(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ============================================================
// Hook
// ============================================================

export function useChatHistory() {
  const [conversations, setConversations] = React.useState<Conversation[]>(() => loadFromStorage())

  // Persist whenever state changes
  React.useEffect(() => {
    saveToStorage(conversations)
  }, [conversations])

  // ----------------------------------------------------------
  // Create a new blank conversation
  // ----------------------------------------------------------
  function createConversation(agentId: AgentId): Conversation {
    const id = generateId()
    const newConv: Conversation = {
      id,
      threadId: `thread-${id}`,
      resourceId: RESOURCE_ID,
      agentId,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConv, ...prev])
    return newConv
  }

  // ----------------------------------------------------------
  // Add a user message and get back updated conversation
  // ----------------------------------------------------------
  function addUserMessage(
    convId: string,
    content: string,
    files?: AttachedFile[],
  ): Message {
    const msg: Message = {
      id: generateId(),
      role: 'user',
      content,
      files,
      timestamp: Date.now(),
    }
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== convId) return c
        const isFirst = c.messages.length === 0
        return {
          ...c,
          title: isFirst ? buildTitle(content) : c.title,
          messages: [...c.messages, msg],
          updatedAt: Date.now(),
        }
      }),
    )
    return msg
  }

  // ----------------------------------------------------------
  // Add a placeholder assistant message and return its id
  // ----------------------------------------------------------
  function addAssistantPlaceholder(convId: string, agentId?: string): string {
    const id = generateId()
    const msg: Message = { id, role: 'assistant', content: '', timestamp: Date.now(), agentId: agentId as any }
    setConversations(prev =>
      prev.map(c =>
        c.id !== convId ? c : { ...c, messages: [...c.messages, msg], updatedAt: Date.now() },
      ),
    )
    return id
  }

  // ----------------------------------------------------------
  // Stream-update the assistant message content
  // ----------------------------------------------------------
  function updateAssistantMessage(convId: string, msgId: string, content: string): void {
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== convId) return c
        return {
          ...c,
          messages: c.messages.map(m => (m.id === msgId ? { ...m, content } : m)),
          updatedAt: Date.now(),
        }
      }),
    )
  }

  // ----------------------------------------------------------
  // Delete a conversation
  // ----------------------------------------------------------
  function deleteConversation(convId: string): void {
    setConversations(prev => prev.filter(c => c.id !== convId))
  }

  // ----------------------------------------------------------
  // Update the agent of a conversation
  // ----------------------------------------------------------
  function updateConversationAgent(convId: string, agentId: AgentId): void {
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, agentId, updatedAt: Date.now() } : c))
    )
  }

  // ----------------------------------------------------------
  // Get conversation by id
  // ----------------------------------------------------------
  function getConversation(convId: string): Conversation | undefined {
    return conversations.find(c => c.id === convId)
  }

  return {
    conversations,
    createConversation,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    deleteConversation,
    updateConversationAgent,
    getConversation,
  }
}
