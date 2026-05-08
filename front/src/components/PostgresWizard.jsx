import { useState, useEffect } from "react";

const STEPS = [
  { id: 1, label: "Connection" },
  { id: 2, label: "Ingestion setup" },
  { id: 3, label: "Source" },
  { id: 4, label: "Destination" },
  { id: 5, label: "Schedules" },
];

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconEye = ({ open }) =>
  open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function Field({ label, required, error, children }) {
  return (
    <div style={fieldStyles.wrap}>
      <label style={fieldStyles.label}>
        {label}
        {required && <span style={fieldStyles.req}>*</span>}
      </label>
      {children}
      {error && <div style={fieldStyles.errMsg}>{error}</div>}
    </div>
  );
}

const fieldStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "500", color: "#8b97b0" },
  req: { color: "#d94f4f", marginLeft: "3px" },
  errMsg: { fontSize: "11px", color: "#f07070", marginTop: "2px" },
};

function TextInput({ value, onChange, placeholder, type = "text", mono = false, error, suffix }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "#0d1219",
          border: `1px solid ${error ? "#d94f4f" : "rgba(255,255,255,0.10)"}`,
          borderRadius: "6px",
          padding: suffix ? "8px 36px 8px 12px" : "8px 12px",
          fontSize: "13px",
          fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
          color: "#e2e8f0",
          outline: "none",
          transition: "border-color 0.15s ease",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = "#1e6ef4";
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = "rgba(255,255,255,0.10)";
        }}
      />
      {suffix && (
        <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
          {suffix}
        </div>
      )}
    </div>
  );
}

