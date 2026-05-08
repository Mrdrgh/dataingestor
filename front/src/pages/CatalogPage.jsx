import { useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.18s ease", flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconTable = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
);
const IconSchema = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/>
    <path d="M17.5 17.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0"/>
  </svg>
);
const IconCatalogIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
    <path d="M3 9v4c0 1.657 4.03 3 9 3s9-1.343 9-3V9"/>
    <path d="M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconTag = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

// ─── Mock catalog data ────────────────────────────────────────────────────────
const CATALOG = [
  {
    name: "fusion_catalog",
    schemas: [
      {
        name: "raw",
        tables: [
          {
            name: "orders",
            format: "Delta", rows: "1,204,441", size: "2.4 GB", lastUpdated: "2 min ago",
            columns: [
              { name: "order_id",    type: "BIGINT",    nullable: false, pk: true },
              { name: "user_id",     type: "BIGINT",    nullable: false },
              { name: "status",      type: "STRING",    nullable: false },
              { name: "total_usd",   type: "DECIMAL",   nullable: true  },
              { name: "created_at",  type: "TIMESTAMP", nullable: false },
              { name: "updated_at",  type: "TIMESTAMP", nullable: false },
            ],
          },
          {
            name: "users",
            format: "Delta", rows: "204,112", size: "380 MB", lastUpdated: "1h ago",
            columns: [
              { name: "user_id",     type: "BIGINT",  nullable: false, pk: true },
              { name: "email",       type: "STRING",  nullable: false },
              { name: "username",    type: "STRING",  nullable: false },
              { name: "created_at",  type: "TIMESTAMP", nullable: false },
            ],
          },
          {
            name: "events",
            format: "Delta", rows: "18,442,001", size: "14.2 GB", lastUpdated: "1h ago",
            columns: [
              { name: "event_id",   type: "STRING",    nullable: false, pk: true },
              { name: "user_id",    type: "BIGINT",    nullable: true },
              { name: "event_type", type: "STRING",    nullable: false },
              { name: "payload",    type: "STRING",    nullable: true },
              { name: "ts",         type: "TIMESTAMP", nullable: false },
            ],
          },
        ],
      },
      {
        name: "curated",
        tables: [
          {
            name: "orders_enriched",
            format: "Delta", rows: "980,221", size: "1.8 GB", lastUpdated: "3h ago",
            columns: [
              { name: "order_id",   type: "BIGINT",  nullable: false, pk: true },
              { name: "email",      type: "STRING",  nullable: false },
              { name: "status",     type: "STRING",  nullable: false },
              { name: "region",     type: "STRING",  nullable: true },
              { name: "updated_at", type: "TIMESTAMP", nullable: false },
            ],
          },
          {
            name: "daily_revenue",
            format: "Delta", rows: "365", size: "2.1 MB", lastUpdated: "Daily",
            columns: [
              { name: "date",           type: "DATE",    nullable: false, pk: true },
              { name: "total_revenue",  type: "DECIMAL", nullable: false },
              { name: "order_count",    type: "BIGINT",  nullable: false },
            ],
          },
        ],
      },
    ],
  },
];

const TYPE_COLORS = {
  BIGINT: "#4a9eff", STRING: "#2ec995", DECIMAL: "#f0a347",
  TIMESTAMP: "#b07ff0", DATE: "#b07ff0", BOOLEAN: "#f07070",
};

