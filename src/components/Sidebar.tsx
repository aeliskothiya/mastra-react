import * as React from 'react'
import type { AgentOption, AgentId, Conversation } from '../types/chat'

// ============================================================
// Agent registry (shared with ChatWindow)
// ============================================================

export const AGENTS: AgentOption[] = [
  {
    id: 'supervisor-agent',
    name: 'Supervisor',
    description: 'General-purpose orchestrator — answers anything, routes when needed',
    icon: '🧠',
    color: '#7c3aed',
  },
  {
    id: 'weather-agent',
    name: 'Weather',
    description: 'Live weather data for any location worldwide',
    icon: '⛅',
    color: '#0ea5e9',
  },
  {
    id: 'research-agent',
    name: 'Research',
    description: 'Web research, summaries, places and comparisons',
    icon: '🔬',
    color: '#10b981',
  },
  {
    id: 'activity-agent',
    name: 'Activity',
    description: 'Activity and outing planner with live weather',
    icon: '🎯',
    color: '#f59e0b',
  },
  {
    id: 'audit-supervisor-agent',
    name: 'Code Auditor',
    description: 'Frontend, backend and security code review',
    icon: '🛡️',
    color: '#ef4444',
  },
  {
    id: 'frontend-auditor-agent',
    name: 'Frontend Auditor',
    description: 'React, state, forms and UI review',
    icon: '🎨',
    color: '#ec4899',
  },
  {
    id: 'backend-auditor-agent',
    name: 'Backend Auditor',
    description: 'API, routing and database review',
    icon: '⚙️',
    color: '#6366f1',
  },
  {
    id: 'security-auditor-agent',
    name: 'Security Auditor',
    description: 'Secrets, auth and vulnerability review',
    icon: '🔒',
    color: '#f43f5e',
  },
]

export function getAgent(id: AgentId | string | undefined): AgentOption {
  return AGENTS.find(a => a.id === id) ?? AGENTS[0]
}

// ============================================================
// Time grouping helpers
// ============================================================

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function getGroup(ts: number): string {
  const TODAY = startOfDay(Date.now())
  const YESTERDAY = TODAY - 86_400_000
  const WEEK_AGO = TODAY - 7 * 86_400_000
  const d = startOfDay(ts)
  if (d >= TODAY) return 'Today'
  if (d >= YESTERDAY) return 'Yesterday'
  if (d >= WEEK_AGO) return 'Previous 7 days'
  return 'Older'
}

// ============================================================
// Props
// ============================================================

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  sidebarOpen: boolean
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onCloseSidebar: () => void
}

// ============================================================
// Sidebar — history only (agent switching lives in the chat
// header so the dropdown can never cover the history list)
// ============================================================

export default function Sidebar({
  conversations,
  activeId,
  sidebarOpen,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onCloseSidebar,
}: SidebarProps) {
  const [query, setQuery] = React.useState('')
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => c.title.toLowerCase().includes(q))
  }, [conversations, query])

  // Group conversations (sorted newest first)
  const groups = React.useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt)
    const map: Record<string, Conversation[]> = {}
    for (const c of sorted) {
      const g = getGroup(c.updatedAt)
      if (!map[g]) map[g] = []
      map[g].push(c)
    }
    return ['Today', 'Yesterday', 'Previous 7 days', 'Older']
      .map(label => ({ label, items: map[label] ?? [] }))
      .filter(g => g.items.length > 0)
  }, [filtered])

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={onCloseSidebar} aria-hidden="true" />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`} aria-label="Chat history">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">✦</span>
            <span className="sidebar-logo-name">Nexus AI</span>
          </div>
          <button className="sidebar-close-btn" onClick={onCloseSidebar} aria-label="Close sidebar">
            ✕
          </button>
        </div>

        {/* New Chat */}
        <button className="new-chat-btn" onClick={onNewChat} id="new-chat-button">
          <span className="new-chat-icon">+</span>
          <span>New chat</span>
        </button>

        {/* Search */}
        <div className="history-search">
          <span className="history-search-icon" aria-hidden="true">⌕</span>
          <input
            className="history-search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
          />
          {query && (
            <button className="history-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        {/* Chat history — always visible, scrollable */}
        <div className="chat-history">
          <p className="sidebar-section-label">Chats · {conversations.length}</p>

          {conversations.length === 0 && (
            <p className="history-empty">No conversations yet.<br />Start a new chat!</p>
          )}

          {conversations.length > 0 && filtered.length === 0 && (
            <p className="history-empty">No chats match “{query}”.</p>
          )}

          {groups.map(group => (
            <div key={group.label} className="history-group">
              <p className="history-group-label">{group.label}</p>
              {group.items.map(conv => {
                const agent = getAgent(conv.agentId)
                const isActive = conv.id === activeId
                return (
                  <div
                    key={conv.id}
                    className={`history-item ${isActive ? 'history-item--active' : ''}`}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelectConversation(conv.id)}
                    role="button"
                    tabIndex={0}
                    title={`${conv.title} — last used ${agent.name} · ${conv.messages.length} messages`}
                    onKeyDown={e => e.key === 'Enter' && onSelectConversation(conv.id)}
                  >
                    <span
                      className="history-item-agent"
                      style={{ background: `${agent.color}22`, borderColor: `${agent.color}55` }}
                    >
                      {agent.icon}
                    </span>
                    <span className="history-item-text">
                      <span className="history-item-title">{conv.title}</span>
                      <span className="history-item-sub">
                        {agent.name} · {conv.messages.length} msg
                      </span>
                    </span>
                    {(hoveredId === conv.id || isActive) && (
                      <button
                        className="history-item-delete"
                        onClick={e => {
                          e.stopPropagation()
                          onDeleteConversation(conv.id)
                        }}
                        aria-label={`Delete "${conv.title}"`}
                        title="Delete chat"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <span className="sidebar-footer-dot" />
            <span>Mastra powered · multi-agent chat</span>
          </div>
        </div>
      </aside>
    </>
  )
}
