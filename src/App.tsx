import * as React from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import { useChatHistory } from './hooks/useChatHistory'
import type { AgentId, AttachedFile } from './types/chat'

// ============================================================
// Root App — one chat can talk to MANY agents.
// currentAgent = agent used for the NEXT message.
// Every assistant message permanently stores its own agentId.
// History is never filtered by agent.
// ============================================================

export default function App() {
  const {
    conversations,
    createConversation,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    deleteConversation,
    updateConversationAgent,
    getConversation,
  } = useChatHistory()

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [streamingMsgId, setStreamingMsgId] = React.useState<string | null>(null)
  const [currentAgent, setCurrentAgent] = React.useState<AgentId>('supervisor-agent')
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  const activeConversation = activeId ? getConversation(activeId) ?? null : null

  // ----------------------------------------------------------
  // New Chat — inherits the currently selected agent
  // ----------------------------------------------------------
  function handleNewChat() {
    const conv = createConversation(currentAgent)
    setActiveId(conv.id)
  }

  // ----------------------------------------------------------
  // Select existing conversation — show FULL history and sync
  // the picker to the conversation's last-used agent
  // ----------------------------------------------------------
  function handleSelectConversation(id: string) {
    const conv = getConversation(id)
    setActiveId(id)
    if (conv) {
      setCurrentAgent(conv.agentId)
    }
  }

  // ----------------------------------------------------------
  // Delete conversation — if active, clear selection
  // ----------------------------------------------------------
  function handleDeleteConversation(id: string) {
    deleteConversation(id)
    if (activeId === id) setActiveId(null)
  }

  // ----------------------------------------------------------
  // Change agent — works ANYTIME, even mid-chat.
  // The conversation keeps every message; only the NEXT reply
  // uses the newly selected agent.
  // ----------------------------------------------------------
  function handleChangeAgent(id: AgentId) {
    setCurrentAgent(id)
    if (activeId) {
      updateConversationAgent(activeId, id)
    }
  }

  // ----------------------------------------------------------
  // Build file context text for AI message
  // ----------------------------------------------------------
  function buildFileContext(attachedFiles: AttachedFile[]): string {
    if (attachedFiles.length === 0) return ''
    const lines: string[] = ['\n\n[Attached files]']
    for (const f of attachedFiles) {
      if (f.isImage) {
        lines.push(`- Image: ${f.name} (${f.mimeType}) [image data attached]`)
      } else if (f.mimeType.startsWith('text/') || f.mimeType === 'application/json') {
        // For text files, try to decode and include content
        try {
          const base64 = f.dataUrl.split(',')[1]
          const text = atob(base64)
          lines.push(`- File: ${f.name}\n\`\`\`\n${text.slice(0, 4000)}\n\`\`\``)
        } catch {
          lines.push(`- File: ${f.name} (${f.mimeType})`)
        }
      } else {
        lines.push(`- File: ${f.name} (${f.mimeType}, ${(f.size / 1024).toFixed(1)} KB)`)
      }
    }
    return lines.join('\n')
  }

  // ----------------------------------------------------------
  // Send message — uses currentAgent (the picker), NOT a locked
  // per-conversation agent, so one chat can use many agents.
  // ----------------------------------------------------------
  async function handleSendMessage(content: string, attachedFiles: AttachedFile[]) {
    if (isLoading) return

    // Ensure we have an active conversation
    let convId = activeId
    if (!convId) {
      const conv = createConversation(currentAgent)
      convId = conv.id
      setActiveId(conv.id)
    }

    const conv = getConversation(convId)
    // THE FIX: reply with the currently picked agent, keep full history
    const agentId: AgentId = currentAgent
    updateConversationAgent(convId, agentId)

    // Combine content with file context
    const fullContent = content + buildFileContext(attachedFiles)

    // Add user message to state
    addUserMessage(convId, content, attachedFiles)

    // Add assistant placeholder — tag it with the agent so label never changes
    const assistantMsgId = addAssistantPlaceholder(convId, agentId)
    setStreamingMsgId(assistantMsgId)
    setIsLoading(true)

    // Build messages for API — include FULL history (all agents)
    const existingMessages = (conv?.messages ?? []).map(m => ({
      role: m.role,
      content: m.content,
    }))
    const apiMessages = [
      ...existingMessages,
      { role: 'user' as const, content: fullContent },
    ]

    try {
      const response = await fetch(`/chat/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          threadId: conv?.threadId ?? `thread-${convId}`,
          resourceId: conv?.resourceId ?? 'user-001',
        }),
      })

      if (!response.ok || !response.body) {
        let errorMsg = 'Chat service unavailable.'
        try {
          const details = await response.json() as { error?: string; message?: string }
          errorMsg = details.error || details.message || errorMsg
        } catch {
          // empty response
        }
        if (response.status === 401) {
          errorMsg = 'AI provider rejected its API key. Update the key in .env and restart Mastra.'
        }
        throw new Error(errorMsg)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        updateAssistantMessage(convId!, assistantMsgId, accumulated)
      }

      if (!accumulated.trim()) {
        throw new Error('The assistant returned an empty reply. Please try again.')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Something went wrong.'
      updateAssistantMessage(convId!, assistantMsgId, `⚠️ ${msg}`)
    } finally {
      setIsLoading(false)
      setStreamingMsgId(null)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        sidebarOpen={sidebarOpen}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <ChatWindow
        conversation={activeConversation}
        isLoading={isLoading}
        streamingMsgId={streamingMsgId}
        currentAgent={currentAgent}
        onChangeAgent={handleChangeAgent}
        onSendMessage={handleSendMessage}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />
    </div>
  )
}
