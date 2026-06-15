import { useState, useEffect, useRef, useCallback } from 'react'
import { graphApi } from '../api/client.js'

const NODE_COLORS = {
  Paper:   '#4a6fa5',
  Author:  '#5d9e72',
  Keyword: '#c8a951',
  Concept: '#c8a951',
  Unknown: '#6e6a5f',
}
const NODE_RADII = { Paper: 10, Author: 7, Keyword: 5, Concept: 5, Unknown: 6 }

function forceLayout(nodes, edges, w, h, iters = 200) {
  const pos = {}
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const r = Math.min(w, h) * 0.34
    pos[n.id] = { x: w / 2 + r * Math.cos(angle), y: h / 2 + r * Math.sin(angle), vx: 0, vy: 0 }
  })

  for (let iter = 0; iter < iters; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos[nodes[i].id], b = pos[nodes[j].id]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = 3000 / (dist * dist)
        const fx = (dx / dist) * force, fy = (dy / dist) * force
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }
    // Attraction
    edges.forEach(e => {
      const a = pos[e.source], b = pos[e.target]
      if (!a || !b) return
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - 80) * 0.03
      const fx = (dx / dist) * force, fy = (dy / dist) * force
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    })
    // Center gravity
    nodes.forEach(n => {
      const p = pos[n.id]
      p.vx += (w / 2 - p.x) * 0.003
      p.vy += (h / 2 - p.y) * 0.003
    })
    // Apply + dampen
    nodes.forEach(n => {
      const p = pos[n.id]
      p.x += p.vx * 0.4; p.y += p.vy * 0.4
      p.vx *= 0.7; p.vy *= 0.7
      p.x = Math.max(20, Math.min(w - 20, p.x))
      p.y = Math.max(20, Math.min(h - 20, p.y))
    })
  }
  return pos
}

export default function GraphView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [positions, setPositions] = useState({})
  const [selected, setSelected] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [search, setSearch] = useState('')
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  async function load() {
    setLoading(true); setError(''); setSelected(null)
    try {
      const d = await graphApi.overview()
      setData(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!wrapRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: width, h: height })
    })
    obs.observe(wrapRef.current)
    const r = wrapRef.current.getBoundingClientRect()
    setDims({ w: r.width, h: r.height })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (data && data.nodes.length && dims.w > 0) {
      setPositions(forceLayout(data.nodes, data.edges, dims.w, dims.h))
    }
  }, [data, dims])

  const filteredNodes = data?.nodes.filter(n =>
    !search || n.label.toLowerCase().includes(search.toLowerCase()) || n.type.toLowerCase().includes(search.toLowerCase())
  ) ?? []
  const filteredIds = new Set(filteredNodes.map(n => n.id))

  const connectedIds = selected
    ? new Set(data?.edges.flatMap(e => e.source === selected || e.target === selected ? [e.source, e.target] : []) ?? [])
    : null

  function nodeOpacity(id) {
    if (search && !filteredIds.has(id)) return 0.1
    if (connectedIds && !connectedIds.has(id) && id !== selected) return 0.2
    return 1
  }
  function edgeOpacity(e) {
    if (connectedIds && !(e.source === selected || e.target === selected)) return 0.04
    return 0.25
  }

  const legendTypes = [...new Set(data?.nodes.map(n => n.type) ?? [])]

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <span className="graph-toolbar-title">Knowledge Graph</span>
        {data && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        )}
        <input
          className="graph-search"
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="graph-refresh-btn" onClick={load}>
          <RefreshIcon /> Refresh
        </button>
      </div>

      <div className="graph-canvas-wrap" ref={wrapRef} onClick={() => { setSelected(null); setTooltip(null) }}>
        {loading && (
          <div className="loading-full" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" />
            Loading knowledge graph…
          </div>
        )}
        {error && (
          <div className="loading-full" style={{ color: '#c07070' }}>
            Failed to load: {error}
          </div>
        )}
        {!loading && !error && data && (
          <svg ref={svgRef} className="graph-svg">
            {/* Edges */}
            <g>
              {data.edges.map((e, i) => {
                const a = positions[e.source], b = positions[e.target]
                if (!a || !b) return null
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="#c8a951"
                    strokeWidth={connectedIds && (e.source === selected || e.target === selected) ? 1.5 : .8}
                    strokeOpacity={edgeOpacity(e)}
                  />
                )
              })}
            </g>
            {/* Nodes */}
            <g>
              {data.nodes.map(n => {
                const p = positions[n.id]
                if (!p) return null
                const color = NODE_COLORS[n.type] || NODE_COLORS.Unknown
                const r = NODE_RADII[n.type] || 6
                const isSelected = n.id === selected
                const op = nodeOpacity(n.id)
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    style={{ cursor: 'pointer', opacity: op, transition: 'opacity .15s' }}
                    onClick={ev => { ev.stopPropagation(); setSelected(isSelected ? null : n.id); setTooltip(null) }}
                    onMouseEnter={ev => {
                      setTooltip({ id: n.id, label: n.label, type: n.type, x: p.x, y: p.y })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {isSelected && (
                      <circle r={r + 5} fill={color} fillOpacity=".15" />
                    )}
                    <circle
                      r={r}
                      fill={color}
                      fillOpacity={.85}
                      stroke={isSelected ? '#e6c76a' : color}
                      strokeWidth={isSelected ? 2 : .8}
                      strokeOpacity={isSelected ? 1 : .4}
                    />
                    {(n.type === 'Paper' || isSelected) && (
                      <text
                        y={r + 10}
                        textAnchor="middle"
                        fill="#dedad0"
                        fontSize="9"
                        fillOpacity=".7"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {n.label.length > 22 ? n.label.slice(0, 22) + '…' : n.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        )}

        {tooltip && positions[tooltip.id] && (
          <div
            className="graph-node-tooltip"
            style={{
              left: Math.min(positions[tooltip.id].x + 14, dims.w - 240),
              top: Math.max(positions[tooltip.id].y - 30, 8),
            }}
          >
            <div className="tooltip-type">{tooltip.type}</div>
            {tooltip.label}
          </div>
        )}

        {legendTypes.length > 0 && (
          <div className="graph-legend">
            {legendTypes.map(t => (
              <div className="legend-item" key={t}>
                <div className="legend-dot" style={{ background: NODE_COLORS[t] || NODE_COLORS.Unknown }} />
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10.5 6A4.5 4.5 0 112.5 3.5" strokeLinecap="round"/>
    <path d="M2.5 1v2.5H5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
