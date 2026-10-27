import * as React from 'react'
import type { Message, Conversation, AttachedFile, AgentId } from '../types/chat'
import { AGENTS, getAgent } from './Sidebar'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

// ============================================================
// Suggested prompts shown on empty state
// ============================================================

const SUGGESTED_PROMPTS = [
  { icon: '⛅', text: 'What is the weather in Tokyo right now?', agent: 'weather-agent' as AgentId },
  { icon: '🔬', text: 'Search the best cafes in Surat', agent: 'research-agent' as AgentId },
  { icon: '🎯', text: 'Suggest activities for a rainy weekend in London', agent: 'activity-agent' as AgentId },
  { icon: '🛡️', text: 'Audit my project for security vulnerabilities', agent: 'audit-supervisor-agent' as AgentId },
  { icon: '🧠', text: 'Compare React vs Vue for a large-scale app', agent: 'supervisor-agent' as AgentId },
  { icon: '📝', text: 'Write a Python function to parse CSV files', agent: 'supervisor-agent' as AgentId },
]

// ============================================================
// Props
// ============================================================

interface ChatWindowProps {
  conversation: Conversation | null
  isLoading: boolean
  streamingMsgId: string | null
  currentAgent: AgentId
  onChangeAgent: (id: AgentId) => void
  onSendMessage: (content: string, files: AttachedFile[]) => void
  onToggleSidebar: () => void
}

// ============================================================
// Component — one chat, many agents (like a proper LLM app).
// The topbar picker switches the agent for the NEXT message;
// history is never cleared and every reply is labelled.
// ============================================================

