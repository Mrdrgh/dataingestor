const IconDatabase = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
    <path d="M3 10v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
    <path d="M3 14v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4"/>
  </svg>
);

const IconPipeline = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconLake = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconSpark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const stackItems = [
  {
    icon: <IconDatabase />,
    color: "#1e6ef4",
    colorDim: "rgba(30,110,244,0.10)",
    title: "PostgreSQL",
    desc: "Source databases are connected via the ingestion wizard. Credentials are securely passed to the Java REST API.",
  },
  {
    icon: <IconPipeline />,
    color: "#c87d20",
    colorDim: "rgba(200,125,32,0.10)",
    title: "Apache Airflow",
    desc: "Orchestrates pipeline DAGs. The backend schedules and monitors jobs; the UI surfaces run status and logs.",
  },
  {
    icon: <IconSpark />,
    color: "#9b59b6",
    colorDim: "rgba(155,89,182,0.10)",
    title: "Apache Spark",
    desc: "Handles distributed transformations. Spark jobs are triggered by Airflow and process data at scale.",
  },
  {
    icon: <IconLake />,
    color: "#1a9e6e",
    colorDim: "rgba(26,158,110,0.10)",
    title: "Delta Lake",
    desc: "Final storage layer with ACID transactions. Ingested data lands here in Parquet format with change history.",
  },
];

const statCards = [
  { label: "Connectors available", value: "1", sub: "PostgreSQL" },
  { label: "Pipelines created", value: "0", sub: "None yet" },
  { label: "Backend status", value: "Mock", sub: "Awaiting Java API" },
];

export default function HomePage({ onNavigate }) {
  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.topBar}>
        <span style={styles.breadcrumb}>Home</span>
      </div>

      <div style={styles.hero}>
        <div style={styles.heroTag}>Data Engineering Platform</div>
        <h1 style={styles.heroTitle}>Fusion Platform</h1>
        <p style={styles.heroSub}>
          A unified workspace for ingesting, transforming, and storing enterprise data.
          Connect your source databases, configure pipelines, and land clean data into Delta Lake
          — all from a single interface.
        </p>
        <button
          style={styles.ctaBtn}
          onClick={() => onNavigate("data-ingestion")}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#3a82f7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1e6ef4")}
        >
          Start ingesting data
          <span style={{ display: "flex" }}>
            <IconArrow />
          </span>
        </button>
      </div>

      <div style={styles.statsRow}>
        {statCards.map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Technology Stack</h2>
          <p style={styles.sectionSub}>
            The frontend sends JSON payloads to a Java REST API. All backend services are abstracted away
            — the UI knows nothing about Airflow or Spark directly.
          </p>
        </div>

        <div style={styles.stackGrid}>
          {stackItems.map((item, i) => (
            <div key={i} style={styles.stackCard}>
              <div style={{ ...styles.stackIcon, background: item.colorDim, color: item.color }}>
                {item.icon}
              </div>
              <div style={styles.stackCardBody}>
                <div style={{ ...styles.stackName, color: item.color }}>{item.title}</div>
                <div style={styles.stackDesc}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Architecture</h2>
        <p style={styles.sectionSub} >How data flows through the platform</p>
        <div style={styles.archRow}>
          {["React UI", "Java REST API", "Airflow DAG", "Spark Job", "Delta Lake"].map((label, i, arr) => (
            <div key={i} style={styles.archGroup}>
              <div style={styles.archNode}>{label}</div>
              {i < arr.length - 1 && (
                <div style={styles.archArrow}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d4a5c" strokeWidth="1.8">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.noticeBox}>
          <div style={styles.noticeTitle}>Development mode — mocked backend</div>
          <div style={styles.noticeSub}>
            All API calls use <code style={styles.code}>setTimeout</code> to simulate network latency.
            Replace the mock functions in <code style={styles.code}>src/api/</code> with real
            <code style={styles.code}>fetch()</code> calls once the Java REST API is live.
          </div>
        </div>
      </div>
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
    marginBottom: "40px",
  },
  breadcrumb: {
    fontSize: "13px",
    color: "#8b97b0",
  },
  hero: {
    marginBottom: "40px",
  },
  heroTag: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#1e6ef4",
    background: "rgba(30,110,244,0.10)",
    border: "1px solid rgba(30,110,244,0.20)",
    borderRadius: "4px",
    padding: "3px 10px",
    marginBottom: "14px",
  },
  heroTitle: {
    fontSize: "32px",
    fontWeight: "600",
    color: "#e2e8f0",
    letterSpacing: "-0.02em",
    marginBottom: "14px",
    lineHeight: "1.2",
  },
  heroSub: {
    fontSize: "15px",
    color: "#8b97b0",
    lineHeight: "1.7",
    maxWidth: "620px",
    marginBottom: "24px",
  },
  ctaBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "#1e6ef4",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "9px 18px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "40px",
  },
  statCard: {
    background: "#13181f",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "20px 20px 16px",
  },
  statValue: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#e2e8f0",
    letterSpacing: "-0.02em",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  statLabel: {
    fontSize: "12px",
    color: "#8b97b0",
    marginTop: "4px",
  },
  statSub: {
    fontSize: "11px",
    color: "#3d4a5c",
    marginTop: "2px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  section: {
    marginBottom: "40px",
  },
  sectionHeader: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "6px",
  },
  sectionSub: {
    fontSize: "13px",
    color: "#8b97b0",
    lineHeight: "1.6",
    maxWidth: "580px",
    marginBottom: "20px",
  },
  stackGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  stackCard: {
    display: "flex",
    gap: "14px",
    background: "#13181f",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "16px",
    alignItems: "flex-start",
  },
  stackIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stackCardBody: {
    flex: 1,
  },
  stackName: {
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "5px",
  },
  stackDesc: {
    fontSize: "12px",
    color: "#8b97b0",
    lineHeight: "1.6",
  },
  archRow: {
    display: "flex",
    alignItems: "center",
    gap: "0px",
    flexWrap: "wrap",
    background: "#13181f",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px",
    padding: "20px 24px",
    marginTop: "16px",
  },
  archGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0px",
  },
  archNode: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#8b97b0",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    padding: "6px 12px",
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: "nowrap",
  },
  archArrow: {
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
  },
  noticeBox: {
    background: "rgba(200,125,32,0.06)",
    border: "1px solid rgba(200,125,32,0.20)",
    borderRadius: "8px",
    padding: "16px 20px",
  },
  noticeTitle: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#f0a347",
    marginBottom: "6px",
  },
  noticeSub: {
    fontSize: "12px",
    color: "#8b97b0",
    lineHeight: "1.7",
  },
  code: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    background: "rgba(255,255,255,0.08)",
    padding: "1px 5px",
    borderRadius: "3px",
    color: "#c5d0e0",
  },
};
