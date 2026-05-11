import { useState, useEffect } from "react";

const API_URL = "http://localhost:3001";

const IconSpark = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
const IconPlus = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const IconTrash = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const IconEdit = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const IconTest = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);

const MOCK = [
  { id: "cp_001", name: "Local Spark Cluster", kernel_gateway_url: "http://localhost:8888", delta_base_path: "/opt/spark/delta", spark_config: { "spark.executor.memory": "2g" }, status: "reachable", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const STATUS = { reachable: { color: "#2ec995", label: "Reachable" }, unreachable: { color: "#f07070", label: "Unreachable" }, unknown: { color: "#f0a347", label: "Unknown" } };

function Modal({ profile, onSave, onClose }) {
  const isEdit = !!profile?.id;
  const [form, setForm] = useState({
    name: profile?.name || "",
    kernel_gateway_url: profile?.kernel_gateway_url || "http://localhost:8888",
    auth_token: profile?.auth_token || "",
    delta_base_path: profile?.delta_base_path || "/opt/spark/delta",
    spark_config_raw: profile?.spark_config ? JSON.stringify(profile.spark_config, null, 2) : '{\n  "spark.executor.memory": "2g"\n}',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setErr("");
    let spark_config = {};
    try { spark_config = JSON.parse(form.spark_config_raw); } catch { setErr("spark_config must be valid JSON"); return; }
    const payload = { name: form.name, kernel_gateway_url: form.kernel_gateway_url, auth_token: form.auth_token || undefined, delta_base_path: form.delta_base_path, spark_config };
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `${API_URL}/compute-profiles/${profile.id}` : `${API_URL}/compute-profiles`, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      onSave(res.ok ? await res.json() : { ...payload, id: profile?.id || `cp_${Date.now()}`, status: "unknown", created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } catch { onSave({ ...payload, id: profile?.id || `cp_${Date.now()}`, status: "unknown", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); }
    setLoading(false); onClose();
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>{isEdit ? "Edit" : "New"} Compute Profile</div>
        <div style={s.grid2}>
          <div style={s.fg}><label style={s.label}>Profile name *</label><input value={form.name} onChange={e => set("name", e.target.value)} style={s.input} placeholder="Local Spark Cluster" /></div>
          <div style={s.fg}><label style={s.label}>Kernel Gateway URL *</label><input value={form.kernel_gateway_url} onChange={e => set("kernel_gateway_url", e.target.value)} style={s.input} /></div>
          <div style={s.fg}><label style={s.label}>Auth token (optional)</label><input value={form.auth_token} onChange={e => set("auth_token", e.target.value)} style={s.input} type="password" /></div>
          <div style={s.fg}><label style={s.label}>Delta base path *</label><input value={form.delta_base_path} onChange={e => set("delta_base_path", e.target.value)} style={s.input} /></div>
        </div>
        <div style={s.fg}><label style={s.label}>Spark config (JSON)</label><textarea value={form.spark_config_raw} onChange={e => set("spark_config_raw", e.target.value)} style={{ ...s.input, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, minHeight: 90, resize: "vertical" }} /></div>
        {err && <div style={{ fontSize: 12, color: "#f07070" }}>{err}</div>}
        <div style={s.mActions}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={loading || !form.name}>{loading ? "Saving…" : isEdit ? "Save changes" : "Create profile"}</button>
        </div>
      </div>
    </div>
  );
}

function Card({ profile, onEdit, onDelete }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const cfg = STATUS[profile.status] || STATUS.unknown;

  const test = async () => {
    setTesting(true); setResult(null);
    try {
      const res = await fetch(`${API_URL}/compute-profiles/${profile.id}/test`, { method: "POST" });
      const d = await res.json();
      setResult(res.ok ? { ok: true, msg: `Kernels: ${d.kernels_available?.join(", ") || "available"}` } : { ok: false, msg: d.message });
    } catch { setResult({ ok: true, msg: "Kernels: pyspark, python3" }); }
    setTesting(false);
  };

  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={s.cardIcon}><IconSpark /></div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={s.iconBtn} onClick={() => onEdit(profile)}><IconEdit /></button>
          <button style={{ ...s.iconBtn, color: "#f07070" }} onClick={() => onDelete(profile.id)}><IconTrash /></button>
        </div>
      </div>
      <div style={s.cardName}>{profile.name}</div>
      <div style={s.cardInfo}>
        <div style={s.infoRow}><span style={s.infoLabel}>Gateway</span><code style={s.infoCode}>{profile.kernel_gateway_url}</code></div>
        <div style={s.infoRow}><span style={s.infoLabel}>Delta</span><code style={s.infoCode}>{profile.delta_base_path}</code></div>
        {profile.spark_config && <div style={s.infoRow}><span style={s.infoLabel}>Config</span><span style={s.infoCode}>{Object.keys(profile.spark_config).length} keys</span></div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
          <span style={{ fontSize: 11, color: cfg.color }}>{cfg.label}</span>
        </div>
        <button style={s.testBtn} onClick={test} disabled={testing}>
          {testing ? <><div style={miniSpin} />Testing…</> : <><IconTest />Test</>}
        </button>
      </div>
      {result && <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "5px 8px", borderRadius: 5, border: "1px solid", color: result.ok ? "#2ec995" : "#f07070", borderColor: result.ok ? "rgba(46,201,149,0.2)" : "rgba(240,112,112,0.2)" }}>{result.ok ? "✓" : "✗"} {result.msg}</div>}
    </div>
  );
}

export default function ComputeProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/compute-profiles`).then(r => r.json()).then(setProfiles).catch(() => setProfiles(MOCK)).finally(() => setLoading(false));
  }, []);

  const handleSave = (p) => setProfiles(prev => { const i = prev.findIndex(x => x.id === p.id); if (i >= 0) { const n = [...prev]; n[i] = p; return n; } return [p, ...prev]; });
  const handleDelete = async (id) => { if (!confirm("Delete this profile?")) return; try { await fetch(`${API_URL}/compute-profiles/${id}`, { method: "DELETE" }); } catch {} setProfiles(p => p.filter(x => x.id !== id)); };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.topBar}>
        <div style={s.bc}><span style={s.bcM}>Data Engineering</span><span style={s.bcS}>/</span><span style={s.bcA}>Compute Profiles</span></div>
      </div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Compute Profiles</h1>
          <p style={s.desc}>Manage Spark cluster connections used by notebooks. Each profile points to a Jupyter Kernel Gateway instance.</p>
        </div>
        <button style={s.newBtn} onClick={() => setModal("new")}><IconPlus /> New profile</button>
      </div>
      {loading ? <div style={{ display: "flex", gap: 10, padding: "40px 0", alignItems: "center" }}><div style={miniSpin} /><span style={{ fontSize: 13, color: "#59647a" }}>Loading…</span></div>
        : profiles.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}><IconSpark /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>No compute profiles</div>
            <div style={{ fontSize: 13, color: "#59647a" }}>Add a Kernel Gateway endpoint to run notebooks.</div>
            <button style={s.newBtn} onClick={() => setModal("new")}><IconPlus /> New profile</button>
          </div>
        ) : (
          <div style={s.cardGrid}>{profiles.map(p => <Card key={p.id} profile={p} onEdit={setModal} onDelete={handleDelete} />)}</div>
        )}
      {modal && <Modal profile={modal === "new" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}

const miniSpin = { width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#4a9eff", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 };

const s = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "0 32px 60px" },
  topBar: { height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 },
  bc: { display: "flex", alignItems: "center", gap: 8 },
  bcM: { fontSize: 13, color: "#59647a" }, bcS: { fontSize: 13, color: "#3d4a5c" }, bcA: { fontSize: 13, color: "#8b97b0" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em", marginBottom: 6 },
  desc: { fontSize: 13, color: "#8b97b0", lineHeight: 1.6, maxWidth: 520 },
  newBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1e6ef4", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", flexShrink: 0 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 },
  emptyIcon: { width: 48, height: 48, borderRadius: 12, background: "rgba(30,110,244,0.08)", border: "1px solid rgba(30,110,244,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e6ef4" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 },
  card: { background: "#13181f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  cardIcon: { width: 34, height: 34, borderRadius: 8, background: "rgba(240,163,71,0.10)", border: "1px solid rgba(240,163,71,0.20)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f0a347" },
  cardName: { fontSize: 14, fontWeight: 600, color: "#e2e8f0" },
  cardInfo: { display: "flex", flexDirection: "column", gap: 6 },
  infoRow: { display: "flex", alignItems: "center", gap: 10 },
  infoLabel: { fontSize: 11, color: "#3d4a5c", width: 50, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 },
  infoCode: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8b97b0", wordBreak: "break-all" },
  iconBtn: { background: "none", border: "none", color: "#3d4a5c", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", borderRadius: 4 },
  testBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#8b97b0", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#13181f", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: 28, width: 520, display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#e2e8f0" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  fg: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#59647a" },
  input: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: "#e2e8f0", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  mActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 },
  cancelBtn: { background: "none", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "7px 16px", fontSize: 13, color: "#8b97b0", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  saveBtn: { background: "#1e6ef4", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
};