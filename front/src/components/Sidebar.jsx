import React from "react";

// --- ICONS ---
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconIngestion = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconPipelines = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="3" width="6" height="6" rx="1"/>
    <rect x="16" y="3" width="6" height="6" rx="1"/>
    <rect x="9" y="15" width="6" height="6" rx="1"/>
    <path d="M5 9v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/>
    <line x1="12" y1="14" x2="12" y2="15"/>
  </svg>
);

const IconCatalog = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
    <path d="M3 9v4c0 1.657 4.03 3 9 3s9-1.343 9-3V9"/>
    <path d="M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
  </svg>
);

const IconNotebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconCompute = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IconAdmin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1 1.64V21a2 2 0 1 1-4 0v-.08a1.8 1.8 0 0 0-1-1.64 1.8 1.8 0 0 0-2 .36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1H3a2 2 0 1 1 0-4h.08a1.8 1.8 0 0 0 1.64-1 1.8 1.8 0 0 0-.36-2l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.8 1.8 0 0 0 2 .36h0A1.8 1.8 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.8 1.8 0 0 0 1 1.64h0a1.8 1.8 0 0 0 2-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 2v0a1.8 1.8 0 0 0 1.64 1H21a2 2 0 1 1 0 4h-.08a1.8 1.8 0 0 0-1.52 1z" />
  </svg>
);

const IconLogo = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="6" fill="#1e6ef4"/>
    <path d="M8 16 L16 8 L24 16 L16 24 Z" fill="none" stroke="white" strokeWidth="2"/>
    <circle cx="16" cy="16" r="3" fill="white"/>
  </svg>
);

// --- NAVIGATION CONFIG ---
const navItems = [
  {
    section: null,
    items: [
      { id: "home", label: "Home", icon: <IconHome /> },
    ],
  },
  {
    section: "DATA ENGINEERING",
    items: [
      { id: "data-ingestion", label: "Data Ingestion", icon: <IconIngestion /> },
      { id: "pipelines",      label: "Pipelines",      icon: <IconPipelines /> },
      { id: "catalog",        label: "Catalog",        icon: <IconCatalog /> },
      { id: "notebooks",      label: "Notebooks",      icon: <IconNotebook /> }, // Restored
    ],
  },
  {
    section: "COMPUTE",
    items: [
      { id: "compute-profiles", label: "Compute Profiles", icon: <IconCompute /> }, // Restored
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { id: "admin", label: "API Console", icon: <IconAdmin /> }, // Restored new Admin
    ],
  },
];

// --- MAIN COMPONENT ---
export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoRow}>
        <IconLogo />
        <span style={styles.logoText}>Fusion Platform</span>
      </div>

      <nav style={styles.nav}>
        {navItems.map((group, gi) => (
          <div key={gi} style={styles.group}>
            {group.section && (
              <div style={styles.sectionLabel}>{group.section}</div>
            )}
            {group.items.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ ...styles.navIcon, color: isActive ? "#4a9eff" : "#59647a" }}>
                    {item.icon}
                  </span>
                  <span style={{ color: isActive ? "#e2e8f0" : "#8b97b0" }}>
                    {item.label}
                  </span>
                  {isActive && <div style={styles.activeBar} />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={styles.sidebarFooter}>
        <div style={styles.versionBadge}>v0.1 — Preview</div>
      </div>
    </aside>
  );
}

// --- CSS STYLES ---
const styles = {
  sidebar: {
    width: "220px",
    minWidth: "220px",
    height: "100vh",
    background: "#0d1117",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 16px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logoText: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#e2e8f0",
    letterSpacing: "0.01em",
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  group: {
    marginBottom: "4px",
  },
  sectionLabel: {
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.09em",
    color: "#3d4a5c",
    padding: "14px 16px 6px",
    textTransform: "uppercase",
  },
  navItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "7px 16px",
    background: "transparent",
    border: "none",
    borderRadius: "0",
    fontSize: "13px",
    fontWeight: "400",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s ease",
  },
  navItemActive: {
    background: "rgba(30, 110, 244, 0.10)",
  },
  navIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activeBar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "3px",
    background: "#1e6ef4",
    borderTopLeftRadius: "3px", 
    borderBottomLeftRadius: "3px"
  },
  sidebarFooter: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  versionBadge: {
    fontSize: "11px",
    color: "#3d4a5c",
    fontFamily: "'IBM Plex Mono', monospace",
  },
};