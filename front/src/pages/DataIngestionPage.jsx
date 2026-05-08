import { useState } from "react";
import PostgresWizard from "../components/PostgresWizard";

const IconPostgres = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
    <path d="M3 10v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
    <path d="M3 14v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const connectors = [
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "Database",
    icon: <IconPostgres />,
    iconColor: "#336791",
    iconBg: "rgba(51,103,145,0.12)",
    description: "Ingest tables from a PostgreSQL database into Delta Lake via batch or CDC pipelines.",
    available: true,
  },
];

export default function DataIngestionPage() {
  const [activeConnector, setActiveConnector] = useState(null);

  if (activeConnector === "postgres") {
    return <PostgresWizard onBack={() => setActiveConnector(null)} />;
  }

  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.topBar}>
        <div style={styles.breadcrumbs}>
          <span style={styles.breadcrumbMuted}>Data Engineering</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbActive}>Data Ingestion</span>
        </div>
      </div>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Add data source</h1>
        <p style={styles.pageDesc}>
          Choose a connector to configure a new ingestion pipeline. Data will be loaded
          into Delta Lake and orchestrated by Airflow.
        </p>
      </div>

      <div style={styles.searchRow}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}><IconSearch /></span>
          <input
            type="text"
            placeholder="Search connectors..."
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterTabs}>
          <button style={{ ...styles.filterTab, ...styles.filterTabActive }}>All</button>
          <button
            style={styles.filterTab}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b97b0")}
          >
            Database
          </button>
          <button
            style={styles.filterTab}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b97b0")}
          >
            File
          </button>
          <button
            style={styles.filterTab}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b97b0")}
          >
            Streaming
          </button>
        </div>
      </div>

      <div style={styles.sectionLabel}>Available (1)</div>

      <div style={styles.connectorGrid}>
        {connectors.map((c) => (
          <ConnectorCard key={c.id} connector={c} onClick={() => setActiveConnector(c.id)} />
        ))}
        <ComingSoonCard name="MySQL" />
        <ComingSoonCard name="MongoDB" />
        <ComingSoonCard name="Kafka" />
        <ComingSoonCard name="Amazon S3" />
      </div>
    </div>
  );
}

function ConnectorCard({ connector, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardTop}>
        <div style={{ ...styles.cardIcon, background: connector.iconBg, color: connector.iconColor }}>
          {connector.icon}
        </div>
        <span style={styles.categoryTag}>{connector.category}</span>
      </div>
      <div style={styles.cardName}>{connector.name}</div>
      <div style={styles.cardDesc}>{connector.description}</div>
      <div style={{ ...styles.cardAction, color: hovered ? "#4a9eff" : "#1e6ef4" }}>
        Configure
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 5 }}>
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  );
}

function ComingSoonCard({ name }) {
  return (
    <div style={styles.cardComingSoon}>
      <div style={styles.csName}>{name}</div>
      <div style={styles.csBadge}>Coming soon</div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 32px 60px",
  },
  topBar: {
    height: "48px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "32px",
  },
  breadcrumbs: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  breadcrumbMuted: {
    fontSize: "13px",
    color: "#59647a",
  },
  breadcrumbSep: {
    fontSize: "13px",
    color: "#3d4a5c",
  },
  breadcrumbActive: {
    fontSize: "13px",
    color: "#8b97b0",
  },
  pageHeader: {
    marginBottom: "28px",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#e2e8f0",
    letterSpacing: "-0.01em",
    marginBottom: "8px",
  },
  pageDesc: {
    fontSize: "13px",
    color: "#8b97b0",
    lineHeight: "1.6",
    maxWidth: "560px",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  searchBox: {
    position: "relative",
    flex: "0 0 260px",
  },
  searchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#59647a",
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    width: "100%",
    background: "#13181f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "7px 12px 7px 32px",
    fontSize: "13px",
    color: "#e2e8f0",
    outline: "none",
  },
  filterTabs: {
    display: "flex",
    gap: "2px",
  },
  filterTab: {
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#8b97b0",
    cursor: "pointer",
    transition: "color 0.12s ease",
  },
  filterTabActive: {
    background: "rgba(30,110,244,0.10)",
    color: "#4a9eff",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#3d4a5c",
    marginBottom: "12px",
  },
  connectorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  card: {
    background: "#13181f",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "18px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  cardHover: {
    borderColor: "rgba(30,110,244,0.40)",
    background: "#151c2a",
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  cardIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTag: {
    fontSize: "10px",
    fontWeight: "500",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#59647a",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "4px",
    padding: "2px 7px",
  },
  cardName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "6px",
  },
  cardDesc: {
    fontSize: "12px",
    color: "#8b97b0",
    lineHeight: "1.6",
    flex: 1,
    marginBottom: "14px",
  },
  cardAction: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "500",
    transition: "color 0.15s ease",
  },
  cardComingSoon: {
    background: "#0f1420",
    border: "1px dashed rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "160px",
    opacity: 0.6,
  },
  csName: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#59647a",
  },
  csBadge: {
    fontSize: "10px",
    fontWeight: "500",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#3d4a5c",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "4px",
    padding: "3px 8px",
    alignSelf: "flex-start",
  },
};
