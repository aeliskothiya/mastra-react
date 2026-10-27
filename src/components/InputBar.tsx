import * as React from 'react'
import type { AttachedFile } from '../types/chat'

// ============================================================
// Constants
// ============================================================

const ACCEPTED_TYPES = [
  'image/*',
  'video/*',
  'application/pdf',
  'text/*',
  'application/json',
  'application/javascript',
  'application/typescript',
].join(',')

const MAX_FILE_SIZE = 20 * 1024 * 1024  // 20 MB

// ============================================================
// Props
// ============================================================

interface InputBarProps {
  value: string
  files: AttachedFile[]
  isLoading: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onAddFiles: (files: AttachedFile[]) => void
  onRemoveFile: (id: string) => void
  onSubmit: () => void
}

// ============================================================
// Component
// ============================================================

export default function InputBar({
  value,
  files,
  isLoading,
  disabled,
  onChange,
  onAddFiles,
  onRemoveFile,
  onSubmit,
}: InputBarProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  // Handle keyboard submit
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSubmit() {
    if (!value.trim() && files.length === 0) return
    if (isLoading || disabled) return
    onSubmit()
  }

  // Process picked / dropped files
  async function processFiles(rawFiles: File[]): Promise<void> {
    const processed: AttachedFile[] = []
    for (const file of rawFiles) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" exceeds the 20 MB limit.`)
        continue
      }
      const dataUrl = await readAsDataUrl(file)
      processed.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl,
        isImage: file.type.startsWith('image/'),
      })
    }
    if (processed.length > 0) onAddFiles(processed)
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    processFiles(picked)
    e.target.value = ''  // reset input
  }

  // Drag and drop
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    processFiles(dropped)
  }

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !isLoading && !disabled

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className={`input-bar-wrapper ${dragOver ? 'input-bar-wrapper--drag' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* File chips */}
      {files.length > 0 && (
        <div className="file-chips" aria-label="Attached files">
          {files.map(file => (
            <div key={file.id} className="file-chip">
              {file.isImage ? (
                <img src={file.dataUrl} alt={file.name} className="file-chip-preview" />
              ) : (
                <span className="file-chip-icon">📄</span>
              )}
              <div className="file-chip-info">
                <span className="file-chip-name">{file.name}</span>
                <span className="file-chip-size">{formatBytes(file.size)}</span>
              </div>
              <button
                className="file-chip-remove"
                onClick={() => onRemoveFile(file.id)}
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="input-row">
        {/* Attach button */}
        <button
          type="button"
          className="input-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled}
          aria-label="Attach file"
          title="Attach file (images, video, PDF, text)"
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-hidden="true"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="input-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Waiting for response…' : 'Message Nexus AI… (Shift+Enter for new line)'}
          disabled={isLoading || disabled}
          rows={1}
          aria-label="Chat message"
          aria-multiline="true"
        />

        {/* Send button */}
        <button
          type="button"
          id="send-message-btn"
          className={`input-send-btn ${canSubmit ? 'input-send-btn--active' : ''}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="input-loading-ring" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={18} height={18}>
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay" aria-live="polite">
          Drop files here
        </div>
      )}
    </div>
  )
}
