import * as React from 'react'
import type { Message } from '../types/chat'

// ============================================================
// Simple markdown renderer (no external deps)
// ============================================================

function renderMarkdown(raw: string): string {
  let html = raw
    // Escape HTML (prevent XSS from AI output)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
    return `<div class="code-block-wrapper"><div class="code-block-header">${langLabel}<button class="code-copy-btn" data-code="${encodeURIComponent(code.trim())}">Copy</button></div><pre class="code-block"><code>${code.trim()}</code></pre></div>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr">')

  // Unordered list
  html = html.replace(/^[*-] (.+)$/gm, '<li class="md-li">$1</li>')
  html = html.replace(/(<li class="md-li">.*<\/li>)/s, '<ul class="md-ul">$1</ul>')

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-li">$1</li>')

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Paragraphs — double newlines
  html = html
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<(h[1-3]|ul|ol|li|pre|blockquote|div|hr)/.test(trimmed)) return trimmed
      return `<p class="md-p">${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  return html
}

// ============================================================
// Copy button handler — attached via event delegation
// ============================================================

function attachCopyHandlers(container: HTMLElement | null): void {
  if (!container) return
  container.querySelectorAll<HTMLButtonElement>('.code-copy-btn').forEach(btn => {
    btn.onclick = () => {
      const code = decodeURIComponent(btn.dataset.code ?? '')
      navigator.clipboard.writeText(code).then(() => {
        const prev = btn.textContent
        btn.textContent = 'Copied!'
        setTimeout(() => { btn.textContent = prev }, 1500)
      })
    }
  })
}

// ============================================================
// Props
// ============================================================

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  agentName: string
  agentIcon: string
  agentColor?: string
}

// ============================================================
// Component
// ============================================================

export default function MessageBubble({ message, isStreaming, agentName, agentIcon, agentColor }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Track time elapsed
  const [endTime, setEndTime] = React.useState<number | null>(null)
  const [activeElapsed, setActiveElapsed] = React.useState(0)

  React.useEffect(() => {
    if (isStreaming && !isUser) {
      const interval = setInterval(() => {
        setActiveElapsed(Math.floor((Date.now() - message.timestamp) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    } else if (!isStreaming && !isUser && !endTime) {
      // Just finished
      setEndTime(Date.now())
    }
  }, [isStreaming, isUser, message.timestamp, endTime])

  // Attach copy handlers whenever content changes
  React.useEffect(() => {
    attachCopyHandlers(contentRef.current)
  }, [message.content])

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Parse Metadata from content
  let rawContent = message.content || ''
  
  const modelMatch = rawContent.match(/__META_MODEL__(.+?)__\n?/)
  let modelName = ''
  if (modelMatch) {
    modelName = modelMatch[1]
    rawContent = rawContent.replace(modelMatch[0], '')
  }

  const toolMatches = [...rawContent.matchAll(/__META_TOOL__(.+?)__\n?/g)]
  const tools = toolMatches.map(m => m[1])
  rawContent = rawContent.replace(/__META_TOOL__(.+?)__\n?/g, '')

  return (
    <article
      className={`bubble-wrapper ${isUser ? 'bubble-wrapper--user' : 'bubble-wrapper--assistant'}`}
      aria-label={`${isUser ? 'Your message' : `${agentName} response`}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          className="bubble-avatar"
          aria-hidden="true"
          style={agentColor ? { background: `${agentColor}22`, borderColor: `${agentColor}66` } : undefined}
        >
          <span>{agentIcon}</span>
        </div>
      )}

      <div className="bubble-body">
        {/* Sender label */}
        <div className="bubble-meta">
          <span
            className="bubble-sender"
            style={agentColor && !isUser ? { color: agentColor } : undefined}
          >
            {isUser ? 'You' : `${agentIcon} ${agentName}`}
          </span>
          <span className="bubble-time">{timestamp}</span>
        </div>

        {/* File previews for user messages */}
        {isUser && message.files && message.files.length > 0 && (
          <div className="bubble-files">
            {message.files.map(file => (
              <div key={file.id} className="bubble-file-chip">
                {file.isImage ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="bubble-file-image"
                  />
                ) : (
                  <div className="bubble-file-doc">
                    <span className="bubble-file-icon">📄</span>
                    <span className="bubble-file-name">{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="bubble bubble--user">
            <p className="bubble-text">{rawContent}</p>
          </div>
        ) : (
          <div className="bubble bubble--assistant">
            {/* Metadata Header */}
            {(modelName || tools.length > 0 || isStreaming || endTime) && (
              <div className="bubble-agent-metadata" style={{
                fontSize: '0.75rem',
                opacity: 0.7,
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {modelName && <div>🤖 Model: <code>{modelName}</code></div>}
                {tools.map((t, i) => (
                  <div key={i}>🛠️ Agent running: <code>{t}</code></div>
                ))}
                {isStreaming && <div>⏱️ Working... {activeElapsed}s</div>}
                {!isStreaming && endTime && <div>✅ Finished in {Math.floor((endTime - message.timestamp) / 1000)}s</div>}
              </div>
            )}

            {isStreaming && !rawContent ? (
              <div className="typing-indicator" aria-label="Thinking">
                <span /><span /><span />
              </div>
            ) : (
              <div
                ref={contentRef}
                className="bubble-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
              />
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="bubble-avatar bubble-avatar--user" aria-hidden="true">
          <span>👤</span>
        </div>
      )}
    </article>
  )
}
