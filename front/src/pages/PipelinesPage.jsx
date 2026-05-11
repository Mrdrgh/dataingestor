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

import { useEffect } from "react";
import { api } from "../api/endpoints";
import { useApi } from "../hooks/useApi";

const STATUS_CONFIG = {
  success: { color: "#2ec995", bg: "rgba(26,158,110,0.10)", border: "rgba(26,158,110,0.25)", label: "Success" },
  running: { color: "#4a9eff", bg: "rgba(30,110,244,0.10)", border: "rgba(30,110,244,0.25)", label: "Running" },
  failed:  { color: "#f07070", bg: "rgba(217,79,79,0.10)",  border: "rgba(217,79,79,0.25)",  label: "Failed"  },
  paused:  { color: "#f0a347", bg: "rgba(200,125,32,0.10)", border: "rgba(200,125,32,0.25)", label: "Paused"  },
  idle:    { color: "#8b97b0", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)", label: "Idle"  },
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

function RunHistory({ pipelineId }) {
  const { execute: fetchRuns, data: runsData, loading, error } = useApi(api.getPipelineRuns, true);
  
  useEffect(() => {
    fetchRuns(pipelineId).catch(() => {});
  }, [fetchRuns, pipelineId]);

  if (loading) return <div style={{ padding: "20px 16px", color: "#8b97b0", fontSize: 12 }}>Loading runs...</div>;
  if (error) return <div style={{ padding: "20px 16px", color: "#f07070", fontSize: 12 }}>Error loading runs: {error}</div>;

  const runs = runsData?.runs || [];

  return (
    <div style={s.runHistory} className="fade-in">
      <div style={s.runHistoryHeader}>Run history</div>
      <div style={s.runTableHead}>
        <div style={{ flex: "0 0 200px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Started</div>
        <div style={{ flex: "0 0 80px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</div>
        <div style={{ flex: "0 0 80px", fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Duration</div>
        <div style={{ fontSize: 11, color: "#3d4a5c", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Rows loaded</div>
      </div>
      {runs.length === 0 ? (
        <div style={{ padding: "10px 0", fontSize: 12, color: "#59647a" }}>No runs found.</div>
      ) : (
        runs.map(run => {
          const duration = run.endDate && run.startDate ? `${Math.round((new Date(run.endDate) - new Date(run.startDate)) / 1000)}s` : "—";
          return (
            <RunRow 
              key={run.runId} 
              run={{
                status: run.state || "paused",
                startedAt: run.startDate ? new Date(run.startDate).toLocaleString() : "Unknown",
                duration: duration,
                rows: "—"
              }} 
            />
          );
        })
      )}
    </div>
  );
}

function PipelineRow({ pipeline }) {
  const [expanded, setExpanded] = useState(false);
  const [triggerError, setTriggerError] = useState("");
  const { execute: triggerRun, loading: triggering } = useApi(api.triggerPipelineRun);
  
  const { execute: fetchLatest, data: runsData } = useApi(api.getPipelineRuns, true);
  
  useEffect(() => {
    fetchLatest(pipeline.id, { limit: 1 }).catch(() => {});
  }, [fetchLatest, pipeline.id]);

  const latestRun = runsData?.runs?.[0];
  const status = latestRun ? latestRun.state : "idle";
  const lastRunTime = latestRun?.startDate ? new Date(latestRun.startDate).toLocaleString() : "Never";

  const handleTrigger = async (e) => {
    e.stopPropagation();
    setTriggerError("");
    try {
      await triggerRun(pipeline.id, {});
      await fetchLatest(pipeline.id, { limit: 1 });
    } catch (err) {
      setTriggerError(err?.message || "Failed to trigger pipeline run");
    }
  };

  return (
    <div style={{ ...s.pipelineCard, ...(expanded ? s.pipelineCardOpen : {}) }}>
      {/* Header row */}
      <div style={s.pipelineHeader} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ color: "#3d4a5c", flexShrink: 0 }}><IconChevron open={expanded} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={s.pipelineName}>{pipeline.name}</div>
            <div style={s.pipelineSub}>{pipeline.source?.schema}.{pipeline.source?.table} → {pipeline.destination?.path}</div>
          </div>
        </div>

        <div style={s.pipelineMeta}>
          <span style={s.metaTag}>{pipeline.ingestion?.mode}</span>
          <span style={s.metaTag}>{pipeline.schedule?.cron}</span>
          <StatusBadge status={status} />
          <div style={{ fontSize: 11, color: "#59647a", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <IconClock />{lastRunTime}
          </div>
          <button
            style={{ ...s.triggerBtn, ...(triggering ? s.triggerBtnRunning : {}) }}
            onClick={handleTrigger}
            disabled={triggering}
          >
            {triggering ? <><div style={spinnerStyle} />Running</> : <><IconPlay />Trigger</>}
          </button>
        </div>
      </div>

      {/* Run history */}
      {triggerError && <div style={s.triggerError}>{triggerError}</div>}
      {expanded && <RunHistory pipelineId={pipeline.id} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PipelinesPage() {
  const [filter, setFilter] = useState("all");
  const filters = ["all", "success", "running", "failed"];

  const { execute: fetchPipelines, data: pipelinesData, loading, error } = useApi(api.getPipelines, true);

  useEffect(() => {
    fetchPipelines().catch(() => {});
  }, [fetchPipelines]);

  const pipelines = pipelinesData?.pipelines || [];

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
          <Stat label="Total" value={pipelines.length} />
          <Stat label="Running" value="—" color="#4a9eff" />
          <Stat label="Failed" value="—" color="#f07070" />
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
        <button style={s.refreshBtn} onClick={() => fetchPipelines()}>
          <IconRefresh /> Refresh
        </button>
      </div>

      <div style={s.list}>
        {loading && <div style={s.empty}>Loading pipelines...</div>}
        {error && <div style={{...s.empty, color: '#f07070'}}>Error loading pipelines: {error}</div>}
        {!loading && !error && pipelines.length === 0 && <div style={s.empty}>No pipelines found.</div>}
        
        {pipelines.map(p => <PipelineRow key={p.id} pipeline={p} />)}
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
  triggerError: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "10px 16px 0",
    color: "#f07070",
    fontSize: 12,
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
