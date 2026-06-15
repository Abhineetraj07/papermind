import { useState, useRef, useEffect } from 'react'
import { queryApi } from '../api/client.js'
import SourcePanel from './SourcePanel.jsx'

const HINTS = [
  'What is retrieval-augmented generation?',
  'List all authors in the knowledge graph',
  'Who wrote AR-RAG and what does it solve?',
  'What are the main challenges in RAG systems?',
]

export default function ChatView({ session, onTitleUpdate, onMessagesUpdate, onNewSession }) {
  const [messages, setMessages] = useState(session?.messages || [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [panelData, setPanelData] = useState(null) // { sources, scores, retries }
  const [showPanel, setShowPanel] = useState(false)
  const threadRef = useRef(null)
  const textareaRef = useRef(null)
  const sessionId = useRef(session?.id || crypto.randomUUID())

  useEffect(() => {
    if (session) {
      setMessages(session.messages || [])
      sessionId.current = session.id
    }
  }, [session?.id])

  useEffect(() => {
    onMessagesUpdate?.(messages)
  }, [messages])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, loading])

  function autoResize(e) {
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  async function submit(question) {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    if (!session) {
      onNewSession?.()
      return
    }

    const userMsg = { role: 'user', content: q }
    const next = [...messages, userMsg]
    setMessages(next)

    if (messages.length === 0) {
      onTitleUpdate?.(q.length > 48 ? q.slice(0, 48) + '…' : q)
    }

    setLoading(true)
    setShowPanel(false)

    try {
      const data = await queryApi.ask({ question: q, session_id: sessionId.current })
      const assistantMsg = {
        role: 'assistant',
        content: data.answer,
        scores: data.scores,
        retries: data.retries,
        sources: data.sources,
      }
      setMessages(prev => [...prev, assistantMsg])
      setPanelData({ sources: data.sources, scores: data.scores, retries: data.retries })
      setShowPanel(true)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  function scoreBadgeClass(v) {
    if (v >= 0.75) return 'good'
    if (v >= 0.55) return 'warn'
    return 'bad'
  }

  const isEmpty = messages.length === 0

  return (
    <div className="chat-view">
      <div className="message-column">
        {isEmpty ? (
          <div className="empty-state">
            <div className="empty-graph-container">
              <GraphEmptyState />
            </div>
            <p className="empty-tagline">Query your research archive</p>
            <div className="empty-hints">
              {HINTS.map(h => (
                <button key={h} className="hint-chip" onClick={() => submit(h)}>{h}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list" ref={threadRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`message message-${msg.role}`}>
                <div className="message-bubble">
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.scores && (
                  <div className="message-meta">
                    <span className="message-label">PaperMind</span>
                    <div className="message-scores">
                      <span className={`score-badge ${scoreBadgeClass(msg.scores.context_relevance)}`}>
                        ctx {(msg.scores.context_relevance * 100).toFixed(0)}%
                      </span>
                      <span className={`score-badge ${scoreBadgeClass(msg.scores.faithfulness)}`}>
                        faith {(msg.scores.faithfulness * 100).toFixed(0)}%
                      </span>
                      <span className={`score-badge ${scoreBadgeClass(msg.scores.answer_relevance)}`}>
                        rel {(msg.scores.answer_relevance * 100).toFixed(0)}%
                      </span>
                      {msg.retries > 0 && (
                        <span className="retry-badge">↺ {msg.retries} retr.</span>
                      )}
                    </div>
                  </div>
                )}
                {msg.role === 'user' && <span className="message-label" style={{ textAlign: 'right', display: 'block', paddingRight: 4 }}>You</span>}
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="query-input-area">
          {!session && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
              Start a new session to begin querying →{' '}
              <button onClick={onNewSession} style={{ color: 'var(--gold)', textDecoration: 'underline', cursor: 'pointer' }}>
                New Session
              </button>
            </p>
          )}
          <div className="query-form">
            <textarea
              ref={textareaRef}
              className="query-textarea"
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(e) }}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  submit(input)
                }
              }}
              placeholder="Ask anything about your research papers…"
              disabled={loading || !session}
            />
            <button
              className="query-send-btn"
              onClick={() => submit(input)}
              disabled={loading || !input.trim() || !session}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
          <p className="query-hint">⌘ Enter to send</p>
        </div>
      </div>

      {panelData && (
        <SourcePanel
          sources={panelData.sources}
          scores={panelData.scores}
          retries={panelData.retries}
          visible={showPanel}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 9h14M9 2l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function GraphEmptyState() {
  const nodes = [
    { cx: 110, cy: 100, r: 7, delay: 0 },
    { cx: 55,  cy: 60,  r: 4, delay: .4 },
    { cx: 165, cy: 55,  r: 4, delay: .8 },
    { cx: 30,  cy: 130, r: 4, delay: 1.2 },
    { cx: 190, cy: 140, r: 4, delay: .6 },
    { cx: 110, cy: 175, r: 4, delay: 1.0 },
    { cx: 75,  cy: 165, r: 3, delay: 1.4 },
  ]
  const edges = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[1,6],[5,6],
  ]

  return (
    <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {edges.map(([a,b], i) => (
        <line
          key={i}
          x1={nodes[a].cx} y1={nodes[a].cy}
          x2={nodes[b].cx} y2={nodes[b].cy}
          stroke="#c8a951"
          strokeWidth=".8"
          style={{ animation: `edgePulse 2.4s ease ${i * .2}s infinite` }}
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.cx} cy={n.cy} r={n.r}
          fill={i === 0 ? '#c8a951' : 'none'}
          stroke="#c8a951"
          strokeWidth={i === 0 ? 0 : 1}
          fillOpacity={i === 0 ? .7 : 0}
          style={{ animation: `nodeFloat ${2.5 + i * .3}s ease ${n.delay}s infinite` }}
        />
      ))}
    </svg>
  )
}
