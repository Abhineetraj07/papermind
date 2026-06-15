import LogoMark from './LogoMark.jsx'

export default function Sidebar({
  sessions, activeSession, onSelectSession, onNewSession,
  onViewChange, currentView, onUpload, onIngest, userEmail, onLogout,
}) {
  function relTime(ts) {
    const diff = Date.now() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <LogoMark size={28} />
          <span className="logo-wordmark">Paper<em>Mind</em></span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        {[
          { key: 'chat',    label: 'Chat',   Icon: ChatIcon },
          { key: 'graph',   label: 'Graph',  Icon: GraphIcon },
          { key: 'library', label: 'Library',Icon: LibraryIcon },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`sidebar-nav-btn${currentView === key ? ' active' : ''}`}
            onClick={() => onViewChange(key)}
          >
            <Icon />{label}
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <button className="new-session-btn" onClick={onNewSession}>
          <PlusIcon /> New Session
        </button>

        {sessions.length > 0 && (
          <>
            <span className="sidebar-section-label">Recent</span>
            {sessions.map(s => (
              <div
                key={s.id}
                className={`session-item${activeSession === s.id ? ' active' : ''}`}
                onClick={() => onSelectSession(s.id)}
              >
                <div className="session-title">{s.title}</div>
                <div className="session-time">{relTime(s.createdAt)}</div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-actions">
        <button className="sidebar-action-btn" onClick={onUpload}>
          <UploadIcon /> Upload PDF
        </button>
        <button className="sidebar-action-btn" onClick={onIngest}>
          <DownloadIcon /> Ingest arXiv
        </button>
      </div>

      <div className="sidebar-user">
        <span className="sidebar-email">{userEmail}</span>
        <button className="logout-btn" onClick={onLogout}>Sign out</button>
      </div>
    </aside>
  )
}

const ChatIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1.5 4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0114.5 4v6A1.5 1.5 0 0113 11.5H5.5L2 14V4z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const GraphIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2"/>
    <circle cx="2.5" cy="4" r="1.5"/>
    <circle cx="13.5" cy="4" r="1.5"/>
    <circle cx="2.5" cy="12" r="1.5"/>
    <circle cx="13.5" cy="12" r="1.5"/>
    <line x1="6" y1="6.8" x2="4" y2="5.2"/>
    <line x1="10" y1="6.8" x2="12" y2="5.2"/>
    <line x1="6" y1="9.2" x2="4" y2="10.8"/>
    <line x1="10" y1="9.2" x2="12" y2="10.8"/>
  </svg>
)
const LibraryIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="5.5" height="7" rx=".75"/>
    <rect x="8.5" y="5" width="5.5" height="9" rx=".75"/>
    <line x1="2" y1="13" x2="14" y2="13" strokeOpacity=".5"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="7" y1="2" x2="7" y2="12"/>
    <line x1="2" y1="7" x2="12" y2="7"/>
  </svg>
)
const UploadIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 9V2M4 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10v1.5A.5.5 0 002.5 12h9a.5.5 0 00.5-.5V10" strokeLinecap="round"/>
  </svg>
)
const DownloadIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2v7M4 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10v1.5A.5.5 0 002.5 12h9a.5.5 0 00.5-.5V10" strokeLinecap="round"/>
  </svg>
)
