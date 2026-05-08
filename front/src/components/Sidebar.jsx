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

const IconLogo = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="6" fill="#1e6ef4"/>
    <path d="M8 16 L16 8 L24 16 L16 24 Z" fill="none" stroke="white" strokeWidth="2"/>
    <circle cx="16" cy="16" r="3" fill="white"/>
  </svg>
);

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
      { id: "pipelines", label: "Pipelines", icon: <IconPipelines /> },
      { id: "catalog", label: "Catalog", icon: <IconCatalog /> },
    ],
  },
];

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
    borderRight: "2px solid #1e6ef4",
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
    width: "2px",
    background: "#1e6ef4",
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
