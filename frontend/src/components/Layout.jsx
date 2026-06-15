import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import ChatView from './ChatView.jsx'
import GraphView from './GraphView.jsx'
import LibraryView from './LibraryView.jsx'
import UploadModal from './UploadModal.jsx'
import IngestModal from './IngestModal.jsx'

export default function Layout({ userEmail, onLogout }) {
  const [view, setView] = useState('chat')
  const [modal, setModal] = useState(null) // 'upload' | 'ingest' | null
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [docsRefresh, setDocsRefresh] = useState(0)

  function createSession() {
    const id = crypto.randomUUID()
    const s = { id, title: 'New session', messages: [], createdAt: Date.now() }
    setSessions(prev => [s, ...prev])
    setActiveSession(id)
    setView('chat')
  }

  function updateSessionTitle(id, title) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
  }

  function updateSessionMessages(id, messages) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, messages } : s))
  }

  const currentSession = sessions.find(s => s.id === activeSession)

  return (
    <>
      <div className="app-layout">
        <Sidebar
          sessions={sessions}
          activeSession={activeSession}
          onSelectSession={id => { setActiveSession(id); setView('chat') }}
          onNewSession={createSession}
          onViewChange={setView}
          currentView={view}
          onUpload={() => setModal('upload')}
          onIngest={() => setModal('ingest')}
          userEmail={userEmail}
          onLogout={onLogout}
        />

        <main className="main-content">
          {view === 'chat' && (
            <ChatView
              session={currentSession}
              onTitleUpdate={t => activeSession && updateSessionTitle(activeSession, t)}
              onMessagesUpdate={msgs => activeSession && updateSessionMessages(activeSession, msgs)}
              onNewSession={createSession}
            />
          )}
          {view === 'graph' && <GraphView />}
          {view === 'library' && <LibraryView key={docsRefresh} />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-nav">
          <div className="mobile-nav-inner">
            {[
              { key: 'chat',    label: 'Chat',    icon: ChatIcon },
              { key: 'graph',   label: 'Graph',   icon: GraphIcon },
              { key: 'library', label: 'Library', icon: LibraryIcon },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} className={`mobile-nav-btn${view === key ? ' active' : ''}`} onClick={() => setView(key)}>
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {modal === 'upload' && (
        <UploadModal
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); setDocsRefresh(n => n + 1) }}
        />
      )}
      {modal === 'ingest' && (
        <IngestModal onClose={() => setModal(null)} />
      )}
    </>
  )
}

const ChatIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 2V5z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const GraphIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="2.5"/>
    <circle cx="3" cy="5" r="2"/>
    <circle cx="17" cy="5" r="2"/>
    <circle cx="3" cy="15" r="2"/>
    <circle cx="17" cy="15" r="2"/>
    <line x1="7.5" y1="8.5" x2="5" y2="6.8" strokeOpacity=".7"/>
    <line x1="12.5" y1="8.5" x2="15" y2="6.8" strokeOpacity=".7"/>
    <line x1="7.5" y1="11.5" x2="5" y2="13.2" strokeOpacity=".7"/>
    <line x1="12.5" y1="11.5" x2="15" y2="13.2" strokeOpacity=".7"/>
  </svg>
)
const LibraryIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="10" y="6" width="7" height="11" rx="1"/>
    <line x1="3" y1="16" x2="17" y2="16" strokeOpacity=".5"/>
  </svg>
)
