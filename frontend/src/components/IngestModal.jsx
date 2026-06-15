import { useState, useEffect, useRef } from 'react'
import { ingestApi } from '../api/client.js'

export default function IngestModal({ onClose }) {
  const [topic, setTopic] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleIngest() {
    if (!topic.trim() || loading) return
    setLoading(true); setError(''); setJobStatus(null)
    try {
      const data = await ingestApi.start(topic.trim(), maxResults)
      setJobId(data.job_id)
      pollRef.current = setInterval(async () => {
        try {
          const status = await ingestApi.status(data.job_id)
          setJobStatus(status)
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollRef.current)
            setLoading(false)
          }
        } catch {}
      }, 2000)
    } catch (e) {
      setError(e.message || 'Ingestion failed')
      setLoading(false)
    }
  }

  const statusClass = jobStatus?.status === 'completed' ? 'completed' : jobStatus?.status === 'failed' ? 'failed' : 'running'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Ingest arXiv Papers</h2>

        <div className="ingest-field">
          <div className="field">
            <label className="field-label">Research Topic</label>
            <input
              className="field-input"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. retrieval augmented generation"
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && handleIngest()}
            />
          </div>
        </div>

        <div className="ingest-field">
          <div className="field">
            <label className="field-label">Papers to fetch</label>
            <div className="range-row">
              <input
                type="range" min={3} max={20} value={maxResults}
                className="range-input"
                onChange={e => setMaxResults(Number(e.target.value))}
                disabled={loading}
              />
              <span className="range-value">{maxResults}</span>
            </div>
          </div>
        </div>

        {error && <p className="auth-error" style={{ marginBottom: 12 }}>{error}</p>}

        {jobStatus && (
          <div className={`job-status ${statusClass}`}>
            {statusClass === 'running' && <div className="spinner" style={{ width: 12, height: 12 }} />}
            {statusClass === 'completed' && '✓'}
            {statusClass === 'failed' && '✕'}
            {jobStatus.status === 'completed'
              ? `Done · ${jobStatus.papers_processed} papers ingested`
              : jobStatus.status === 'failed'
              ? `Failed: ${jobStatus.error || 'unknown error'}`
              : `Processing… ${jobStatus.papers_processed} done`}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {jobStatus?.status === 'completed' ? 'Close' : 'Cancel'}
          </button>
          {!jobId && (
            <button className="btn-primary" onClick={handleIngest} disabled={!topic.trim() || loading}>
              {loading ? 'Starting…' : 'Ingest Papers'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
