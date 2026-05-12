import { useState, useEffect } from "react";
import NotebookEditor from "../components/NotebookEditor";

const API_URL = "http://localhost:3001";

const IconNotebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconOpen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconSpark = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const MOCK_NOTEBOOKS = [
  {
    id: "nb_001", title: "ETL Bronze to Silver — Orders",
    cell_count: 3, compute_profile_id: "cp_001", compute_profile_name: "Local Spark Cluster",
    created_at: "2026-05-10T10:00:00Z", updated_at: "2026-05-11T09:30:00Z",
    cells: [
      { id: "c1", type: "code", source: "df = spark.read.format('delta').load('/opt/spark/delta/raw/orders')\ndf.printSchema()", outputs: [], execution_count: null, metadata: {} },
      { id: "c2", type: "markdown", source: "## Filter active orders", outputs: [], execution_count: null, metadata: {} },
      { id: "c3", type: "code", source: "active = df.filter(df.status == 'active')\nprint(f'Active orders: {active.count()}')", outputs: [], execution_count: null, metadata: {} },
    ],
  },
  {
    id: "nb_002", title: "User Cohort Analysis",
    cell_count: 1, compute_profile_id: "cp_001", compute_profile_name: "Local Spark Cluster",
    created_at: "2026-05-09T14:00:00Z", updated_at: "2026-05-10T16:00:00Z",
    cells: [
      { id: "c1", type: "code", source: "users = spark.read.format('delta').load('/opt/spark/delta/raw/users')\nusers.show(5)", outputs: [], execution_count: null, metadata: {} },
    ],
  },
];

const MOCK_PROFILES = [
  { id: "cp_001", name: "Local Spark Cluster", kernel_gateway_url: "http://localhost:8888", delta_base_path: "/opt/spark/delta", status: "reachable" },
];

