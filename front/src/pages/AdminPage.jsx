import { useState } from "react";
import { api } from "../api/endpoints";
import { useApi } from "../hooks/useApi";

function Section({ title, description, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>{title}</div>
        {description && <div style={styles.sectionDesc}>{description}</div>}
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} style={{ ...styles.input, ...props.style }} />;
}

function TextArea(props) {
  return <textarea {...props} style={{ ...styles.textarea, ...props.style }} />;
}

function Button({ variant = "primary", ...props }) {
  const variantStyle = styles[variant] || styles.primary;
  return <button {...props} style={{ ...variantStyle, ...props.style }} />;
}

function CodeBlock({ value }) {
  if (value === undefined || value === null) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre style={styles.code}>{text}</pre>;
}

function ErrorText({ message }) {
  if (!message) return null;
  return <div style={styles.errorText}>{message}</div>;
}

export default function AdminPage() {
  // Connections
  const [connectionForm, setConnectionForm] = useState({
    host: "localhost",
    port: "5432",
    database: "example_db",
    user: "postgres",
    password: "postgres",
  });
  const { execute: fetchConnection, data: connectionData, loading: connectionLoading, error: connectionError } = useApi(api.getConnection);
  const { execute: testConnection, data: testConnectionData, loading: testConnectionLoading, error: testConnectionError } = useApi(api.testConnection);
  const { execute: saveConnection, data: saveConnectionData, loading: saveConnectionLoading, error: saveConnectionError } = useApi(api.saveConnection);

  // Sources
  const [schemaInput, setSchemaInput] = useState("public");
  const [includeViews, setIncludeViews] = useState(true);
  const [tableInput, setTableInput] = useState("");
  const [previewColumns, setPreviewColumns] = useState("");
  const [previewLimit, setPreviewLimit] = useState("20");
  const { execute: fetchSchemas, data: schemasData, loading: schemasLoading, error: schemasError } = useApi(api.getSchemas);
  const { execute: fetchTables, data: tablesData, loading: tablesLoading, error: tablesError } = useApi(api.getTables);
  const { execute: fetchColumns, data: columnsData, loading: columnsLoading, error: columnsError } = useApi(api.getColumns);
  const { execute: fetchPreview, data: previewData, loading: previewLoading, error: previewError } = useApi(api.getPreview);

  // Pipelines
  const { execute: fetchPipelines, data: pipelinesData, loading: pipelinesLoading, error: pipelinesError } = useApi(api.getPipelines);
  const [pipelineId, setPipelineId] = useState("");
  const { execute: fetchPipeline, data: pipelineData, loading: pipelineLoading, error: pipelineError } = useApi(api.getPipeline);
  const [validatePayload, setValidatePayload] = useState("{\n  \"name\": \"Orders incremental\",\n  \"source\": {\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"columns\": []\n  },\n  \"ingestion\": {\n    \"mode\": \"incremental\",\n    \"watermarkColumn\": \"updated_at\"\n  },\n  \"destination\": {\n    \"path\": \"../delta/orders_incremental\",\n    \"mode\": \"append\"\n  },\n  \"schedule\": {\n    \"cron\": \"0 * * * *\"\n  }\n}");
  const [validateError, setValidateError] = useState("");
  const { execute: validatePipeline, data: validateData, loading: validateLoading, error: validateApiError } = useApi(api.validatePipeline);
  const [updatePayload, setUpdatePayload] = useState("{\n  \"name\": \"Orders hourly\"\n}");
  const [updateError, setUpdateError] = useState("");
  const { execute: updatePipeline, data: updateData, loading: updateLoading, error: updateApiError } = useApi(api.updatePipeline);
  const [deletePipelineId, setDeletePipelineId] = useState("");
  const { execute: deletePipeline, data: deleteData, loading: deleteLoading, error: deleteError } = useApi(api.deletePipeline);

  // Schedules and Alerts
  const [schedulePipelineId, setSchedulePipelineId] = useState("");
  const { execute: fetchSchedules, data: schedulesData, loading: schedulesLoading, error: schedulesError } = useApi(api.getSchedules);
  const [alertPipelineId, setAlertPipelineId] = useState("");
  const { execute: fetchAlerts, data: alertsData, loading: alertsLoading, error: alertsError } = useApi(api.getAlerts);

  // Global runs
  const [runsQuery, setRunsQuery] = useState({ limit: "", offset: "", orderBy: "", state: "" });
  const { execute: fetchRuns, data: runsData, loading: runsLoading, error: runsError } = useApi(api.getRuns);
  const [runTriggerId, setRunTriggerId] = useState("");
  const [runTriggerConf, setRunTriggerConf] = useState("{}");
  const [runTriggerError, setRunTriggerError] = useState("");
  const { execute: triggerRun, data: triggerRunData, loading: triggerRunLoading, error: triggerRunError } = useApi(api.triggerRun);
  const [runId, setRunId] = useState("");
  const { execute: fetchRun, data: runData, loading: runLoading, error: runError } = useApi(api.getRun);
  const [runTasksId, setRunTasksId] = useState("");
  const { execute: fetchRunTasks, data: runTasksData, loading: runTasksLoading, error: runTasksError } = useApi(api.getRunTasks);

  // Pipeline runs
  const [pipelineRunsId, setPipelineRunsId] = useState("");
  const [pipelineRunsQuery, setPipelineRunsQuery] = useState({ limit: "", offset: "", orderBy: "", state: "" });
  const { execute: fetchPipelineRuns, data: pipelineRunsData, loading: pipelineRunsLoading, error: pipelineRunsError } = useApi(api.getPipelineRuns);
  const [pipelineTriggerId, setPipelineTriggerId] = useState("");
  const [pipelineTriggerConf, setPipelineTriggerConf] = useState("{}");
  const [pipelineTriggerError, setPipelineTriggerError] = useState("");
  const { execute: triggerPipelineRun, data: triggerPipelineData, loading: triggerPipelineLoading, error: triggerPipelineError } = useApi(api.triggerPipelineRun);
  const [pipelineRunLookupId, setPipelineRunLookupId] = useState("");
  const [pipelineRunId, setPipelineRunId] = useState("");
  const { execute: fetchPipelineRun, data: pipelineRunData, loading: pipelineRunLoading, error: pipelineRunError } = useApi(api.getPipelineRun);
  const [pipelineRunTasksId, setPipelineRunTasksId] = useState("");
  const [pipelineRunTasksRunId, setPipelineRunTasksRunId] = useState("");
  const { execute: fetchPipelineRunTasks, data: pipelineRunTasksData, loading: pipelineRunTasksLoading, error: pipelineRunTasksError } = useApi(api.getPipelineRunTasks);

  // Logs
  const [logRunId, setLogRunId] = useState("");
  const [logTaskId, setLogTaskId] = useState("");
  const [logTryNumber, setLogTryNumber] = useState("1");
  const { execute: fetchRunLog, data: runLogData, loading: runLogLoading, error: runLogError } = useApi(api.getRunTaskLog);
  const [pipelineLogPipelineId, setPipelineLogPipelineId] = useState("");
  const [pipelineLogRunId, setPipelineLogRunId] = useState("");
  const [pipelineLogTaskId, setPipelineLogTaskId] = useState("");
  const [pipelineLogTryNumber, setPipelineLogTryNumber] = useState("1");
  const { execute: fetchPipelineRunLog, data: pipelineRunLogData, loading: pipelineRunLogLoading, error: pipelineRunLogError } = useApi(api.getPipelineRunTaskLog);

  const handleSaveConnection = async () => {
    await saveConnection({
      host: connectionForm.host,
      port: Number(connectionForm.port),
      database: connectionForm.database,
      user: connectionForm.user,
      password: connectionForm.password,
      trustServerCertificate: true,
    });
  };

  const handleValidate = async () => {
    setValidateError("");
    try {
      const parsed = JSON.parse(validatePayload);
      await validatePipeline(parsed);
    } catch (err) {
      setValidateError(err.message || "Invalid JSON payload");
    }
  };

  const handleUpdatePipeline = async () => {
    setUpdateError("");
    if (!pipelineId.trim()) {
      setUpdateError("Pipeline ID is required");
      return;
    }
    try {
      const parsed = JSON.parse(updatePayload);
      await updatePipeline(pipelineId.trim(), parsed);
    } catch (err) {
      setUpdateError(err.message || "Invalid JSON payload");
    }
  };

  const handleDeletePipeline = async () => {
    if (!deletePipelineId.trim()) return;
    await deletePipeline(deletePipelineId.trim());
  };

  const handleFetchRuns = async () => {
    await fetchRuns({
      limit: runsQuery.limit || undefined,
      offset: runsQuery.offset || undefined,
      orderBy: runsQuery.orderBy || undefined,
      state: runsQuery.state || undefined,
    });
  };

  const handleTriggerRun = async () => {
    setRunTriggerError("");
    try {
      const conf = runTriggerConf.trim() ? JSON.parse(runTriggerConf) : undefined;
      await triggerRun({
        dagRunId: runTriggerId.trim() || undefined,
        conf,
      });
    } catch (err) {
      setRunTriggerError(err.message || "Invalid JSON payload");
    }
  };

  const handleFetchPipelineRuns = async () => {
    if (!pipelineRunsId.trim()) return;
    await fetchPipelineRuns(pipelineRunsId.trim(), {
      limit: pipelineRunsQuery.limit || undefined,
      offset: pipelineRunsQuery.offset || undefined,
      orderBy: pipelineRunsQuery.orderBy || undefined,
      state: pipelineRunsQuery.state || undefined,
    });
  };

  const handleTriggerPipelineRun = async () => {
    setPipelineTriggerError("");
    if (!pipelineTriggerId.trim()) return;
    try {
      const conf = pipelineTriggerConf.trim() ? JSON.parse(pipelineTriggerConf) : undefined;
      await triggerPipelineRun(pipelineTriggerId.trim(), {
        dagRunId: undefined,
        conf,
      });
    } catch (err) {
      setPipelineTriggerError(err.message || "Invalid JSON payload");
    }
  };

  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.topBar}>
        <div style={styles.breadcrumbs}>
          <span style={styles.breadcrumbMuted}>Operations</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbActive}>API Console</span>
        </div>
      </div>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Admin API Console</h1>
        <p style={styles.pageDesc}>
          Minimal admin/debug UI to exercise every backend endpoint. Results render below each action.
        </p>
      </div>

      <Section title="Connections" description="View, test, and save Postgres connection settings.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Current connection</div>
            <Button onClick={() => fetchConnection()}>Fetch connection</Button>
            {connectionLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={connectionError} />
            <CodeBlock value={connectionData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Test connection</div>
            <Button variant="secondary" onClick={() => testConnection()}>Test now</Button>
            {testConnectionLoading && <div style={styles.muted}>Running...</div>}
            <ErrorText message={testConnectionError} />
            <CodeBlock value={testConnectionData} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Save connection</div>
          <div style={styles.gridTwo}>
            <Field label="Host">
              <Input value={connectionForm.host} onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })} />
            </Field>
            <Field label="Port">
              <Input value={connectionForm.port} onChange={(e) => setConnectionForm({ ...connectionForm, port: e.target.value })} />
            </Field>
            <Field label="Database">
              <Input value={connectionForm.database} onChange={(e) => setConnectionForm({ ...connectionForm, database: e.target.value })} />
            </Field>
            <Field label="User">
              <Input value={connectionForm.user} onChange={(e) => setConnectionForm({ ...connectionForm, user: e.target.value })} />
            </Field>
            <Field label="Password">
              <Input type="password" value={connectionForm.password} onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })} />
            </Field>
          </div>
          <Button onClick={handleSaveConnection} style={{ marginTop: 12 }}>
            {saveConnectionLoading ? "Saving..." : "Save connection"}
          </Button>
          <ErrorText message={saveConnectionError} />
          <CodeBlock value={saveConnectionData} />
        </div>
      </Section>

      <Section title="Source discovery" description="Schemas, tables, columns, and preview data.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Schemas</div>
            <Button variant="secondary" onClick={() => fetchSchemas()}>Load schemas</Button>
            {schemasLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={schemasError} />
            <CodeBlock value={schemasData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Tables</div>
            <Field label="Schema">
              <Input value={schemaInput} onChange={(e) => setSchemaInput(e.target.value)} />
            </Field>
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={includeViews} onChange={(e) => setIncludeViews(e.target.checked)} />
              <span>Include views</span>
            </label>
            <Button variant="secondary" onClick={() => fetchTables(schemaInput || "public", includeViews)}>
              Load tables
            </Button>
            {tablesLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={tablesError} />
            <CodeBlock value={tablesData} />
          </div>
        </div>

        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Columns</div>
            <Field label="Schema">
              <Input value={schemaInput} onChange={(e) => setSchemaInput(e.target.value)} />
            </Field>
            <Field label="Table">
              <Input value={tableInput} onChange={(e) => setTableInput(e.target.value)} placeholder="orders" />
            </Field>
            <Button variant="secondary" onClick={() => fetchColumns(tableInput || "", schemaInput || "public")}>Load columns</Button>
            {columnsLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={columnsError} />
            <CodeBlock value={columnsData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Preview rows</div>
            <Field label="Schema">
              <Input value={schemaInput} onChange={(e) => setSchemaInput(e.target.value)} />
            </Field>
            <Field label="Table">
              <Input value={tableInput} onChange={(e) => setTableInput(e.target.value)} placeholder="orders" />
            </Field>
            <Field label="Columns (comma-separated)">
              <Input value={previewColumns} onChange={(e) => setPreviewColumns(e.target.value)} placeholder="id,updated_at" />
            </Field>
            <Field label="Limit">
              <Input value={previewLimit} onChange={(e) => setPreviewLimit(e.target.value)} />
            </Field>
            <Button
              variant="secondary"
              onClick={() => fetchPreview(
                tableInput || "",
                schemaInput || "public",
                Number(previewLimit) || 20,
                previewColumns.trim() ? previewColumns.split(",").map((c) => c.trim()).filter(Boolean) : undefined
              )}
            >
              Load preview
            </Button>
            {previewLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={previewError} />
            <CodeBlock value={previewData} />
          </div>
        </div>
      </Section>

      <Section title="Pipelines" description="List, validate, inspect, update, and delete pipelines.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>List pipelines</div>
            <Button onClick={() => fetchPipelines()}>Refresh list</Button>
            {pipelinesLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={pipelinesError} />
            <CodeBlock value={pipelinesData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Fetch pipeline</div>
            <Field label="Pipeline ID">
              <Input value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchPipeline(pipelineId.trim())}>Fetch by ID</Button>
            {pipelineLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={pipelineError} />
            <CodeBlock value={pipelineData} />
          </div>
        </div>

        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Validate pipeline payload</div>
            <TextArea value={validatePayload} onChange={(e) => setValidatePayload(e.target.value)} rows={10} />
            <Button variant="secondary" onClick={handleValidate}>
              {validateLoading ? "Validating..." : "Validate"}
            </Button>
            <ErrorText message={validateError || validateApiError} />
            <CodeBlock value={validateData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Update pipeline</div>
            <Field label="Pipeline ID">
              <Input value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} />
            </Field>
            <TextArea value={updatePayload} onChange={(e) => setUpdatePayload(e.target.value)} rows={8} />
            <Button variant="secondary" onClick={handleUpdatePipeline}>
              {updateLoading ? "Updating..." : "Update"}
            </Button>
            <ErrorText message={updateError || updateApiError} />
            <CodeBlock value={updateData} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Delete pipeline</div>
          <Field label="Pipeline ID">
            <Input value={deletePipelineId} onChange={(e) => setDeletePipelineId(e.target.value)} />
          </Field>
          <Button variant="danger" onClick={handleDeletePipeline}>
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
          <ErrorText message={deleteError} />
          <CodeBlock value={deleteData} />
        </div>
      </Section>

      <Section title="Schedules and alerts" description="Inspect scheduling and alert status by pipeline.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Schedules</div>
            <Field label="Pipeline ID (optional)">
              <Input value={schedulePipelineId} onChange={(e) => setSchedulePipelineId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchSchedules(schedulePipelineId.trim() || undefined)}>
              Load schedules
            </Button>
            {schedulesLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={schedulesError} />
            <CodeBlock value={schedulesData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Alerts</div>
            <Field label="Pipeline ID (optional)">
              <Input value={alertPipelineId} onChange={(e) => setAlertPipelineId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchAlerts(alertPipelineId.trim() || undefined)}>
              Load alerts
            </Button>
            {alertsLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={alertsError} />
            <CodeBlock value={alertsData} />
          </div>
        </div>
      </Section>

      <Section title="Ingestion runs (global)" description="Trigger and inspect runs on the global DAG.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>List runs</div>
            <div style={styles.gridTwo}>
              <Field label="Limit"><Input value={runsQuery.limit} onChange={(e) => setRunsQuery({ ...runsQuery, limit: e.target.value })} /></Field>
              <Field label="Offset"><Input value={runsQuery.offset} onChange={(e) => setRunsQuery({ ...runsQuery, offset: e.target.value })} /></Field>
              <Field label="Order by"><Input value={runsQuery.orderBy} onChange={(e) => setRunsQuery({ ...runsQuery, orderBy: e.target.value })} placeholder="-execution_date" /></Field>
              <Field label="State"><Input value={runsQuery.state} onChange={(e) => setRunsQuery({ ...runsQuery, state: e.target.value })} placeholder="success" /></Field>
            </div>
            <Button variant="secondary" onClick={handleFetchRuns}>Load runs</Button>
            {runsLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={runsError} />
            <CodeBlock value={runsData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Trigger run</div>
            <Field label="Run ID (optional)">
              <Input value={runTriggerId} onChange={(e) => setRunTriggerId(e.target.value)} />
            </Field>
            <Field label="Conf (JSON)">
              <TextArea value={runTriggerConf} onChange={(e) => setRunTriggerConf(e.target.value)} rows={5} />
            </Field>
            <Button variant="secondary" onClick={handleTriggerRun}>
              {triggerRunLoading ? "Triggering..." : "Trigger"}
            </Button>
            <ErrorText message={runTriggerError || triggerRunError} />
            <CodeBlock value={triggerRunData} />
          </div>
        </div>

        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Get run</div>
            <Field label="Run ID">
              <Input value={runId} onChange={(e) => setRunId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchRun(runId.trim())}>Fetch run</Button>
            {runLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={runError} />
            <CodeBlock value={runData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Get run tasks</div>
            <Field label="Run ID">
              <Input value={runTasksId} onChange={(e) => setRunTasksId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchRunTasks(runTasksId.trim())}>Fetch tasks</Button>
            {runTasksLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={runTasksError} />
            <CodeBlock value={runTasksData} />
          </div>
        </div>
      </Section>

      <Section title="Ingestion runs (pipeline-specific)" description="Trigger and inspect runs per pipeline DAG.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>List pipeline runs</div>
            <Field label="Pipeline ID">
              <Input value={pipelineRunsId} onChange={(e) => setPipelineRunsId(e.target.value)} />
            </Field>
            <div style={styles.gridTwo}>
              <Field label="Limit"><Input value={pipelineRunsQuery.limit} onChange={(e) => setPipelineRunsQuery({ ...pipelineRunsQuery, limit: e.target.value })} /></Field>
              <Field label="Offset"><Input value={pipelineRunsQuery.offset} onChange={(e) => setPipelineRunsQuery({ ...pipelineRunsQuery, offset: e.target.value })} /></Field>
              <Field label="Order by"><Input value={pipelineRunsQuery.orderBy} onChange={(e) => setPipelineRunsQuery({ ...pipelineRunsQuery, orderBy: e.target.value })} /></Field>
              <Field label="State"><Input value={pipelineRunsQuery.state} onChange={(e) => setPipelineRunsQuery({ ...pipelineRunsQuery, state: e.target.value })} /></Field>
            </div>
            <Button variant="secondary" onClick={handleFetchPipelineRuns}>Load runs</Button>
            {pipelineRunsLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={pipelineRunsError} />
            <CodeBlock value={pipelineRunsData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Trigger pipeline run</div>
            <Field label="Pipeline ID">
              <Input value={pipelineTriggerId} onChange={(e) => setPipelineTriggerId(e.target.value)} />
            </Field>
            <Field label="Conf (JSON)">
              <TextArea value={pipelineTriggerConf} onChange={(e) => setPipelineTriggerConf(e.target.value)} rows={5} />
            </Field>
            <Button variant="secondary" onClick={handleTriggerPipelineRun}>
              {triggerPipelineLoading ? "Triggering..." : "Trigger"}
            </Button>
            <ErrorText message={pipelineTriggerError || triggerPipelineError} />
            <CodeBlock value={triggerPipelineData} />
          </div>
        </div>

        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Get pipeline run</div>
            <Field label="Pipeline ID">
              <Input value={pipelineRunLookupId} onChange={(e) => setPipelineRunLookupId(e.target.value)} />
            </Field>
            <Field label="Run ID">
              <Input value={pipelineRunId} onChange={(e) => setPipelineRunId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchPipelineRun(pipelineRunLookupId.trim(), pipelineRunId.trim())}>Fetch run</Button>
            {pipelineRunLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={pipelineRunError} />
            <CodeBlock value={pipelineRunData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Get pipeline run tasks</div>
            <Field label="Pipeline ID">
              <Input value={pipelineRunTasksId} onChange={(e) => setPipelineRunTasksId(e.target.value)} />
            </Field>
            <Field label="Run ID">
              <Input value={pipelineRunTasksRunId} onChange={(e) => setPipelineRunTasksRunId(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => fetchPipelineRunTasks(pipelineRunTasksId.trim(), pipelineRunTasksRunId.trim())}>Fetch tasks</Button>
            {pipelineRunTasksLoading && <div style={styles.muted}>Loading...</div>}
            <ErrorText message={pipelineRunTasksError} />
            <CodeBlock value={pipelineRunTasksData} />
          </div>
        </div>
      </Section>

      <Section title="Logs" description="Fetch task logs for global and pipeline runs.">
        <div style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Global run task log</div>
            <Field label="Run ID"><Input value={logRunId} onChange={(e) => setLogRunId(e.target.value)} /></Field>
            <Field label="Task ID"><Input value={logTaskId} onChange={(e) => setLogTaskId(e.target.value)} /></Field>
            <Field label="Try number"><Input value={logTryNumber} onChange={(e) => setLogTryNumber(e.target.value)} /></Field>
            <Button variant="secondary" onClick={() => fetchRunLog(logRunId.trim(), logTaskId.trim(), Number(logTryNumber) || 1)}>
              {runLogLoading ? "Loading..." : "Fetch log"}
            </Button>
            <ErrorText message={runLogError} />
            <CodeBlock value={runLogData?.content || runLogData} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Pipeline run task log</div>
            <Field label="Pipeline ID"><Input value={pipelineLogPipelineId} onChange={(e) => setPipelineLogPipelineId(e.target.value)} /></Field>
            <Field label="Run ID"><Input value={pipelineLogRunId} onChange={(e) => setPipelineLogRunId(e.target.value)} /></Field>
            <Field label="Task ID"><Input value={pipelineLogTaskId} onChange={(e) => setPipelineLogTaskId(e.target.value)} /></Field>
            <Field label="Try number"><Input value={pipelineLogTryNumber} onChange={(e) => setPipelineLogTryNumber(e.target.value)} /></Field>
            <Button
              variant="secondary"
              onClick={() => fetchPipelineRunLog(
                pipelineLogPipelineId.trim(),
                pipelineLogRunId.trim(),
                pipelineLogTaskId.trim(),
                Number(pipelineLogTryNumber) || 1
              )}
            >
              {pipelineRunLogLoading ? "Loading..." : "Fetch log"}
            </Button>
            <ErrorText message={pipelineRunLogError} />
            <CodeBlock value={pipelineRunLogData?.content || pipelineRunLogData} />
          </div>
        </div>
      </Section>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "0 32px 80px" },
  topBar: { height: 48, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 28 },
  breadcrumbs: { display: "flex", alignItems: "center", gap: 8 },
  breadcrumbMuted: { fontSize: 13, color: "#59647a" },
  breadcrumbSep: { fontSize: 13, color: "#3d4a5c" },
  breadcrumbActive: { fontSize: 13, color: "#8b97b0" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em", marginBottom: 6 },
  pageDesc: { fontSize: 13, color: "#8b97b0", lineHeight: 1.6, maxWidth: 640 },

  section: { marginBottom: 28 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#e2e8f0" },
  sectionDesc: { fontSize: 12, color: "#59647a", marginTop: 4 },
  sectionBody: { display: "flex", flexDirection: "column", gap: 12 },

  gridTwo: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  card: { background: "#13181f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  cardTitle: { fontSize: 12, fontWeight: 600, color: "#c8d4e8" },

  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 11, color: "#8b97b0" },
  input: {
    background: "#0d1219",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 12,
    color: "#e2e8f0",
    outline: "none",
  },
  textarea: {
    background: "#0d1219",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 12,
    color: "#e2e8f0",
    outline: "none",
    fontFamily: "'IBM Plex Mono', monospace",
    minHeight: 80,
  },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8b97b0" },

  primary: {
    background: "#1e6ef4",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  secondary: {
    background: "rgba(30,110,244,0.10)",
    color: "#4a9eff",
    border: "1px solid rgba(30,110,244,0.25)",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  danger: {
    background: "rgba(217,79,79,0.10)",
    color: "#f07070",
    border: "1px solid rgba(217,79,79,0.25)",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    alignSelf: "flex-start",
  },

  code: {
    background: "#0f1420",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    padding: "10px 12px",
    color: "#c8d4e8",
    fontSize: 11,
    overflowX: "auto",
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: "pre-wrap",
  },
  errorText: { fontSize: 11, color: "#f07070" },
  muted: { fontSize: 11, color: "#59647a" },
};