export default function ChatWindow({
  conversation,
  isLoading,
  streamingMsgId,
  currentAgent,
  onChangeAgent,
  onSendMessage,
  onToggleSidebar,
}: ChatWindowProps) {
  const [input, setInput] = React.useState('')
  const [files, setFiles] = React.useState<AttachedFile[]>([])
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const conversationRef = React.useRef<HTMLDivElement>(null)
  const pickerRef = React.useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = React.useState(true)

  const activeAgent = getAgent(currentAgent)
  const messages: Message[] = conversation?.messages ?? []

  // Close picker on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-scroll to bottom when new content arrives
  React.useEffect(() => {
    if (atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, atBottom])

  // Track scroll position to show/hide scroll-to-bottom button
  function handleScroll() {
    const el = conversationRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(bottom < 80)
  }

  function handleSubmit() {
    const content = input.trim()
    if (!content && files.length === 0) return
    onSendMessage(content, files)
    setInput('')
    setFiles([])
  }

  function handleSuggestedPrompt(text: string, agent: AgentId) {
    onChangeAgent(agent)
    setInput(text)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAtBottom(true)
  }

  // Distinct agents used in this chat (for the "in this chat" strip)
  const agentsInChat = React.useMemo(() => {
    const ids = new Set<AgentId>()
    for (const m of messages) {
      if (m.role === 'assistant' && m.agentId) ids.add(m.agentId)
    }
    return [...ids].map(getAgent)
  }, [messages])

  let lastAssistantAgent: AgentId | null = null

  return (
    <main className="chat-window" aria-label="Chat">
      {/* Top bar */}
      <header className="chat-topbar">
        <button
          className="topbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        {/* Agent picker — switch agent mid-chat, history stays */}
        <div className="topbar-agent-picker" ref={pickerRef}>
          <button
            className="topbar-agent"
            onClick={() => setPickerOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            id="agent-selector"
            title="Switch agent — the same chat keeps all history"
          >
            <span className="topbar-agent-icon" style={{ background: `${activeAgent.color}22` }}>
              {activeAgent.icon}
            </span>
            <div className="topbar-agent-info">
              <span className="topbar-agent-name">
                {conversation?.title && conversation.messages.length > 0
                  ? conversation.title
                  : 'New conversation'}
                <span className="topbar-agent-caret">{pickerOpen ? ' ▲' : ' ▼'}</span>
              </span>
              <span className="topbar-agent-desc">
                Replying as {activeAgent.name} · {activeAgent.description}
              </span>
            </div>
          </button>

          {pickerOpen && (
            <ul className="topbar-agent-dropdown" role="listbox" aria-label="Select agent for next message">
              {AGENTS.map(agent => (
                <li
                  key={agent.id}
                  role="option"
                  aria-selected={agent.id === currentAgent}
                  className={`agent-option ${agent.id === currentAgent ? 'agent-option--active' : ''}`}
                  onClick={() => {
                    onChangeAgent(agent.id)
                    setPickerOpen(false)
                  }}
                >
                  <span className="agent-option-icon" style={{ background: `${agent.color}22` }}>
                    {agent.icon}
                  </span>
                  <div className="agent-option-text">
                    <span className="agent-option-name">{agent.name}</span>
                    <span className="agent-option-desc">{agent.description}</span>
                  </div>
                  {agent.id === currentAgent && <span className="agent-option-check">✓</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="topbar-status">
          <span className="topbar-status-dot" aria-hidden="true" />
          <span>Online</span>
        </div>
      </header>

      {/* Agents-in-this-chat strip */}
      {agentsInChat.length > 1 && (
        <div className="chat-agents-strip" aria-label="Agents in this chat">
          <span className="chat-agents-label">In this chat:</span>
          {agentsInChat.map(a => (
            <button
              key={a.id}
              className={`chat-agent-pill ${a.id === currentAgent ? 'chat-agent-pill--active' : ''}`}
              onClick={() => onChangeAgent(a.id)}
              title={`Switch to ${a.name}`}
            >
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div
        className="messages-area"
        ref={conversationRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="empty-state">
            <div className="empty-state-logo">
              <span>✦</span>
            </div>
            <h2 className="empty-state-title">How can I help you today?</h2>
            <p className="empty-state-sub">
              One chat, many agents · currently <strong>{activeAgent.name} {activeAgent.icon}</strong>
              {' '}— switch anytime, history stays
            </p>

            <div className="suggested-grid">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  className="suggested-card"
                  onClick={() => handleSuggestedPrompt(prompt.text, prompt.agent)}
                  aria-label={`Use prompt: ${prompt.text}`}
                >
                  <span className="suggested-card-icon">{prompt.icon}</span>
                  <span className="suggested-card-text">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="messages-list">
            {messages.map(msg => {
              const msgAgent = msg.agentId ? getAgent(msg.agentId) : activeAgent
              let divider: React.ReactNode = null
              if (msg.role === 'assistant' && msg.agentId && msg.agentId !== lastAssistantAgent) {
                if (lastAssistantAgent !== null) {
                  divider = (
                    <div className="agent-switch-divider" key={`${msg.id}-divider`}>
                      <span>
                        {msgAgent.icon} Switched to {msgAgent.name}
                      </span>
                    </div>
                  )
                }
                lastAssistantAgent = msg.agentId
              }
              return (
                <React.Fragment key={msg.id}>
                  {divider}
                  <MessageBubble
                    message={msg}
                    isStreaming={msg.id === streamingMsgId}
                    agentName={msgAgent.name}
                    agentIcon={msgAgent.icon}
                    agentColor={msgAgent.color}
                  />
                </React.Fragment>
              )
            })}
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Scroll to bottom button */}
      {!atBottom && messages.length > 0 && (
        <button
          className="scroll-to-bottom"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}

      {/* Input area */}
      <div className="input-area">
        <div className="input-area-inner">
          <div className="reply-as-bar">
            <span className="reply-as-label">
              Replying as <strong>{activeAgent.icon} {activeAgent.name}</strong>
            </span>
            <div className="reply-as-pills">
              {AGENTS.slice(0, 5).map(a => (
                <button
                  key={a.id}
                  className={`reply-as-pill ${a.id === currentAgent ? 'reply-as-pill--active' : ''}`}
                  onClick={() => onChangeAgent(a.id)}
                  title={a.description}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
          <InputBar
            value={input}
            files={files}
            isLoading={isLoading}
            onChange={setInput}
            onAddFiles={newFiles => setFiles(prev => [...prev, ...newFiles])}
            onRemoveFile={id => setFiles(prev => prev.filter(f => f.id !== id))}
            onSubmit={handleSubmit}
          />
          <p className="input-disclaimer">
            Nexus AI may make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </main>
  )
}