// ─── Table detail panel ───────────────────────────────────────────────────────
function TableDetail({ catalog, schema, table, onClose }) {
  const [copied, setCopied] = useState(false);
  const fullPath = `${catalog}.${schema}.${table.name}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullPath).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={s.detail} className="fade-in">
      {/* Header */}
      <div style={s.detailHeader}>
        <div style={s.detailTitleRow}>
          <div style={s.detailIcon}><IconTable /></div>
          <div>
            <div style={s.detailName}>{table.name}</div>
            <div style={s.detailPath}>
              <code style={s.detailPathCode}>{fullPath}</code>
              <button
                style={{ ...s.copyBtn, color: copied ? "#2ec995" : "#59647a" }}
                onClick={handleCopy}
              >
                <IconCopy /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <button style={s.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        <StatChip label="Format"  value={table.format}      />
        <StatChip label="Rows"    value={table.rows}         />
        <StatChip label="Size"    value={table.size}         />
        <StatChip label="Updated" value={table.lastUpdated}  />
      </div>

      {/* Columns */}
      <div style={s.colSection}>
        <div style={s.colSectionTitle}>Schema — {table.columns.length} columns</div>
        <div style={s.colTable}>
          <div style={s.colHead}>
            <div style={{ flex: "0 0 180px" }}>Column</div>
            <div style={{ flex: "0 0 110px" }}>Type</div>
            <div style={{ flex: 1 }}>Nullable</div>
          </div>
          {table.columns.map(col => (
            <div key={col.name} style={s.colRow}>
              <div style={{ flex: "0 0 180px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#e2e8f0" }}>
                  {col.name}
                </span>
                {col.pk && (
                  <span style={s.pkBadge}><IconTag /> PK</span>
                )}
              </div>
              <div style={{ flex: "0 0 110px" }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  color: TYPE_COLORS[col.type] || "#8b97b0",
                  background: `${(TYPE_COLORS[col.type] || "#8b97b0")}14`,
                  border: `1px solid ${(TYPE_COLORS[col.type] || "#8b97b0")}30`,
                  borderRadius: 4, padding: "1px 6px",
                }}>
                  {col.type}
                </span>
              </div>
              <div style={{ flex: 1, fontSize: 12, color: col.nullable ? "#59647a" : "#3d4a5c" }}>
                {col.nullable ? "YES" : <span style={{ color: "#3d4a5c" }}>NO</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }) {
  return (
    <div style={s.chip}>
      <div style={s.chipLabel}>{label}</div>
      <div style={s.chipValue}>{value}</div>
    </div>
  );
}

// ─── Tree nodes ───────────────────────────────────────────────────────────────
function TableNode({ catalogName, schemaName, table, selectedTable, onSelect }) {
  const isSelected = selectedTable?.name === table.name;
  return (
    <div
      style={{ ...s.treeItem, ...s.treeTable, ...(isSelected ? s.treeItemSelected : {}) }}
      onClick={() => onSelect({ catalog: catalogName, schema: schemaName, table })}
    >
      <span style={{ color: isSelected ? "#4a9eff" : "#59647a", flexShrink: 0 }}><IconTable /></span>
      <span style={{ fontSize: 12, color: isSelected ? "#e2e8f0" : "#8b97b0", fontFamily: "'IBM Plex Mono', monospace" }}>
        {table.name}
      </span>
      <span style={s.deltaTag}>Δ</span>
    </div>
  );
}

function SchemaNode({ catalogName, schema, selectedTable, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div style={{ ...s.treeItem, ...s.treeSchema }} onClick={() => setOpen(!open)}>
        <span style={{ color: "#3d4a5c", flexShrink: 0 }}><IconChevron open={open} /></span>
        <span style={{ color: "#59647a", flexShrink: 0 }}><IconSchema /></span>
        <span style={{ fontSize: 12, color: "#8b97b0" }}>{schema.name}</span>
        <span style={s.countBadge}>{schema.tables.length}</span>
      </div>
      {open && (
        <div style={s.treeChildren}>
          {schema.tables.map(t => (
            <TableNode
              key={t.name}
              catalogName={catalogName}
              schemaName={schema.name}
              table={t}
              selectedTable={selectedTable}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogNode({ catalog, selectedTable, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={s.catalogNode}>
      <div style={{ ...s.treeItem, ...s.treeCatalog }} onClick={() => setOpen(!open)}>
        <span style={{ color: "#3d4a5c", flexShrink: 0 }}><IconChevron open={open} /></span>
        <span style={{ color: "#1e6ef4", flexShrink: 0 }}><IconCatalogIcon /></span>
        <span style={{ fontSize: 13, color: "#c8d4e8", fontWeight: 500 }}>{catalog.name}</span>
      </div>
      {open && (
        <div style={s.treeChildren}>
          {catalog.schemas.map(sc => (
            <SchemaNode
              key={sc.name}
              catalogName={catalog.name}
              schema={sc}
              selectedTable={selectedTable}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filteredCatalog = search.trim()
    ? CATALOG.map(cat => ({
        ...cat,
        schemas: cat.schemas.map(sc => ({
          ...sc,
          tables: sc.tables.filter(t => t.name.includes(search.toLowerCase())),
        })).filter(sc => sc.tables.length > 0),
      })).filter(cat => cat.schemas.length > 0)
    : CATALOG;

  return (
    <div style={s.page} className="fade-in">
      <div style={s.topBar}>
        <div style={s.breadcrumbs}>
          <span style={s.breadcrumbMuted}>Data Engineering</span>
          <span style={s.breadcrumbSep}>/</span>
          <span style={s.breadcrumbActive}>Catalog</span>
        </div>
      </div>

      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Catalog</h1>
        <p style={s.pageDesc}>Browse Delta Lake tables registered in the Fusion catalog.</p>
      </div>

      <div style={s.workspace}>
        {/* Left: tree */}
        <div style={s.tree}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tables..."
              style={s.searchInput}
            />
          </div>
          <div style={s.treeBody}>
            {filteredCatalog.map(cat => (
              <CatalogNode
                key={cat.name}
                catalog={cat}
                selectedTable={selected?.table}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div style={s.detailPane}>
          {selected ? (
            <TableDetail
              catalog={selected.catalog}
              schema={selected.schema}
              table={selected.table}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div style={s.emptyDetail}>
              <div style={s.emptyDetailIcon}><IconTable /></div>
              <div style={s.emptyDetailText}>Select a table to view its schema</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "0 32px 60px" },
  topBar: { height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 },
  breadcrumbs: { display: "flex", alignItems: "center", gap: 8 },
  breadcrumbMuted:  { fontSize: 13, color: "#59647a" },
  breadcrumbSep:    { fontSize: 13, color: "#3d4a5c" },
  breadcrumbActive: { fontSize: 13, color: "#8b97b0" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em", marginBottom: 6 },
  pageDesc:  { fontSize: 13, color: "#8b97b0", lineHeight: 1.6 },
  workspace: { display: "flex", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden", minHeight: 480 },

  // Tree panel
  tree: { width: 240, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" },
  searchWrap: { position: "relative", padding: "10px 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  searchIcon: { position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: "#3d4a5c", display: "flex", alignItems: "center" },
  searchInput: {
    width: "100%", background: "#0d1219", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 5, padding: "6px 10px 6px 28px", fontSize: 12, color: "#e2e8f0",
    outline: "none", boxSizing: "border-box",
  },
  treeBody: { flex: 1, overflowY: "auto", padding: "8px 0" },
  catalogNode: { marginBottom: 4 },
  treeItem: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 10px", cursor: "pointer",
    transition: "background 0.12s ease",
  },
  treeCatalog: { padding: "6px 10px" },
  treeSchema: { padding: "5px 10px 5px 14px" },
  treeTable:  { padding: "4px 10px 4px 24px", borderRadius: 0 },
  treeItemSelected: { background: "rgba(30,110,244,0.10)" },
  treeChildren: { paddingLeft: 0 },
  countBadge: {
    fontSize: 10, color: "#3d4a5c", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "0 5px",
    marginLeft: "auto",
  },
  deltaTag: {
    fontSize: 10, color: "#1e6ef4", background: "rgba(30,110,244,0.10)",
    border: "1px solid rgba(30,110,244,0.20)", borderRadius: 3, padding: "0 4px",
    fontFamily: "'IBM Plex Mono', monospace", marginLeft: "auto",
  },

  // Detail pane
  detailPane: { flex: 1, minWidth: 0, background: "#0f141b", overflow: "auto" },
  emptyDetail: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#3d4a5c" },
  emptyDetailIcon: { fontSize: 28, opacity: 0.5 },
  emptyDetailText: { fontSize: 13, color: "#3d4a5c" },

  // Table detail
  detail: { padding: "20px 24px" },
  detailHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  detailTitleRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  detailIcon: { width: 34, height: 34, borderRadius: 7, background: "rgba(30,110,244,0.10)", border: "1px solid rgba(30,110,244,0.20)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a9eff", flexShrink: 0, marginTop: 2 },
  detailName: { fontSize: 18, fontWeight: 600, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 5 },
  detailPath: { display: "flex", alignItems: "center", gap: 8 },
  detailPathCode: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#59647a" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "color 0.15s" },
  closeBtn: { background: "none", border: "none", fontSize: 14, color: "#3d4a5c", cursor: "pointer", padding: "4px 8px", lineHeight: 1 },
  statsRow: { display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  chip: { background: "#13181f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "8px 14px" },
  chipLabel: { fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#3d4a5c", marginBottom: 3 },
  chipValue: { fontSize: 13, fontWeight: 500, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" },
  colSection: {},
  colSectionTitle: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#3d4a5c", marginBottom: 10 },
  colTable: { borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" },
  colHead: { display: "flex", padding: "8px 14px", background: "#13181f", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#3d4a5c" },
  colRow: { display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  pkBadge: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, color: "#f0a347", background: "rgba(200,125,32,0.10)", border: "1px solid rgba(200,125,32,0.25)", borderRadius: 3, padding: "1px 5px", textTransform: "uppercase", letterSpacing: "0.04em" },
};
