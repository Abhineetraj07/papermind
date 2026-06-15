export default function SourcePanel({ sources, scores, retries, visible, onClose }) {
  function scoreLevel(v) {
    if (v >= 0.75) return 'high'
    if (v >= 0.55) return 'mid'
    return 'low'
  }

  const meters = [
    { label: 'Context Relevance', key: 'context_relevance', value: scores?.context_relevance ?? 0 },
    { label: 'Faithfulness',      key: 'faithfulness',      value: scores?.faithfulness ?? 0 },
    { label: 'Answer Relevance',  key: 'answer_relevance',  value: scores?.answer_relevance ?? 0 },
  ]

  return (
    <aside className={`source-panel${visible ? '' : ' hidden'}`}>
      <div className="source-panel-inner">
        <div className="source-panel-head">
          <span className="source-panel-title">Provenance</span>
          <button className="source-close-btn" onClick={onClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
              <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
            </svg>
          </button>
        </div>

        <div className="source-panel-body">
          {/* Score Meters */}
          <div className="scores-section">
            <span className="sources-label">Quality Scores</span>
            {meters.map(({ label, key, value }, i) => (
              <div className="score-row" key={key} style={{ animationDelay: `${i * .1}s` }}>
                <div className="score-row-head">
                  <span className="score-name">{label}</span>
                  <span className="score-value">{(value * 100).toFixed(0)}%</span>
                </div>
                <div className="score-track">
                  <div
                    className={`score-fill ${scoreLevel(value)}`}
                    style={{ width: `${(value * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className={`hallucination-flag ${scores?.hallucination_detected ? 'flagged' : 'clean'}`}>
              {scores?.hallucination_detected ? (
                <><FlagIcon />Hallucination detected</>
              ) : (
                <><CheckIcon />No hallucination detected</>
              )}
            </div>

            {retries > 0 && (
              <p style={{ fontSize: 11, color: 'var(--gold-dim)' }}>
                ↺ {retries} self-correction{retries > 1 ? 's' : ''} applied
              </p>
            )}
          </div>

          {/* Sources */}
          {sources && sources.length > 0 && (
            <div className="sources-section">
              <span className="sources-label">Sources · {sources.length}</span>
              {sources.map((s, i) => (
                <div className="source-card" key={i} style={{ animationDelay: `${i * .07}s` }}>
                  <div className="source-card-head">
                    <span className={`source-type-tag ${s.source}`}>
                      {s.source === 'user_upload' ? 'PDF' : s.source === 'graph' ? 'Graph' : 'arXiv'}
                    </span>
                  </div>
                  <p className="source-title">{s.title || 'Untitled'}</p>
                  {s.chunk_text && (
                    <p className="source-snippet">{s.chunk_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const FlagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 10V2" strokeLinecap="round"/>
    <path d="M3 2h7L8 5.5l2 3.5H3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