const fmtDate = (iso) => {
  const d = new Date(iso);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

function CreateModal({ profiles, onCreate, onClose }) {
  const [title, setTitle] = useState("Untitled Notebook");
  const [profileId, setProfileId] = useState(profiles[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreate = title.trim() && profileId;

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/notebooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, compute_profile_id: profileId }),
      });
      if (res.ok) {
        onCreate(await res.json());
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Failed to create notebook (${res.status})`);
      }
    } catch {
      setError("Network error — is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>New Notebook</div>
        <label style={s.label}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={s.input} autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
        <label style={s.label}>Compute Profile *</label>
        <select value={profileId} onChange={e => setProfileId(e.target.value)} style={{ ...s.input, borderColor: !profileId ? "rgba(240,112,112,0.3)" : undefined }}>
          <option value="" disabled>Select a compute profile…</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {!profileId && <div style={{ fontSize: 11, color: "#f0a347" }}>A compute profile is required to run notebook cells.</div>}
        {error && <div style={{ fontSize: 12, color: "#f07070", padding: "6px 0" }}>{error}</div>}
        <div style={s.modalActions}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...s.createBtn, opacity: canCreate ? 1 : 0.5 }} onClick={handleCreate} disabled={loading || !canCreate}>
            {loading ? "Creating…" : "Create notebook"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [openNotebook, setOpenNotebook] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nbRes, cpRes] = await Promise.all([
          fetch(`${API_URL}/notebooks`),
          fetch(`${API_URL}/compute-profiles`),
        ]);
        setNotebooks(nbRes.ok ? await nbRes.json() : MOCK_NOTEBOOKS);
        setProfiles(cpRes.ok ? await cpRes.json() : MOCK_PROFILES);
      } catch {
        setNotebooks(MOCK_NOTEBOOKS);
        setProfiles(MOCK_PROFILES);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleOpen = async (nb) => {
    try {
      const res = await fetch(`${API_URL}/notebooks/${nb.id}`);
      setOpenNotebook(res.ok ? await res.json() : nb);
    } catch { setOpenNotebook(nb); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this notebook?")) return;
    try { await fetch(`${API_URL}/notebooks/${id}`, { method: "DELETE" }); } catch {}
    setNotebooks(prev => prev.filter(n => n.id !== id));
  };

  const handleCreate = (nb) => { setNotebooks(prev => [nb, ...prev]); setOpenNotebook(nb); };
  const handleSave = (updated) => { setNotebooks(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n)); };

  if (openNotebook) {
    return <NotebookEditor notebook={openNotebook} computeProfiles={profiles} onBack={() => setOpenNotebook(null)} onSave={handleSave} />;
  }

  return (
    <div style={s.page} className="fade-in">
      <div style={s.topBar}>
        <div style={s.breadcrumbs}>
          <span style={s.breadcrumbMuted}>Data Engineering</span>
          <span style={s.sep}>/</span>
          <span style={s.breadcrumbActive}>Notebooks</span>
        </div>
      </div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Notebooks</h1>
          <p style={s.pageDesc}>Write and execute PySpark code interactively against your Delta Lake tables.</p>
        </div>
        <button style={s.newBtn} onClick={() => setShowCreate(true)}><IconPlus /> New notebook</button>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 10, padding: "40px 0", alignItems: "center" }}>
          <div style={spinner} /><span style={{ fontSize: 13, color: "#59647a" }}>Loading…</span>
        </div>
      ) : notebooks.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><IconNotebook /></div>
          <div style={s.emptyTitle}>No notebooks yet</div>
          <div style={s.emptyDesc}>Create your first notebook to start writing PySpark transformations.</div>
          <button style={s.newBtn} onClick={() => setShowCreate(true)}><IconPlus /> New notebook</button>
        </div>
      ) : (
        <div style={s.grid}>
          {notebooks.map(nb => (
            <div key={nb.id} style={s.card} onClick={() => handleOpen(nb)}>
              <div style={s.cardHeader}>
                <div style={s.cardIcon}><IconNotebook /></div>
                <button style={s.deleteBtn} onClick={e => handleDelete(nb.id, e)}><IconTrash /></button>
              </div>
              <div style={s.cardTitle}>{nb.title}</div>
              <div style={s.cardMeta}>
                <span style={s.metaItem}><IconSpark /> {nb.compute_profile_name || "No cluster"}</span>
                <span style={s.metaItem}>{nb.cell_count ?? nb.cells?.length ?? 0} cells</span>
              </div>
              <div style={s.cardFooter}>
                <span style={s.metaItem}><IconClock /> {fmtDate(nb.updated_at)}</span>
                <button style={s.openBtn} onClick={e => { e.stopPropagation(); handleOpen(nb); }}><IconOpen /> Open</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateModal profiles={profiles} onCreate={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

const spinner = { width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#4a9eff", animation: "spin 0.7s linear infinite" };

const s = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "0 32px 60px" },
  topBar: { height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 },
  breadcrumbs: { display: "flex", alignItems: "center", gap: 8 },
  breadcrumbMuted: { fontSize: 13, color: "#59647a" },
  sep: { fontSize: 13, color: "#3d4a5c" },
  breadcrumbActive: { fontSize: 13, color: "#8b97b0" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  pageTitle: { fontSize: 22, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em", marginBottom: 6 },
  pageDesc: { fontSize: 13, color: "#8b97b0", lineHeight: 1.6 },
  newBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1e6ef4", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", flexShrink: 0 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 },
  emptyIcon: { width: 48, height: 48, borderRadius: 12, background: "rgba(30,110,244,0.08)", border: "1px solid rgba(30,110,244,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e6ef4" },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "#e2e8f0" },
  emptyDesc: { fontSize: 13, color: "#59647a", maxWidth: 360, textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  card: { background: "#13181f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  cardIcon: { width: 32, height: 32, borderRadius: 8, background: "rgba(30,110,244,0.10)", border: "1px solid rgba(30,110,244,0.20)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a9eff" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 },
  cardMeta: { display: "flex", alignItems: "center", gap: 12 },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#59647a" },
  deleteBtn: { background: "none", border: "none", color: "#3d4a5c", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" },
  openBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(30,110,244,0.10)", border: "1px solid rgba(30,110,244,0.20)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "#4a9eff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#13181f", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 },
  label: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#59647a" },
  input: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  cancelBtn: { background: "none", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "7px 16px", fontSize: 13, color: "#8b97b0", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  createBtn: { background: "#1e6ef4", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
};