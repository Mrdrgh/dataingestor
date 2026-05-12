import { useState, useRef, useCallback, useEffect } from "react";
import { marked } from "marked";

// configure marked once
marked.setOptions({ breaks: true, gfm: true });
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldGutter } from "@codemirror/language";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";

const WS_URL = "ws://localhost:3001/ws/notebook";
const API_URL = "http://localhost:3001";

const IconPlay = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>);
const IconStop = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>);
const IconRestart = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>);
const IconPlus = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const IconTrash = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>);
const IconCode = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>);
const IconMd = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
const IconArrowUp = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>);
const IconArrowDown = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>);
const IconBack = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>);
const IconSave = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>);

let _id = 0;
const newId = () => `cell-${Date.now()}-${_id++}`;
const makeCell = (type = "code", source = "") => ({ id: newId(), type, source, outputs: [], execution_count: null, metadata: {} });

// ── CodeMirror 6 editor — only used for code cells ──────────────────────────
function CodeEditor({ value, onChange, onRunShortcut }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRunShortcut);
  onChangeRef.current = onChange;
  onRunRef.current = onRunShortcut;

  useEffect(() => {
    if (!containerRef.current) return;
    const runKeys = keymap.of([
      { key: "Shift-Enter", run: () => { onRunRef.current?.(); return true; } },
      { key: "Ctrl-Enter",  run: () => { onRunRef.current?.(); return true; } },
    ]);
    const theme = EditorView.theme({
      "&":                    { backgroundColor: "transparent", fontSize: "13px", fontFamily: "'IBM Plex Mono','Fira Code',monospace" },
      ".cm-content":          { padding: "12px 14px", minHeight: "60px", caretColor: "#4a9eff" },
      ".cm-focused":          { outline: "none" },
      ".cm-line":             { lineHeight: "1.7" },
      ".cm-gutters":          { backgroundColor: "rgba(0,0,0,0.25)", border: "none", borderRight: "1px solid rgba(255,255,255,0.06)", color: "#3d4a5c", minWidth: "40px" },
      ".cm-activeLineGutter": { backgroundColor: "rgba(30,110,244,0.08)" },
      ".cm-activeLine":       { backgroundColor: "rgba(30,110,244,0.05)" },
      ".cm-cursor":           { borderLeftColor: "#4a9eff" },
      ".cm-selectionBackground, ::selection": { backgroundColor: "rgba(30,110,244,0.25) !important" },
    }, { dark: true });

    const state = EditorState.create({
      doc: value,
      extensions: [
        oneDark, theme,
        python(),
        lineNumbers(), foldGutter(), bracketMatching(), closeBrackets(),
        highlightActiveLine(), autocompletion(),
        keymap.of([...defaultKeymap, indentWithTab]),
        runKeys,
        EditorView.updateListener.of(u => { if (u.docChanged) onChangeRef.current(u.state.doc.toString()); }),
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // keep editor in sync when value changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== value) view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  return <div ref={containerRef} style={{ width: "100%", minHeight: 60 }} />;
}

function CellOutput({ outputs, running }) {
  // Show outputs AND running indicator together (like Jupyter — stream in real-time)
  const hasOutputs = outputs?.length > 0;
  if (!running && !hasOutputs) return null;
  return (
    <div style={s.outputWrap}>
      {hasOutputs && outputs.map((out, i) => {
        if (out.output_type === "stream") return <pre key={i} style={{ ...s.pre, color: out.name === "stderr" ? "#f07070" : "#c8d4e8" }}>{out.text}</pre>;
        if (out.output_type === "execute_result" || out.output_type === "display_data") {
          if (out.data?.["text/html"]) return <div key={i} style={s.outputHtml} dangerouslySetInnerHTML={{ __html: out.data["text/html"] }} />;
          if (out.data?.["text/plain"]) return <pre key={i} style={s.pre}>{out.data["text/plain"]}</pre>;
        }
        if (out.output_type === "error") return <pre key={i} style={{ ...s.pre, color: "#f07070" }}>{out.ename}: {out.evalue}{"\n"}{(out.traceback || []).join("\n")}</pre>;
        return null;
      })}
      {running && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: hasOutputs ? 6 : 0 }}>
          <div style={spin} /><span style={{ fontSize: 11, color: "#59647a" }}>Running…</span>
        </div>
      )}
    </div>
  );
}

function Cell({ cell, index, total, selected, kernelStatus, onSelect, onUpdate, onDelete, onMoveUp, onMoveDown, onExecute, onStop }) {
  const taRef = useRef(null);
  const running = cell.metadata?.running === true;
  const canRun = kernelStatus === "ready" || kernelStatus === "idle";
  // markdown cells start rendered; editing = true shows the textarea
  const [mdEditing, setMdEditing] = useState(!cell.source || cell.source.trim() === "");

  const autoResize = () => { const t = taRef.current; if (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } };

  // render markdown: Shift+Enter commits and shows preview
  const commitMarkdown = () => { if (cell.source.trim()) setMdEditing(false); };

  const handleRunStop = (e) => {
    e.stopPropagation();
    if (running) {
      // BUG 1 FIX: Stop sends interrupt, not re-execute
      onStop(cell.id);
    } else {
      onExecute(cell.id);
    }
  };

  return (
    <div style={{ ...s.cell, ...(selected ? s.cellSel : {}) }} onClick={() => onSelect(cell.id)}>
      <div style={s.cellBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={s.execCount}>{running ? "*" : cell.execution_count != null ? `[${cell.execution_count}]` : "[ ]"}</span>
          <button style={{ ...s.cellTypeBtn, color: cell.type === "code" ? "#4a9eff" : "#b07ff0" }}
            onClick={e => { e.stopPropagation(); onUpdate(cell.id, { type: cell.type === "code" ? "markdown" : "code" }); }}>
            {cell.type === "code" ? <IconCode /> : <IconMd />}
            <span style={{ fontSize: 10 }}>{cell.type}</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {cell.type === "code" && (
            <button style={{ ...s.cellBtn, color: running ? "#f07070" : canRun ? "#2ec995" : "#3d4a5c" }}
              onClick={handleRunStop} disabled={!canRun && !running}>
              {running ? <IconStop /> : <IconPlay />}
            </button>
          )}
          <button style={s.cellBtn} onClick={e => { e.stopPropagation(); onMoveUp(cell.id); }} disabled={index === 0}><IconArrowUp /></button>
          <button style={s.cellBtn} onClick={e => { e.stopPropagation(); onMoveDown(cell.id); }} disabled={index === total - 1}><IconArrowDown /></button>
          <button style={{ ...s.cellBtn, color: "#f07070" }} onClick={e => { e.stopPropagation(); onDelete(cell.id); }}><IconTrash /></button>
        </div>
      </div>
      {cell.type === "code" ? (
        <CodeEditor
          value={cell.source}
          onChange={src => onUpdate(cell.id, { source: src })}
          onRunShortcut={() => { if (!running) onExecute(cell.id); }}
        />
      ) : mdEditing ? (
        /* ── Markdown edit mode ── */
        <textarea ref={taRef} value={cell.source}
          autoFocus
          onChange={e => { onUpdate(cell.id, { source: e.target.value }); autoResize(); }}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) { e.preventDefault(); commitMarkdown(); }
            if (e.key === "Escape") { e.preventDefault(); commitMarkdown(); }
          }}
          onBlur={commitMarkdown}
          onFocus={() => onSelect(cell.id)}
          style={{ ...s.ta, fontFamily: "'IBM Plex Mono', monospace" }}
          placeholder="# Markdown… (Shift+Enter to render)"
          spellCheck={false}
          rows={Math.max(3, cell.source.split("\n").length)}
        />
      ) : (
        /* ── Markdown rendered mode — double-click or click to edit ── */
        <div
          className="nb-md"
          style={s.mdRendered}
          title="Double-click to edit"
          onDoubleClick={() => { onSelect(cell.id); setMdEditing(true); }}
          dangerouslySetInnerHTML={{ __html: marked.parse(cell.source || "_Empty markdown cell — double-click to edit_") }}
        />
      )}
      <CellOutput outputs={cell.outputs} running={running} />
    </div>
  );
}

