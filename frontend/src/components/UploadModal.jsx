import { useState, useRef } from 'react'
import { documentsApi } from '../api/client.js'

export default function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [dragover, setDragover] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    if (!f.name.endsWith('.pdf')) { setError('Only PDF files are accepted'); return }
    setError('')
    setFile(f)
  }

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true); setError('')
    try {
      await documentsApi.upload(file)
      onSuccess()
    } catch (e) {
      setError(e.message || 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Upload PDF</h2>

        <div
          className={`dropzone${dragover ? ' dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={e => { e.preventDefault(); setDragover(false); handleFile(e.dataTransfer.files[0]) }}
        >
          <div className="dropzone-icon">
            <UploadIcon />
          </div>
          <p className="dropzone-text">Drop your PDF here, or click to browse</p>
          <p className="dropzone-hint">Max 20 MB · PDF only</p>
          {file && <p className="dropzone-selected">✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {error && <p className="auth-error" style={{ marginBottom: 12 }}>{error}</p>}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Uploading…' : 'Upload & Process'}
          </button>
        </div>

        {uploading && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>
            Processing in background — you can close this and query the document shortly.
          </p>
        )}
      </div>
    </div>
  )
}

const UploadIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" color="var(--text-secondary)">
    <path d="M18 24V10M11 17l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 26v2.5A1.5 1.5 0 007.5 30h21a1.5 1.5 0 001.5-1.5V26" strokeLinecap="round"/>
  </svg>
)
