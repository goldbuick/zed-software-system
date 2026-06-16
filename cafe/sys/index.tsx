/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import { computedaglayout } from './daglayout'
import {
  type Audience,
  DIAGRAMS,
  DIAGRAM_LAYERS,
  type DiagramConfig,
  type DiagramLayer,
  FEATURE_DOMAINS,
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  TAB_LABELS,
  type Tab,
} from './data'

function audiencepill(audience: Audience) {
  const tone =
    audience === 'Dev'
      ? 'pill-info'
      : audience === 'Creator'
        ? 'pill-success'
        : 'pill-neutral'
  return <span className={`pill ${tone}`}>{audience}</span>
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function DiagramSvg({
  config,
  selectedid,
  onselect,
}: {
  config: DiagramConfig
  selectedid: string | null
  onselect: (id: string) => void
}) {
  const nodemap = new Map(config.nodes.map((node) => [node.id, node]))
  const layout = computedaglayout({
    nodes: config.nodes.map((node) => ({ id: node.id })),
    edges: config.edges,
    direction: config.direction,
    nodeWidth: config.nodeWidth ?? 180,
    nodeHeight: config.nodeHeight ?? 40,
    rankGap: 56,
    nodeGap: 24,
    padding: 32,
  })

  const nodewidth = config.nodeWidth ?? 180
  const nodeheight = config.nodeHeight ?? 40

  return (
    <div className="diagram-scroll">
      <svg
        width={layout.width}
        height={layout.height}
        style={{ minWidth: layout.width }}
        role="img"
        aria-label="System architecture diagram"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="var(--stroke-primary)" />
          </marker>
        </defs>
        {layout.ranks.map((rank) => (
          <rect
            key={`rank-${rank.rank}`}
            x={rank.x}
            y={rank.y}
            width={rank.width}
            height={rank.height}
            rx={4}
            fill="var(--bg-tertiary)"
            stroke="var(--stroke-tertiary)"
            strokeWidth={1}
          />
        ))}
        {layout.edges.map((edge) => (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={edge.sourceX}
            y1={edge.sourceY}
            x2={edge.targetX}
            y2={edge.targetY}
            stroke={
              edge.isBackEdge
                ? 'var(--stroke-secondary)'
                : 'var(--stroke-primary)'
            }
            strokeWidth={1.5}
            strokeDasharray={edge.isBackEdge ? '4 3' : undefined}
            markerEnd="url(#arrowhead)"
          />
        ))}
        {layout.nodes.map((pos) => {
          const node = nodemap.get(pos.id)
          if (!node) {
            return null
          }
          const selected = selectedid === pos.id
          return (
            <g
              key={pos.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onselect(pos.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onselect(pos.id)
                }
              }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={nodewidth}
                height={nodeheight}
                rx={4}
                fill={selected ? 'var(--accent-soft)' : 'var(--bg-elevated)'}
                stroke={selected ? 'var(--accent)' : 'var(--stroke-secondary)'}
                strokeWidth={selected ? 2 : 1}
              />
              <text
                x={pos.x + nodewidth / 2}
                y={pos.y + nodeheight / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-primary)"
                fontSize={11}
                fontFamily="system-ui, sans-serif"
              >
                {truncate(node.label, 28)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SystemMapView() {
  const [layer, setlayer] = useState<DiagramLayer>('stack')
  const [selectedid, setselectedid] = useState<string | null>(null)

  const config = DIAGRAMS[layer]
  const selected = config.nodes.find((node) => node.id === selectedid) ?? null

  return (
    <div className="stack stack-gap-16">
      <p className="text-secondary">
        Click any node for details. Switch layers to see product stack, worker
        topology, tick loop, or script pipeline.
      </p>
      <div className="row row-gap-8">
        {DIAGRAM_LAYERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn ${layer === item.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setlayer(item.id)
              setselectedid(null)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <DiagramSvg
        config={config}
        selectedid={selectedid}
        onselect={setselectedid}
      />
      {selected && (
        <div className="callout callout-info stack stack-gap-8">
          <div className="row row-gap-8">
            <span className="text-semibold">{selected.label}</span>
            {audiencepill(selected.audience)}
          </div>
          <p>{selected.definition}</p>
          {selected.path && (
            <p className="text-small text-tertiary">
              Source: <code>{selected.path}</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function GlossaryView() {
  const [search, setsearch] = useState('')
  const [category, setcategory] = useState('All')
  const [audfilter, setaudfilter] = useState<'all' | 'dev' | 'creator'>('all')
  const [expanded, setexpanded] = useState<string | null>(null)

  const query = search.toLowerCase().trim()
  const filtered = GLOSSARY.filter((entry) => {
    if (category !== 'All' && entry.category !== category) {
      return false
    }
    if (audfilter === 'dev' && entry.audience === 'Creator') {
      return false
    }
    if (audfilter === 'creator' && entry.audience === 'Dev') {
      return false
    }
    if (!query) {
      return true
    }
    return (
      entry.term.toLowerCase().includes(query) ||
      entry.definition.toLowerCase().includes(query) ||
      entry.related.toLowerCase().includes(query)
    )
  })

  return (
    <div className="stack stack-gap-16">
      <div className="row row-gap-12">
        <input
          className="input"
          value={search}
          onChange={(event) => setsearch(event.target.value)}
          placeholder="Search terms…"
        />
        <select
          className="select"
          value={category}
          onChange={(event) => setcategory(event.target.value)}
        >
          {GLOSSARY_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div className="row row-gap-8">
          <button
            type="button"
            className={`btn ${audfilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setaudfilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`btn ${audfilter === 'dev' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setaudfilter('dev')}
          >
            Dev
          </button>
          <button
            type="button"
            className={`btn ${audfilter === 'creator' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setaudfilter('creator')}
          >
            Creator
          </button>
        </div>
      </div>
      <p className="text-small text-tertiary">
        {filtered.length} of {GLOSSARY.length} terms
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Category</th>
              <th>Audience</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.term}>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setexpanded(expanded === entry.term ? null : entry.term)
                    }
                  >
                    {entry.term}
                  </button>
                </td>
                <td>{entry.category}</td>
                <td>{audiencepill(entry.audience)}</td>
                <td>
                  {truncate(
                    entry.definition,
                    expanded === entry.term ? 500 : 80,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expanded &&
        (() => {
          const entry = GLOSSARY.find((item) => item.term === expanded)
          if (!entry) {
            return null
          }
          return (
            <div className="callout callout-neutral stack stack-gap-8">
              <h3>{entry.term}</h3>
              <p>{entry.definition}</p>
              <p className="text-small text-secondary">
                Related: {entry.related}
              </p>
              {entry.path && (
                <p className="text-small text-tertiary">
                  Source: <code>{entry.path}</code>
                </p>
              )}
            </div>
          )
        })()}
    </div>
  )
}

function FeaturesView() {
  const totalfeatures = FEATURE_DOMAINS.reduce(
    (count, domain) => count + domain.features.length,
    0,
  )

  return (
    <div className="stack stack-gap-20">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">~150</div>
          <div className="stat-label">Firmware commands</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">34</div>
          <div className="stat-label">CLI commands</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">52</div>
          <div className="stat-label">Audio commands</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">4</div>
          <div className="stat-label">JS realms</div>
        </div>
      </div>
      <hr className="overview-divider" />
      {FEATURE_DOMAINS.map((domain) => (
        <details key={domain.title} className="collapsible" open>
          <summary>
            <span className={`swatch swatch-${domain.color}`} />
            {domain.title}
            <span className="collapsible-count">{domain.features.length}</span>
          </summary>
          <div className="collapsible-body">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Audience</th>
                    <th>Description</th>
                    <th>Entry point</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.features.map(([feat, aud, desc, entry]) => (
                    <tr key={`${domain.title}-${feat}`}>
                      <td>{feat}</td>
                      <td>{audiencepill(aud)}</td>
                      <td>{desc}</td>
                      <td>
                        <code>{entry}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ))}
      <p className="text-small text-tertiary">
        {totalfeatures} feature rows across {FEATURE_DOMAINS.length} domains.
        Sources: ops/docs/commands-summary.md, zss/**/docs/.
      </p>
    </div>
  )
}

function SystemOverview() {
  const [tab, settab] = useState<Tab>('map')

  return (
    <>
      <header className="overview-header">
        <h1>ZED Cafe / ZSS System Reference</h1>
        <p>
          Architecture diagrams, glossary, and feature inventory for the Zed
          Software System — ZZT-inspired fantasy terminal engine.
        </p>
      </header>

      <nav className="overview-nav">
        <div className="overview-tabs">
          {(Object.keys(TAB_LABELS) as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`btn ${tab === item ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => settab(item)}
            >
              {TAB_LABELS[item]}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <a className="btn btn-ghost" href="../">
          Open ZSS Cafe
        </a>
      </nav>

      <hr className="overview-divider" />

      {tab === 'map' && <SystemMapView />}
      {tab === 'glossary' && <GlossaryView />}
      {tab === 'features' && <FeaturesView />}
    </>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<SystemOverview />)
}
