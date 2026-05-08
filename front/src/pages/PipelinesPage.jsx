import { useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconPlay = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconDot = ({ color }) => (
  <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
);

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_PIPELINES = [
  {
    id: "pl_001",
    name: "postgres_orders_ingestion",
    source: "PostgreSQL → fusion_catalog.raw.orders",
    mode: "Incremental (CDC)",
    schedule: "Every hour",
    status: "success",
    lastRun: "2 min ago",
    duration: "1m 14s",
    runs: [
      { id: "r1", startedAt: "Today, 14:00", duration: "1m 14s", status: "success", rows: "12,441" },
      { id: "r2", startedAt: "Today, 13:00", duration: "1m 09s", status: "success", rows: "9,872" },
      { id: "r3", startedAt: "Today, 12:00", duration: "2m 01s", status: "failed",  rows: "—" },
      { id: "r4", startedAt: "Today, 11:00", duration: "1m 18s", status: "success", rows: "11,034" },
      { id: "r5", startedAt: "Today, 10:00", duration: "58s",    status: "success", rows: "8,210" },
    ],
  },
  {
    id: "pl_002",
    name: "postgres_users_full_refresh",
    source: "PostgreSQL → fusion_catalog.raw.users",
    mode: "Full refresh",
    schedule: "Daily",
    status: "running",
    lastRun: "Just now",
    duration: "—",
    runs: [
      { id: "r1", startedAt: "Today, 14:03", duration: "—",      status: "running", rows: "—" },
      { id: "r2", startedAt: "Yesterday, 14:00", duration: "3m 44s", status: "success", rows: "204,112" },
      { id: "r3", startedAt: "2 days ago, 14:00", duration: "3m 51s", status: "success", rows: "201,988" },
    ],
  },
  {
    id: "pl_003",
    name: "postgres_events_snapshot",
    source: "PostgreSQL → fusion_catalog.raw.events",
    mode: "Snapshot and merge",
    schedule: "Manual",
    status: "failed",
    lastRun: "1h ago",
    duration: "0m 32s",
    runs: [
      { id: "r1", startedAt: "Today, 13:12", duration: "32s", status: "failed",  rows: "—" },
      { id: "r2", startedAt: "Yesterday, 10:00", duration: "4m 22s", status: "success", rows: "1,204,441" },
    ],
  },
];

const STATUS_CONFIG = {
  success: { color: "#2ec995", bg: "rgba(26,158,110,0.10)", border: "rgba(26,158,110,0.25)", label: "Success" },
  running: { color: "#4a9eff", bg: "rgba(30,110,244,0.10)", border: "rgba(30,110,244,0.25)", label: "Running" },
  failed:  { color: "#f07070", bg: "rgba(217,79,79,0.10)",  border: "rgba(217,79,79,0.25)",  label: "Failed"  },
  paused:  { color: "#f0a347", bg: "rgba(200,125,32,0.10)", border: "rgba(200,125,32,0.25)", label: "Paused"  },
};

function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.paused;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: small ? "2px 8px" : "3px 10px",
      fontSize: small ? 11 : 12, fontWeight: 500, color: cfg.color,
    }}>
      <IconDot color={cfg.color} />
      {cfg.label}
    </span>
  );
}

function RunRow({ run }) {
  const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.paused;
  return (
    <div style={s.runRow}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 200px" }}>
        <IconDot color={cfg.color} />
        <span style={{ fontSize: 12, color: "#8b97b0" }}>{run.startedAt}</span>
      </div>
      <div style={{ flex: "0 0 80px" }}>
        <StatusBadge status={run.status} small />
      </div>
      <div style={{ flex: "0 0 80px", fontSize: 12, color: "#59647a", display: "flex", alignItems: "center", gap: 5 }}>
        <IconClock />{run.duration}
      </div>
      <div style={{ fontSize: 12, color: run.rows === "—" ? "#3d4a5c" : "#8b97b0", fontFamily: "'IBM Plex Mono', monospace" }}>
        {run.rows !== "—" ? `${run.rows} rows` : "—"}
      </div>
    </div>
  );
}

