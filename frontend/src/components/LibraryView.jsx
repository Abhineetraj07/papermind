import { useState, useEffect } from 'react'
import { documentsApi } from '../api/client.js'

export default function LibraryView() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await documentsApi.list()
      setDocs(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this document and its embeddings?')) return
    setDeleting(id)
    try {
      await documentsApi.delete(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      alert('Delete failed: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="library-view">
      <div className="library-toolbar">
        <span className="library-title">Document Library</span>
        <button
          onClick={load}
          style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', transition: 'all var(--t)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      <div className="library-content">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 60, color: 'var(--text-secondary)', fontSize: 13 }}>
            <div className="spinner" />
            Loading documents…
          </div>
        )}
        {error && (
          <div style={{ color: '#c07070', padding: 40, textAlign: 'center', fontSize: 13 }}>
            Failed to load: {error}
          </div>
        )}
        {!loading && !error && docs.length === 0 && (
          <div className="library-empty">
            <DocIcon />
            No documents yet — upload a PDF to get started
          </div>
        )}
        {!loading && docs.length > 0 && (
          <div className="doc-grid">
            {docs.map(doc => (
              <div className="doc-card" key={doc.id}>
                <div className="doc-icon"><DocIcon /></div>
                <p className="doc-name" title={doc.filename}>{doc.filename}</p>
                {doc.title && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'var(--font-display)', lineHeight: 1.4 }}>
                    {doc.title}
                  </p>
                )}
                <div className="doc-meta">
                  {doc.author && <span className="doc-meta-tag">{doc.author}</span>}
                  {doc.page_count && <span className="doc-meta-tag">{doc.page_count} pages</span>}
                  {doc.file_size_kb && <span className="doc-meta-tag">{doc.file_size_kb} KB</span>}
                </div>
                <button
                  className="doc-delete-btn"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                >
                  {deleting === doc.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2v4h4" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="7" y1="10" x2="13" y2="10" strokeLinecap="round"/>
    <line x1="7" y1="13" x2="11" y2="13" strokeLinecap="round"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10.5 6A4.5 4.5 0 112.5 3.5" strokeLinecap="round"/>
    <path d="M2.5 1v2.5H5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