export default function NotebookEditor({ notebook, computeProfiles, onBack, onSave }) {
  const [cells, setCells] = useState(notebook.cells?.length > 0 ? notebook.cells : [makeCell("code", "# Welcome\nprint('Hello, Spark!')")]);
  const [title, setTitle] = useState(notebook.title || "Untitled Notebook");
  const [selected, setSelected] = useState(null);
  const [profileId, setProfileId] = useState(notebook.compute_profile_id || "");
  const [kernelStatus, setKernelStatus] = useState("disconnected");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const wsRef = useRef(null);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  const clearAllRunning = useCallback(() => {
    setCells(p => p.map(c => c.metadata?.running ? { ...c, metadata: { ...c.metadata, running: false } } : c));
  }, []);

  const connectKernel = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setKernelStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "kernel:start", notebook_id: notebook.id, compute_profile_id: profileId }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "kernel:ready") setKernelStatus("idle");
      if (msg.type === "kernel:error") { setKernelStatus("dead"); clearAllRunning(); }
      if (msg.type === "kernel:status") {
        setKernelStatus(msg.status);
        // When kernel dies, clear all running flags
        if (msg.status === "dead") clearAllRunning();
        // Safety net: when kernel goes globally idle, no cell should be running
        if (msg.status === "idle") clearAllRunning();
      }
      if (msg.type === "cell:status") setCells(p => p.map(c => c.id === msg.cell_id ? { ...c, metadata: { ...c.metadata, running: msg.status === "busy" } } : c));
      if (msg.type === "cell:stream") setCells(p => p.map(c => {
        if (c.id !== msg.cell_id) return c;
        const ex = c.outputs.find(o => o.output_type === "stream" && o.name === msg.name);
        if (ex) return { ...c, outputs: c.outputs.map(o => o === ex ? { ...o, text: o.text + msg.text } : o) };
        return { ...c, outputs: [...c.outputs, { output_type: "stream", name: msg.name, text: msg.text }] };
      }));
      if (msg.type === "cell:result") setCells(p => p.map(c => c.id === msg.cell_id ? { ...c, execution_count: msg.execution_count, outputs: [...c.outputs, { output_type: "execute_result", data: msg.data }] } : c));
      if (msg.type === "cell:error") setCells(p => p.map(c => c.id === msg.cell_id ? { ...c, metadata: { ...c.metadata, running: false }, outputs: [...c.outputs, { output_type: "error", ename: msg.ename, evalue: msg.evalue, traceback: msg.traceback }] } : c));
      if (msg.type === "cell:display_data") setCells(p => p.map(c => c.id === msg.cell_id ? { ...c, outputs: [...c.outputs, { output_type: "display_data", data: msg.data }] } : c));
    };
    ws.onerror = () => { setKernelStatus("dead"); clearAllRunning(); };
    // BUG 4 FIX: On WS close, clear all running flags
    ws.onclose = () => {
      setKernelStatus(k => k !== "dead" ? "disconnected" : k);
      clearAllRunning();
    };
  }, [notebook.id, profileId, clearAllRunning]);

  // Clean up WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const send = (msg) => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg)); };

  const executeCell = useCallback((cellId) => {
    // Use ref to get the latest cell content (important for Run All)
    const cell = cellsRef.current.find(c => c.id === cellId);
    if (!cell || cell.type !== "code") return;
    setCells(p => p.map(c => c.id === cellId ? { ...c, outputs: [], metadata: { ...c.metadata, running: true } } : c));
    send({ type: "cell:execute", notebook_id: notebook.id, cell_id: cellId, code: cell.source });
  }, [notebook.id]);

  // Dedicated stop function — sends interrupt, marks cell as not running
  const stopCell = useCallback((cellId) => {
    send({ type: "kernel:interrupt", notebook_id: notebook.id });
    setCells(p => p.map(c => c.id === cellId ? { ...c, metadata: { ...c.metadata, running: false } } : c));
  }, [notebook.id]);

  // Run All: execute code cells in current visual order (kernel queues them sequentially)
  const runAll = useCallback(() => {
    const codeCells = cellsRef.current.filter(c => c.type === "code");
    codeCells.forEach(c => executeCell(c.id));
  }, [executeCell]);

  const addCell = (type = "code") => {
    const cell = makeCell(type);
    setCells(p => {
      if (!selected) return [...p, cell];
      const i = p.findIndex(c => c.id === selected);
      const n = [...p]; n.splice(i + 1, 0, cell); return n;
    });
    setSelected(cell.id);
  };

  const updateCell = (id, patch) => setCells(p => p.map(c => c.id === id ? { ...c, ...patch } : c));
  const deleteCell = (id) => setCells(p => { const n = p.filter(c => c.id !== id); return n.length ? n : [makeCell("code")]; });
  const moveCell = (id, dir) => setCells(p => {
    const i = p.findIndex(c => c.id === id); const n = [...p];
    const t = dir === "up" ? i - 1 : i + 1;
    if (t < 0 || t >= n.length) return p;
    [n[i], n[t]] = [n[t], n[i]]; return n;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/notebooks/${notebook.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, cells, compute_profile_id: profileId }) });
      setSaveMsg("Saved ✓"); onSave?.({ ...notebook, title, cells, compute_profile_id: profileId });
    } catch { setSaveMsg("Failed"); }
    setSaving(false); setTimeout(() => setSaveMsg(""), 2000);
  };

  const kColor = { disconnected: "#3d4a5c", connecting: "#f0a347", idle: "#2ec995", ready: "#2ec995", busy: "#4a9eff", dead: "#f07070" }[kernelStatus] || "#3d4a5c";

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <button style={s.backBtn} onClick={onBack}><IconBack /> Notebooks</button>
          <span style={{ color: "#3d4a5c" }}>/</span>
          <input value={title} onChange={e => setTitle(e.target.value)} style={s.titleInput} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <select value={profileId} onChange={e => setProfileId(e.target.value)} style={s.profileSelect}>
            <option value="">Select compute profile…</option>
            {computeProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: kColor, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: kColor }}>{kernelStatus}</span>
          </div>
          <button style={{ ...s.btn, background: "rgba(30,110,244,0.10)", borderColor: "rgba(30,110,244,0.25)", color: "#4a9eff" }}
            onClick={connectKernel} disabled={kernelStatus === "connecting" || !profileId}>
            {kernelStatus === "connecting" ? <><div style={spin} />Connecting…</> : "Connect kernel"}
          </button>
          <div style={s.divider} />
          <button style={{ ...s.btn, color: "#2ec995" }} onClick={runAll}><IconPlay /> Run all</button>
          <button style={s.btn} onClick={() => send({ type: "kernel:restart", notebook_id: notebook.id })}><IconRestart /></button>
          <button style={s.btn} onClick={() => setCells(p => p.map(c => ({ ...c, outputs: [], execution_count: null, metadata: {} })))}>Clear</button>
          <div style={s.divider} />
          <button style={{ ...s.btn, background: "rgba(46,201,149,0.10)", borderColor: "rgba(46,201,149,0.25)", color: "#2ec995" }} onClick={handleSave} disabled={saving}>
            <IconSave /> {saving ? "Saving…" : saveMsg || "Save"}
          </button>
        </div>
      </div>

      <div style={s.cells}>
        {cells.map((cell, i) => (
          <Cell key={cell.id} cell={cell} index={i} total={cells.length} selected={selected === cell.id}
            kernelStatus={kernelStatus} onSelect={setSelected} onUpdate={updateCell}
            onDelete={deleteCell} onMoveUp={id => moveCell(id, "up")} onMoveDown={id => moveCell(id, "down")}
            onExecute={executeCell} onStop={stopCell} />
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={s.addBtn} onClick={() => addCell("code")}><IconPlus /> Code cell</button>
          <button style={s.addBtn} onClick={() => addCell("markdown")}><IconPlus /> Markdown cell</button>
        </div>
      </div>
    </div>
  );
}

const spin = { width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", flexShrink: 0, display: "inline-block" };

const s = {
  page: { display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#0d1117" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, gap: 12 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#8b97b0", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  titleInput: { background: "none", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#e2e8f0", fontFamily: "'IBM Plex Sans', sans-serif", minWidth: 180 },
  profileSelect: { background: "#13181f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#8b97b0", fontSize: 12, padding: "4px 8px", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 180 },
  btn: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#8b97b0", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: "nowrap" },
  divider: { width: 1, height: 18, background: "rgba(255,255,255,0.07)" },
  cells: { flex: 1, overflowY: "auto", padding: "24px 40px 60px" },
  cell: { border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: 12, background: "#13181f" },
  cellSel: { borderColor: "rgba(30,110,244,0.35)" },
  cellBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  execCount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#3d4a5c", width: 28, textAlign: "right" },
  cellTypeBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 6px", fontFamily: "'IBM Plex Sans', sans-serif" },
  cellBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#3d4a5c", padding: "4px 6px", borderRadius: 4 },
  ta: { width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", padding: "12px 14px", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", boxSizing: "border-box", minHeight: 60 },
  outputWrap: { borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 14px 10px" },
  pre: { margin: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.6, color: "#c8d4e8", whiteSpace: "pre-wrap", wordBreak: "break-all" },
  outputHtml: { fontSize: 12, color: "#c8d4e8", overflowX: "auto" },
  addBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "#3d4a5c", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif" },
  mdRendered: { padding: "14px 18px", color: "#c8d4e8", fontSize: 14, lineHeight: 1.8, fontFamily: "'IBM Plex Sans', sans-serif", cursor: "default", minHeight: 40 },
};