function PipelineRow({ pipeline }) {
  const [expanded, setExpanded] = useState(false);
  const [triggerState, setTriggerState] = useState("idle");

  const handleTrigger = (e) => {
    e.stopPropagation();
    setTriggerState("running");
    setTimeout(() => setTriggerState("idle"), 3000);
  };

  return (
    <div style={{ ...s.pipelineCard, ...(expanded ? s.pipelineCardOpen : {}) }}>
      {/* Header row */}
      <div style={s.pipelineHeader} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ color: "#3d4a5c", flexShrink: 0 }}><IconChevron open={expanded} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={s.pipelineName}>{pipeline.name}</div>
            <div style={s.pipelineSub}>{pipeline.source}</div>
          </div>
        </div>

        <div style={s.pipelineMeta}>
          <span style={s.metaTag}>{pipeline.mode}</span>
          <span style={s.metaTag}>{pipeline.schedule}</span>
          <StatusBadge status={pipeline.status} />
          <div style={{ fontSize: 11, color: "#59647a", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <IconClock />{pipeline.lastRun}
          </div>
          <button
            style={{ ...s.triggerBtn, ...(triggerState === "running" ? s.triggerBtnRunning : {}) }}
            onClick={handleTrigger}
            disabled={triggerState === "running"}
          >
            {triggerState === "running" ? <><div style={spinnerStyle} />Running</> : <><IconPlay />Trigger</>}
          </button>
        </div>
      </div>

      {/* Run history */}
      {expanded && (
        <div style={s.runHistory} className="fade-in">
          <div style={s.runHistoryHeader}>Run history</div>
          <div style={s.runTableHead}>
            <div style={{ flex: "0 0 200px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Started</div>
            <div style={{ flex: "0 0 80px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</div>
            <div style={{ flex: "0 0 80px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Duration</div>
            <div style={{ fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Rows loaded</div>
          </div>
          {pipeline.runs.map(run => <RunRow key={run.id} run={run} />)}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PipelinesPage() {
  const [filter, setFilter] = useState("all");
  const filters = ["all", "success", "running", "failed"];

  const filtered = filter === "all"
    ? MOCK_PIPELINES
    : MOCK_PIPELINES.filter(p => p.status === filter);

  return (
    <div style={s.page} className="fade-in">
      <div style={s.topBar}>
        <div style={s.breadcrumbs}>
          <span style={s.breadcrumbMuted}>Data Engineering</span>
          <span style={s.breadcrumbSep}>/</span>
          <span style={s.breadcrumbActive}>Pipelines</span>
        </div>
      </div>

      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Pipelines</h1>
          <p style={s.pageDesc}>Monitor and manage your active ingestion pipelines orchestrated by Airflow.</p>
        </div>
        <div style={s.headerStats}>
          <Stat label="Total" value={MOCK_PIPELINES.length} />
          <Stat label="Running" value={MOCK_PIPELINES.filter(p => p.status === "running").length} color="#4a9eff" />
          <Stat label="Failed" value={MOCK_PIPELINES.filter(p => p.status === "failed").length} color="#f07070" />
        </div>
      </div>

      <div style={s.toolbar}>
        <div style={s.filterTabs}>
          {filters.map(f => (
            <button
              key={f}
              style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button style={s.refreshBtn}>
          <IconRefresh /> Refresh
        </button>
      </div>

      <div style={s.list}>
        {filtered.length === 0
          ? <div style={s.empty}>No pipelines match this filter.</div>
          : filtered.map(p => <PipelineRow key={p.id} pipeline={p} />)
        }
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={s.stat}>
      <div style={{ ...s.statValue, color: color || "#e2e8f0" }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
const spinnerStyle = {
  width: 11, height: 11,
  border: "2px solid rgba(255,255,255,0.2)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
  flexShrink: 0,
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "0 32px 60px" },
  topBar: { height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 },
  breadcrumbs: { display: "flex", alignItems: "center", gap: 8 },
  breadcrumbMuted: { fontSize: 13, color: "#59647a" },
  breadcrumbSep:   { fontSize: 13, color: "#3d4a5c" },
  breadcrumbActive:{ fontSize: 13, color: "#8b97b0" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  pageTitle: { fontSize: 22, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em", marginBottom: 6 },
  pageDesc:  { fontSize: 13, color: "#8b97b0", lineHeight: 1.6, maxWidth: 520 },
  headerStats: { display: "flex", gap: 24, flexShrink: 0 },
  stat: { textAlign: "right" },
  statValue: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" },
  statLabel: { fontSize: 11, color: "#59647a", textTransform: "uppercase", letterSpacing: "0.07em" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  filterTabs: { display: "flex", gap: 2 },
  filterTab: {
    background: "transparent", border: "none", borderRadius: 6,
    padding: "5px 12px", fontSize: 12, color: "#8b97b0", cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  filterTabActive: { background: "rgba(30,110,244,0.10)", color: "#4a9eff" },
  refreshBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#8b97b0", cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  empty: { fontSize: 13, color: "#3d4a5c", padding: "32px 0", textAlign: "center" },
  pipelineCard: {
    background: "#13181f", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 8, overflow: "hidden", transition: "border-color 0.15s ease",
  },
  pipelineCardOpen: { borderColor: "rgba(30,110,244,0.25)" },
  pipelineHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", cursor: "pointer", gap: 16,
  },
  pipelineName: { fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3 },
  pipelineSub:  { fontSize: 11, color: "#59647a" },
  pipelineMeta: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  metaTag: {
    fontSize: 11, color: "#59647a", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "2px 7px",
    whiteSpace: "nowrap",
  },
  triggerBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "rgba(30,110,244,0.10)", border: "1px solid rgba(30,110,244,0.25)",
    borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 500,
    color: "#4a9eff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
    transition: "background 0.15s", whiteSpace: "nowrap",
  },
  triggerBtnRunning: {
    background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)",
    color: "#59647a", cursor: "not-allowed",
  },
  runHistory: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0 16px 14px" },
  runHistoryHeader: {
    fontSize: 11, fontWeight: 500, color: "#3d4a5c",
    textTransform: "uppercase", letterSpacing: "0.07em", padding: "12px 0 8px",
  },
  runTableHead: { display: "flex", gap: 0, padding: "0 0 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 },
  runRow: {
    display: "flex", alignItems: "center", gap: 0,
    padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
};