function StepIndicator({ currentStep }) {
  return (
    <div style={stepStyles.sidebar}>
      {STEPS.map((s) => {
        const done = s.id < currentStep;
        const active = s.id === currentStep;
        return (
          <div key={s.id} style={stepStyles.row}>
            <div
              style={{
                ...stepStyles.circle,
                ...(active ? stepStyles.circleActive : {}),
                ...(done ? stepStyles.circleDone : {}),
              }}
            >
              {done ? <IconCheck /> : s.id}
            </div>
            <div
              style={{
                ...stepStyles.label,
                color: active ? "#e2e8f0" : done ? "#4a9eff" : "#59647a",
                fontWeight: active ? "500" : "400",
              }}
            >
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const stepStyles = {
  sidebar: {
    width: "180px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0",
    paddingTop: "4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "9px 0",
  },
  circle: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "500",
    color: "#59647a",
    flexShrink: 0,
  },
  circleActive: {
    background: "#1e6ef4",
    borderColor: "#1e6ef4",
    color: "#fff",
  },
  circleDone: {
    background: "rgba(26,158,110,0.15)",
    borderColor: "rgba(26,158,110,0.40)",
    color: "#2ec995",
  },
  label: {
    fontSize: "13px",
    transition: "color 0.15s",
  },
};

function ConnectionStep({ form, setForm, errors, testState, onTest, onNext }) {
  const [showPw, setShowPw] = useState(false);

  const jdbcStr = `jdbc:postgresql://${form.host || "<host>"}:${form.port || "5432"}/${form.database || "<database>"}`;

  return (
    <div>
      <h2 style={wizardStyles.stepTitle}>Connection</h2>
      <p style={wizardStyles.stepDesc}>Provide credentials to connect to the source.</p>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Network configuration</div>
        <a href="#" style={{ fontSize: "12px", color: "#4a9eff" }}>
          Learn more about setting up network access to your data source
        </a>
      </div>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Connection to the source</div>

        <div style={wizardStyles.formGrid}>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Host" required error={errors.host}>
              <TextInput
                value={form.host}
                onChange={(v) => setForm({ ...form, host: v })}
                placeholder="db.company.com"
                mono
                error={errors.host}
              />
            </Field>
          </div>

          <Field label="Port" required error={errors.port}>
            <TextInput
              value={form.port}
              onChange={(v) => setForm({ ...form, port: v })}
              placeholder="5432"
              mono
              error={errors.port}
            />
          </Field>

          <Field label="Database name" required error={errors.database}>
            <TextInput
              value={form.database}
              onChange={(v) => setForm({ ...form, database: v })}
              placeholder="analytics_db"
              mono
              error={errors.database}
            />
          </Field>

          <Field label="Username" required error={errors.username}>
            <TextInput
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              placeholder="db_user"
              mono
              error={errors.username}
            />
          </Field>

          <Field label="Password" required error={errors.password}>
            <TextInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="••••••••"
              type={showPw ? "text" : "password"}
              mono
              error={errors.password}
              suffix={
                <button
                  onClick={() => setShowPw(!showPw)}
                  style={{ background: "none", border: "none", color: "#59647a", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#8b97b0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#59647a")}
                >
                  <IconEye open={showPw} />
                </button>
              }
            />
          </Field>
        </div>

        <div style={wizardStyles.jdbcPreview}>
          <div style={wizardStyles.jdbcLabel}>JDBC string preview</div>
          <code style={wizardStyles.jdbcCode}>{jdbcStr}</code>
        </div>
      </div>

      <div style={wizardStyles.actionRow}>
        {testState === "idle" && (
          <button style={btnStyles.primary} onClick={onTest}>
            Test connection
          </button>
        )}

        {testState === "loading" && (
          <button style={{ ...btnStyles.primary, opacity: 0.7 }} disabled>
            <div style={spinnerStyle} />
            Testing...
          </button>
        )}

        {testState === "success" && (
          <div style={wizardStyles.statusRow}>
            <div style={wizardStyles.successPill}>
              <div style={{ ...dotStyle, background: "#2ec995" }} />
              Connection successful
            </div>
            <button style={btnStyles.ghost} onClick={onTest}>Re-test</button>
          </div>
        )}

        {testState === "error" && (
          <div style={wizardStyles.statusRow}>
            <div style={wizardStyles.errorPill}>
              <div style={{ ...dotStyle, background: "#f07070" }} />
              Connection failed — check credentials
            </div>
            <button style={btnStyles.ghost} onClick={onTest}>Retry</button>
          </div>
        )}
      </div>

      {testState === "success" && (
        <div style={{ marginTop: "14px" }} className="fade-in">
          <button style={btnStyles.success} onClick={onNext}>
            Next
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function IngestionStep({ form, setForm, onNext, onBack }) {
  return (
    <div>
      <h2 style={wizardStyles.stepTitle}>Ingestion setup</h2>
      <p style={wizardStyles.stepDesc}>Configure how data will be ingested from the source.</p>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Pipeline name</div>
        <Field label="Name" required>
          <TextInput
            value={form.pipelineName}
            onChange={(v) => setForm({ ...form, pipelineName: v })}
            placeholder={`${form.database || "postgres"}_ingestion`}
            mono
          />
        </Field>
      </div>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Ingestion mode</div>
        {[
          {
            value: "full_refresh",
            label: "Full refresh",
            desc: "Truncate the destination table and reload all data on every run. Suitable for small, frequently-changing tables.",
          },
          {
            value: "incremental",
            label: "Incremental (CDC)",
            desc: "Capture only new and changed rows using a watermark column. Requires a monotonically increasing column.",
          },
          {
            value: "snapshot_merge",
            label: "Snapshot and merge",
            desc: "Load a full snapshot and merge it into the existing Delta table using a primary key. Handles deletes.",
          },
        ].map((opt) => (
          <label
            key={opt.value}
            style={{
              ...wizardStyles.radioRow,
              borderColor: form.mode === opt.value
                ? "rgba(30,110,244,0.40)"
                : "rgba(255,255,255,0.07)",
              background: form.mode === opt.value
                ? "rgba(30,110,244,0.06)"
                : "#13181f",
            }}
          >
            <input
              type="radio"
              name="mode"
              value={opt.value}
              checked={form.mode === opt.value}
              onChange={() => setForm({ ...form, mode: opt.value })}
              style={{ accentColor: "#1e6ef4", marginTop: "2px", flexShrink: 0 }}
            />
            <div>
              <div style={wizardStyles.radioLabel}>{opt.label}</div>
              <div style={wizardStyles.radioDesc}>{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={wizardStyles.footerRow}>
        <button style={btnStyles.ghost} onClick={onBack}>Back</button>
        <button style={btnStyles.primary} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function SourceStep({ form, setForm, onNext, onBack }) {
  return (
    <div>
      <h2 style={wizardStyles.stepTitle}>Source</h2>
      <p style={wizardStyles.stepDesc}>Select which tables to ingest from your PostgreSQL database.</p>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Schema and table selection</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Schema">
            <TextInput
              value={form.schema}
              onChange={(v) => setForm({ ...form, schema: v })}
              placeholder="public"
              mono
            />
          </Field>
          <Field label="Table">
            <TextInput
              value={form.table}
              onChange={(v) => setForm({ ...form, table: v })}
              placeholder="orders"
              mono
            />
          </Field>
        </div>

        {form.mode === "incremental" && (
          <div style={{ marginTop: "14px" }}>
            <Field label="Watermark column" required>
              <TextInput
                value={form.watermark}
                onChange={(v) => setForm({ ...form, watermark: v })}
                placeholder="updated_at"
                mono
              />
            </Field>
            <div style={{ fontSize: "11px", color: "#59647a", marginTop: "6px" }}>
              Must be a column that increases monotonically with each insert or update (e.g., a timestamp or auto-increment integer).
            </div>
          </div>
        )}
      </div>

      <div style={wizardStyles.footerRow}>
        <button style={btnStyles.ghost} onClick={onBack}>Back</button>
        <button style={btnStyles.primary} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function DestinationStep({ form, setForm, onNext, onBack }) {
  return (
    <div>
      <h2 style={wizardStyles.stepTitle}>Destination</h2>
      <p style={wizardStyles.stepDesc}>Configure where data will land in Delta Lake.</p>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Delta Lake target</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Field label="Catalog">
            <TextInput
              value={form.catalog}
              onChange={(v) => setForm({ ...form, catalog: v })}
              placeholder="fusion_catalog"
              mono
            />
          </Field>
          <Field label="Schema">
            <TextInput
              value={form.destSchema}
              onChange={(v) => setForm({ ...form, destSchema: v })}
              placeholder="raw"
              mono
            />
          </Field>
          <Field label="Table name">
            <TextInput
              value={form.destTable}
              onChange={(v) => setForm({ ...form, destTable: v })}
              placeholder={form.table || "dest_table"}
              mono
            />
          </Field>
        </div>
      </div>

      <div style={wizardStyles.jdbcPreview}>
        <div style={wizardStyles.jdbcLabel}>Target path</div>
        <code style={wizardStyles.jdbcCode}>
          {`${form.catalog || "catalog"}.${form.destSchema || "schema"}.${form.destTable || form.table || "table"}`}
        </code>
      </div>

      <div style={wizardStyles.footerRow}>
        <button style={btnStyles.ghost} onClick={onBack}>Back</button>
        <button style={btnStyles.primary} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function ScheduleStep({ form, setForm, onSubmit, onBack, submitting, submitted }) {
  return (
    <div>
      <h2 style={wizardStyles.stepTitle}>Schedules and notifications</h2>
      <p style={wizardStyles.stepDesc}>Set how often the pipeline runs and who gets notified.</p>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Run schedule</div>
        {[
          { value: "manual", label: "Manual", desc: "Trigger runs manually from the UI or API." },
          { value: "hourly", label: "Every hour", desc: "Run once per hour, starting after the first manual trigger." },
          { value: "daily", label: "Daily", desc: "Run once per day at the configured time." },
          { value: "custom", label: "Custom cron", desc: "Provide a cron expression for advanced scheduling." },
        ].map((opt) => (
          <label
            key={opt.value}
            style={{
              ...wizardStyles.radioRow,
              borderColor: form.schedule === opt.value
                ? "rgba(30,110,244,0.40)"
                : "rgba(255,255,255,0.07)",
              background: form.schedule === opt.value
                ? "rgba(30,110,244,0.06)"
                : "#13181f",
            }}
          >
            <input
              type="radio"
              name="schedule"
              value={opt.value}
              checked={form.schedule === opt.value}
              onChange={() => setForm({ ...form, schedule: opt.value })}
              style={{ accentColor: "#1e6ef4", marginTop: "2px", flexShrink: 0 }}
            />
            <div>
              <div style={wizardStyles.radioLabel}>{opt.label}</div>
              <div style={wizardStyles.radioDesc}>{opt.desc}</div>
            </div>
          </label>
        ))}

        {form.schedule === "custom" && (
          <div style={{ marginTop: "12px" }}>
            <Field label="Cron expression">
              <TextInput
                value={form.cron}
                onChange={(v) => setForm({ ...form, cron: v })}
                placeholder="0 */6 * * *"
                mono
              />
            </Field>
          </div>
        )}
      </div>

      <div style={wizardStyles.subsection}>
        <div style={wizardStyles.subsectionTitle}>Notification email (optional)</div>
        <Field label="Email">
          <TextInput
            value={form.notifyEmail}
            onChange={(v) => setForm({ ...form, notifyEmail: v })}
            placeholder="team@company.com"
          />
        </Field>
      </div>

      {submitted ? (
        <div style={wizardStyles.finalSuccess} className="fade-in">
          <div style={wizardStyles.finalSuccessTitle}>Pipeline created</div>
          <div style={wizardStyles.finalSuccessDesc}>
            Your pipeline has been registered. Airflow will pick it up on the next scheduler heartbeat.
            The payload below has been sent to the Java REST API (mock).
          </div>
          <div style={wizardStyles.payloadBox}>
            <code style={wizardStyles.payloadCode}>
              {JSON.stringify(form, null, 2)}
            </code>
          </div>
        </div>
      ) : (
        <div style={wizardStyles.footerRow}>
          <button style={btnStyles.ghost} onClick={onBack}>Back</button>
          <button
            style={submitting ? { ...btnStyles.success, opacity: 0.7 } : btnStyles.success}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div style={spinnerStyle} />
                Creating pipeline...
              </>
            ) : (
              "Create pipeline"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostgresWizard({ onBack }) {
  const [step, setStep] = useState(1);
  const [testState, setTestState] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    pipelineName: "",
    mode: "full_refresh",
    schema: "public",
    table: "",
    watermark: "",
    catalog: "fusion_catalog",
    destSchema: "raw",
    destTable: "",
    schedule: "manual",
    cron: "",
    notifyEmail: "",
  });

  const validate = () => {
    const e = {};
    if (!form.host.trim()) e.host = "Host is required";
    if (!form.port.trim() || isNaN(parseInt(form.port))) e.port = "Valid port required";
    if (!form.database.trim()) e.database = "Database name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.password.trim()) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleTest = () => {
    if (!validate()) return;
    setTestState("loading");
    setTimeout(() => {
      setTestState(form.host === "fail" ? "error" : "success");
    }, 2000);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      console.log("[Fusion Platform] POST /api/v1/pipelines", JSON.stringify(form, null, 2));
    }, 2000);
  };

  return (
    <div style={wizardStyles.page} className="fade-in">
      <div style={wizardStyles.topBar}>
        <button
          style={wizardStyles.backBtn}
          onClick={onBack}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8b97b0")}
        >
          <IconBack />
          Add data
        </button>
        <span style={{ color: "#3d4a5c" }}>/</span>
        <span style={wizardStyles.breadcrumbCurrent}>Ingest data from PostgreSQL</span>
      </div>

      <div style={wizardStyles.layout}>
        <StepIndicator currentStep={step} />

        <div style={wizardStyles.panel}>
          {step === 1 && (
            <ConnectionStep
              form={form}
              setForm={setForm}
              errors={errors}
              testState={testState}
              onTest={handleTest}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <IngestionStep
              form={form}
              setForm={setForm}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <SourceStep
              form={form}
              setForm={setForm}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <DestinationStep
              form={form}
              setForm={setForm}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <ScheduleStep
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onBack={() => setStep(4)}
              submitting={submitting}
              submitted={submitted}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const spinnerStyle = {
  width: "13px",
  height: "13px",
  border: "2px solid rgba(255,255,255,0.2)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
  flexShrink: 0,
};

const dotStyle = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  flexShrink: 0,
};

const btnStyles = {
  primary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "#1e6ef4",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: "background 0.15s ease",
  },
  ghost: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "transparent",
    color: "#8b97b0",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "400",
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  success: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    background: "#1a9e6e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
};

const wizardStyles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 32px 60px",
  },
  topBar: {
    height: "48px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "32px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    fontSize: "13px",
    color: "#8b97b0",
    cursor: "pointer",
    padding: 0,
    fontFamily: "'IBM Plex Sans', sans-serif",
    transition: "color 0.12s ease",
  },
  breadcrumbCurrent: {
    fontSize: "13px",
    color: "#e2e8f0",
    fontWeight: "500",
  },
  layout: {
    display: "flex",
    gap: "48px",
    alignItems: "flex-start",
  },
  panel: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "6px",
    letterSpacing: "-0.01em",
  },
  stepDesc: {
    fontSize: "13px",
    color: "#8b97b0",
    marginBottom: "28px",
    lineHeight: "1.6",
  },
  subsection: {
    marginBottom: "24px",
  },
  subsectionTitle: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#59647a",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  jdbcPreview: {
    background: "#0d1219",
    border: "1px dashed rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "10px 14px",
    marginTop: "16px",
  },
  jdbcLabel: {
    fontSize: "10px",
    fontWeight: "500",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#3d4a5c",
    marginBottom: "5px",
  },
  jdbcCode: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    color: "#4a9eff",
    wordBreak: "break-all",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "4px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  successPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(26,158,110,0.10)",
    border: "1px solid rgba(26,158,110,0.28)",
    borderRadius: "20px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#2ec995",
  },
  errorPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(217,79,79,0.10)",
    border: "1px solid rgba(217,79,79,0.25)",
    borderRadius: "20px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#f07070",
  },
  footerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  radioRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.07)",
    cursor: "pointer",
    marginBottom: "8px",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  radioLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#e2e8f0",
    marginBottom: "3px",
  },
  radioDesc: {
    fontSize: "12px",
    color: "#8b97b0",
    lineHeight: "1.5",
  },
  finalSuccess: {
    background: "rgba(26,158,110,0.07)",
    border: "1px solid rgba(26,158,110,0.25)",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px",
  },
  finalSuccessTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2ec995",
    marginBottom: "8px",
  },
  finalSuccessDesc: {
    fontSize: "12px",
    color: "#8b97b0",
    lineHeight: "1.6",
    marginBottom: "14px",
  },
  payloadBox: {
    background: "#0d1219",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "6px",
    padding: "12px 14px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  payloadCode: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    color: "#8b97b0",
    display: "block",
    whiteSpace: "pre",
  },
};
