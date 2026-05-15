# MinIO Metastore Plan

## Goals
- Support multiple object storage connections (MinIO or S3-compatible) simultaneously.
- Keep credentials out of notebook cells while still enabling access to all configured catalogs.
- Allow credentials and endpoints to change in the backend without editing notebooks.
- Provide a metastore-like service that can discover and present multiple catalogs from multiple connections.
- Provide a kernel bundler that loads all authorized connections into each notebook kernel automatically.

## Non-goals (initially)
- Full SQL-based Unity Catalog compatibility or cross-workspace governance.
- Multi-tenant authorization model beyond basic per-compute-profile access.
- Automatic lineage, auditing, or advanced access policies (can be future work).

## Current Architecture (Summary)

Frontend (React)
  -> Backend (NestJS REST + WS)
      -> Notebook DB (Postgres) for compute profiles and notebooks
      -> Source DB (Postgres) for metadata and previews
      -> Airflow API for orchestration
      -> MinIO/S3 via CatalogService for catalog browsing
  -> Kernel Gateway (Jupyter) for notebook execution
  -> Airflow + Spark ingestion for pipelines

Key constraints in current design:
- Connection data is stored in .env and handled as a single global connection.
- Catalog is derived from one DELTA_BASE_PATH, optionally from one MinIO bucket.
- Kernels are started with a compute profile only; no dynamic per-connection setup.

## Code Inventory (Relevant to the Metastore Feature)

### Backend Core
- [back/src/app.module.ts](back/src/app.module.ts)
  - AppModule: Wires all NestJS modules including connections, catalog, notebooks, compute profiles, and execution.
- [back/src/main.ts](back/src/main.ts)
  - bootstrap(): Initializes Nest app, WebSocket adapter, global validation pipe, and starts server.
- [back/src/config/env.validation.ts](back/src/config/env.validation.ts)
  - envValidationSchema: Defines current env-based configuration, including MINIO_* and DELTA_BASE_PATH.

### Connections and Sources
- [back/src/connections/connections.controller.ts](back/src/connections/connections.controller.ts)
  - ConnectionsController.getConnections(): Returns a redacted Postgres connection from env.
  - ConnectionsController.testConnection(): Calls metadata service to test PG connection.
  - ConnectionsController.setupPostgresConnection(): Accepts new PG credentials and persists to .env.
- [back/src/connections/connections.service.ts](back/src/connections/connections.service.ts)
  - ConnectionsService.getPostgresConnection(): Reads PG creds from env and returns redacted info.
  - ConnectionsService.testPostgresConnection(): Verifies connectivity to PG.
  - ConnectionsService.setupPostgresConnection(): Tests and writes PG credentials into .env.
- [back/src/connections/connections.module.ts](back/src/connections/connections.module.ts)
  - ConnectionsModule: Exposes ConnectionsController and ConnectionsService, imports DatabaseModule.
- [back/src/connections/dto/postgres-connection.dto.ts](back/src/connections/dto/postgres-connection.dto.ts)
  - PostgresConnectionDto: DTO fields for host, port, database, user, password, trustServerCertificate.
- [back/src/sources/sources.controller.ts](back/src/sources/sources.controller.ts)
  - SourcesController.listSchemas(): Returns PG schemas via PostgresMetadataService.
  - SourcesController.listTables(): Returns tables or views per schema.
  - SourcesController.listColumns(): Returns column metadata for a table.
  - SourcesController.previewTable(): Returns a sample row set with optional column filter.
  - SourcesController.parseColumns(): Parses CSV column list in query string.
- [back/src/sources/sources.module.ts](back/src/sources/sources.module.ts)
  - SourcesModule: Controller-only module using DatabaseModule.
- [back/src/sources/dto/columns-query.dto.ts](back/src/sources/dto/columns-query.dto.ts)
  - ColumnsQueryDto: Optional schema query param.
- [back/src/sources/dto/list-tables-query.dto.ts](back/src/sources/dto/list-tables-query.dto.ts)
  - ListTablesQueryDto: Optional schema and includeViews query params.
- [back/src/sources/dto/preview-query.dto.ts](back/src/sources/dto/preview-query.dto.ts)
  - PreviewQueryDto: Optional schema, limit, and columns query params.
- [back/src/database/database.module.ts](back/src/database/database.module.ts)
  - DatabaseModule: Provides PostgresMetadataService.
- [back/src/database/postgres-metadata.service.ts](back/src/database/postgres-metadata.service.ts)
  - PostgresMetadataService.testConnection(): Simple SELECT 1 for connectivity.
  - PostgresMetadataService.listSchemas(): Lists non-system schemas.
  - PostgresMetadataService.listTables(): Lists tables and optional views in schema.
  - PostgresMetadataService.listColumns(): Returns column metadata and PK info.
  - PostgresMetadataService.previewRows(): Returns sample rows with column filtering.
  - PostgresMetadataService.columnExists(): Checks if a column exists.
  - PostgresMetadataService.buildColumnList(): Builds safe column list.
  - PostgresMetadataService.quoteIdent(): Safely quotes identifiers.
  - PostgresMetadataService.assertIdentifier(): Validates identifiers against regex.
  - PostgresMetadataService.isTimeLike(): Detects time-like column types.

### Catalog
- [back/src/catalog/catalog.controller.ts](back/src/catalog/catalog.controller.ts)
  - CatalogController.getCatalog(): Delegates to CatalogService.getCatalog().
- [back/src/catalog/catalog.service.ts](back/src/catalog/catalog.service.ts)
  - CatalogService.getCatalog(): Chooses filesystem or S3 listing based on DELTA_BASE_PATH.
  - CatalogService.getCatalogFromS3(): Scans S3 prefix hierarchy (catalog -> schema -> table).
  - CatalogService.parseDeltaTable(): Reads _delta_log from filesystem and computes table stats.
  - CatalogService.parseDeltaTableFromS3(): Reads _delta_log from S3 and computes table stats.
  - CatalogService.parseS3aPath(): Converts s3a://bucket/prefix into bucket and prefix.
  - CatalogService.joinS3Prefix(): Joins S3 prefixes safely.
  - CatalogService.ensureTrailingSlash(): Normalizes prefix with trailing slash.
  - CatalogService.listS3Prefixes(): Lists top-level prefixes using delimiter.
  - CatalogService.listS3Objects(): Lists objects under a prefix.
  - CatalogService.readS3Object(): Reads object content to string.
  - CatalogService.streamToString(): Converts stream to string.
  - CatalogService.mapSparkType(): Maps Spark types to simplified type labels.
  - CatalogService.formatBytes(): Human-readable sizes.
  - CatalogService.formatTimeAgo(): Human-readable timestamps.
  - CatalogService.isDirectory(): Filesystem directory check.
  - CatalogService.safeReadDir(): Safe directory listing.
- [back/src/catalog/catalog.module.ts](back/src/catalog/catalog.module.ts)
  - CatalogModule: Provides CatalogService and controller.

### Compute Profiles
- [back/src/compute-profiles/compute-profile.controller.ts](back/src/compute-profiles/compute-profile.controller.ts)
  - ComputeProfileController.findAll(): Lists all compute profiles.
  - ComputeProfileController.findOne(): Fetches a single profile.
  - ComputeProfileController.create(): Creates a profile.
  - ComputeProfileController.update(): Updates a profile.
  - ComputeProfileController.remove(): Deletes a profile.
  - ComputeProfileController.testConnection(): Calls kernel gateway /api/kernelspecs.
- [back/src/compute-profiles/compute-profile.service.ts](back/src/compute-profiles/compute-profile.service.ts)
  - ComputeProfileService.findAll(): Lists profiles from notebooks DB.
  - ComputeProfileService.findOne(): Retrieves profile by id.
  - ComputeProfileService.create(): Inserts profile with delta_base_path and spark_config.
  - ComputeProfileService.update(): Partial update with JSONB fields.
  - ComputeProfileService.remove(): Deletes profile by id.
  - ComputeProfileService.testConnection(): Calls kernel gateway and updates status.
- [back/src/compute-profiles/compute-profile.module.ts](back/src/compute-profiles/compute-profile.module.ts)
  - ComputeProfileModule: Provides controller and service.
- [back/src/compute-profiles/dto/create-compute-profile.dto.ts](back/src/compute-profiles/dto/create-compute-profile.dto.ts)
  - CreateComputeProfileDto: name, kernel_gateway_url, auth_token, delta_base_path, spark_config, custom_pip_packages.
- [back/src/compute-profiles/dto/update-compute-profile.dto.ts](back/src/compute-profiles/dto/update-compute-profile.dto.ts)
  - UpdateComputeProfileDto: same fields as create, all optional.

### Notebook Storage and Execution
- [back/src/notebook-database/notebook-database.service.ts](back/src/notebook-database/notebook-database.service.ts)
  - NotebookDatabaseService.onModuleInit(): Creates compute_profiles and notebooks tables.
  - NotebookDatabaseService.onModuleDestroy(): Closes pool.
  - NotebookDatabaseService.getPool(): Exposes pool.
  - NotebookDatabaseService.query(): Parameterized query helper.
  - NotebookDatabaseService.initTables(): DDL for compute_profiles and notebooks.
- [back/src/notebook-database/notebook-database.module.ts](back/src/notebook-database/notebook-database.module.ts)
  - NotebookDatabaseModule: Global module for NotebookDatabaseService.
- [back/src/notebooks/notebook.controller.ts](back/src/notebooks/notebook.controller.ts)
  - NotebookController.findAll(): Lists notebooks.
  - NotebookController.findOne(): Loads notebook by id.
  - NotebookController.create(): Creates notebook with compute profile.
  - NotebookController.update(): Updates title, cells, or profile.
  - NotebookController.remove(): Deletes a notebook.
- [back/src/notebooks/notebook.service.ts](back/src/notebooks/notebook.service.ts)
  - NotebookService.findAll(): Lists notebooks joined to compute profile names.
  - NotebookService.findOne(): Retrieves notebook by id.
  - NotebookService.create(): Verifies compute profile and inserts notebook.
  - NotebookService.update(): Partial updates and persists JSON cells.
  - NotebookService.remove(): Deletes notebook.
- [back/src/notebooks/notebook.module.ts](back/src/notebooks/notebook.module.ts)
  - NotebookModule: Provides NotebookService and controller.
- [back/src/notebooks/dto/create-notebook.dto.ts](back/src/notebooks/dto/create-notebook.dto.ts)
  - CreateNotebookDto: title and compute_profile_id.
- [back/src/notebooks/dto/update-notebook.dto.ts](back/src/notebooks/dto/update-notebook.dto.ts)
  - UpdateNotebookDto: title, cells, compute_profile_id.
- [back/src/execution/execution.gateway.ts](back/src/execution/execution.gateway.ts)
  - ExecutionGateway.handleConnection(): WebSocket connection setup.
  - ExecutionGateway.handleDisconnect(): Shuts down kernels per client.
  - ExecutionGateway.handleClientMessage(): Routes kernel and cell actions.
  - ExecutionGateway.handleKernelStart(): Starts kernel for notebook and compute profile.
  - ExecutionGateway.handleCellExecute(): Sends code to kernel.
  - ExecutionGateway.handleKernelInterrupt(): Interrupts kernel.
  - ExecutionGateway.handleKernelRestart(): Restarts kernel.
  - ExecutionGateway.handleKernelShutdown(): Shuts down kernel.
  - ExecutionGateway.sendToClient(): Serializes messages to WS.
- [back/src/execution/kernel-adapter.service.ts](back/src/execution/kernel-adapter.service.ts)
  - KernelAdapterService.startKernel(): Creates a KernelSession per notebook.
  - KernelAdapterService.executeCode(): Executes code on a session.
  - KernelAdapterService.interruptKernel(): Sends interrupt.
  - KernelAdapterService.restartKernel(): Restarts kernel.
  - KernelAdapterService.shutdownKernel(): Shuts down kernel.
  - KernelAdapterService.hasActiveKernel(): Checks if session exists.
- [back/src/execution/kernel-session.ts](back/src/execution/kernel-session.ts)
  - KernelSession.start(): POST /api/kernels and opens WS channels.
  - KernelSession.execute(): Sends execute_request to kernel.
  - KernelSession.interrupt(): POST interrupt.
  - KernelSession.restart(): POST restart.
  - KernelSession.shutdown(): DELETE kernel.
  - KernelSession.handleKernelMessage(): Translates kernel protocol to UI events.
  - KernelSession.resetIdleTimer(): Kernel idle timeout behavior.
  - KernelSession.clearIdleTimer(): Clears timeout.
- [back/src/execution/execution.module.ts](back/src/execution/execution.module.ts)
  - ExecutionModule: Provides gateway and kernel adapter.

### Pipelines and Airflow
- [back/src/pipelines/pipelines.controller.ts](back/src/pipelines/pipelines.controller.ts)
  - PipelinesController.listPipelines(): Lists pipelines.
  - PipelinesController.createPipeline(): Creates pipeline and writes DAG/config.
  - PipelinesController.getPipeline(): Fetches a pipeline by id.
  - PipelinesController.updatePipeline(): Updates pipeline and regenerates outputs.
  - PipelinesController.deletePipeline(): Deletes pipeline and removes artifacts.
  - PipelinesController.validatePipeline(): Validates input against source schema.
- [back/src/pipelines/pipelines.service.ts](back/src/pipelines/pipelines.service.ts)
  - PipelinesService.onModuleInit(): Runs migration for legacy destination paths.
  - PipelinesService.list(): Returns pipeline list.
  - PipelinesService.getById(): Fetches pipeline by id.
  - PipelinesService.getByIdOrThrow(): Throws on missing pipeline.
  - PipelinesService.create(): Creates pipeline, writes spark config and DAG.
  - PipelinesService.update(): Updates pipeline, writes spark config and DAG.
  - PipelinesService.delete(): Deletes pipeline and artifacts.
  - PipelinesService.validate(): Validates pipeline input with metadata.
  - PipelinesService.buildPipeline(): Assembles pipeline object with DAG and spark paths.
  - PipelinesService.mergePipeline(): Merges updates and validates.
  - PipelinesService.buildSource(): Builds source object.
  - PipelinesService.normalizeSource(): Normalizes source update payload.
  - PipelinesService.buildIngestion(): Builds ingestion object.
  - PipelinesService.normalizeIngestion(): Normalizes ingestion update payload.
  - PipelinesService.buildDestination(): Creates destination path and mode.
  - PipelinesService.normalizeDestination(): Normalizes destination update payload.
  - PipelinesService.buildDefaultDestinationPath(): Builds default catalog/layer path.
  - PipelinesService.joinPath(): Joins path segments.
  - PipelinesService.isLegacyLocalDeltaPath(): Detects legacy local paths.
  - PipelinesService.migrateLegacyDestinations(): Rewrites legacy destinations to defaults.
  - PipelinesService.buildSchedule(): Builds schedule object.
  - PipelinesService.normalizeSchedule(): Normalizes schedule update payload.
  - PipelinesService.validatePipelineInput(): Validates source columns and watermark.
  - PipelinesService.loadFile(): Loads pipelines JSON.
  - PipelinesService.saveFile(): Saves pipelines JSON with temp file.
  - PipelinesService.ensureStorageFile(): Ensures storage directories and file.
  - PipelinesService.withWriteLock(): Serializes writes.
  - PipelinesService.buildDagRelativePath(): Builds relative DAG path.
  - PipelinesService.buildSparkConfigRelativePath(): Builds spark job path.
  - PipelinesService.getSparkConfigContainerPath(): Path for Airflow container.
  - PipelinesService.writeSparkConfigFile(): Writes spark config JSON.
  - PipelinesService.writeDagFile(): Generates a Python DAG with BashOperator.
  - PipelinesService.assertGeneratedDagContent(): Validates generated DAG content.
  - PipelinesService.removeDagFile(): Deletes DAG file.
  - PipelinesService.removeSparkConfigFile(): Deletes spark config file.
  - PipelinesService.slugify(): Slugifies names.
- [back/src/pipelines/pipelines.module.ts](back/src/pipelines/pipelines.module.ts)
  - PipelinesModule: Wires config + database for pipeline management.
- [back/src/pipelines/pipeline.types.ts](back/src/pipelines/pipeline.types.ts)
  - Defines PipelineSource, PipelineIngestion, PipelineDestination, PipelineSchedule, PipelineDag, PipelineSpark, PipelineDefinition, PipelinesFile.
- [back/src/pipelines/dto/create-pipeline.dto.ts](back/src/pipelines/dto/create-pipeline.dto.ts)
  - CreatePipelineDto: input schema for pipeline creation.
- [back/src/pipelines/dto/update-pipeline.dto.ts](back/src/pipelines/dto/update-pipeline.dto.ts)
  - UpdatePipelineDto: input schema for pipeline update.
- [back/src/pipelines/dto/validate-pipeline.dto.ts](back/src/pipelines/dto/validate-pipeline.dto.ts)
  - ValidatePipelineDto: alias to CreatePipelineDto.
- [back/src/airflow/airflow.service.ts](back/src/airflow/airflow.service.ts)
  - AirflowService: HTTP wrapper for Airflow runs, logs, tasks, and health.
  - Methods: getHealth, listDagRuns, getDagRun, triggerDagRun, listTaskInstances, getTaskLog, getDag.
- [back/src/airflow/airflow.module.ts](back/src/airflow/airflow.module.ts)
  - AirflowModule: Provides AirflowService.
- [airflow/dags/spark_ingest.py](airflow/dags/spark_ingest.py)
  - get_spark_session(): Builds Spark session with Delta and optional S3A configs.
  - parse_args(): CLI args for inline config or config file.
  - load_config(): Loads JSON config from file or inline.
  - resolve_runtime_delta_path(): Converts local delta paths to runtime paths and uses DELTA_BASE_PATH if s3a.
  - strip_delta_prefix(): Removes known delta prefixes from local paths.
  - join_paths(): Joins base path and suffix.
  - build_spark_packages(): Chooses maven packages for S3A dependencies.
  - build_local_jars(): Lists local jars for Postgres and S3A.
  - has_local_s3a_jars(): Detects bundled S3A jars.
  - build_s3a_config(): Creates spark.hadoop.fs.s3a.* configs from MINIO env.
  - build_source_config(): Builds JDBC config from SOURCE_PG* or PG* env.
  - state_file_path(): Path to store watermark state.
  - read_last_watermark(): Reads saved watermark.
  - write_last_watermark(): Persists watermark.
  - main(): Orchestrates JDBC read and Delta write.
- [airflow_spark_delta/docker-compose.yml](airflow_spark_delta/docker-compose.yml)
  - Defines Airflow, MinIO, kernel gateway, and env MINIO_* (single connection).
- [airflow_spark_delta/Dockerfile](airflow_spark_delta/Dockerfile)
  - Airflow image: installs Spark, Delta, and S3A jars.

### Frontend
- [front/src/api/client.js](front/src/api/client.js)
  - apiClient(): Generic fetch wrapper with JSON parsing.
- [front/src/api/endpoints.js](front/src/api/endpoints.js)
  - api: REST endpoints for connections, sources, pipelines, catalogs, logs, schedules.
- [front/src/hooks/useApi.js](front/src/hooks/useApi.js)
  - useApi(): Hook for loading, error, and data management around async calls.
- [front/src/components/NotebookEditor.jsx](front/src/components/NotebookEditor.jsx)
  - makeCell(): Builds new notebook cell objects.
  - CellOutput(): Renders cell outputs and running state.
  - Cell(): Renders code/markdown cell, run/stop actions.
  - NotebookEditor(): Manages WebSocket kernel lifecycle, cell execution, and saving.
- [front/src/pages/Notebookspage.jsx](front/src/pages/Notebookspage.jsx)
  - CreateModal(): UI for creating a notebook with compute profile.
  - NotebooksPage(): Lists notebooks, opens NotebookEditor, and CRUD actions.
- [front/src/pages/ComputeProfilesPage.jsx](front/src/pages/ComputeProfilesPage.jsx)
  - Modal(): Create/edit compute profile.
  - Card(): Displays compute profile and test action.
  - ComputeProfilesPage(): Lists and manages compute profiles.
- [front/src/pages/CatalogPage.jsx](front/src/pages/CatalogPage.jsx)
  - TableDetail(), StatChip(): Table metadata detail UI.
  - TableNode(), SchemaNode(), CatalogNode(): Tree nodes.
  - CatalogPage(): Fetches catalog and renders tree + detail.
- [front/src/components/PostgresWizard.jsx](front/src/components/PostgresWizard.jsx)
  - ConnectionStep(): Collects PG creds and tests connection.
  - IngestionStep(): Sets ingestion mode and pipeline name.
  - SourceStep(): Sets source schema and table.
  - DestinationStep(): Sets catalog/schema/table names for output path.
  - ScheduleStep(): Selects schedule and triggers pipeline creation.
  - PostgresWizard(): Orchestrates steps; handleTest() and handleSubmit() call backend.
- [front/src/pages/DataIngestionPage.jsx](front/src/pages/DataIngestionPage.jsx)
  - DataIngestionPage(): Connector selection UI; launches PostgresWizard.
- [front/src/pages/PipelinesPage.jsx](front/src/pages/PipelinesPage.jsx)
  - PipelineRow(), RunHistory(), RunRow(): Pipeline listing and run history.
  - PipelinesPage(): Fetches pipeline list and triggers runs.
- [front/src/pages/AdminPage.jsx](front/src/pages/AdminPage.jsx)
  - Section(), Field(), Input(), TextArea(), Button(): UI helpers.
  - AdminPage(): Debug console for all backend endpoints.

## Gaps vs Desired Metastore Behavior
- Connections are global and stored in .env; no multi-connection support.
- CatalogService only reads one DELTA_BASE_PATH, optionally from one MinIO bucket.
- Kernels have no per-connection bootstrap; notebook cells must configure credentials manually.
- PostgresWizard builds local destination paths that are tied to filesystem.
- Compute profiles are not linked to storage connections or catalogs.

## Target Architecture (Objective)

Frontend
  -> Metastore API (connections + catalogs)
  -> Notebook UI (select compute profile + catalogs)
Backend (NestJS)
  -> Connection Registry Service (multi-connection, encrypted secrets)
  -> Catalog Discovery Service (per-connection catalog scanning)
  -> Kernel Bundler Service (build spark configs per kernel)
  -> Notebook/Execution (kernel start with injected config)
Kernel Gateway
  -> Spark session with per-bucket S3A config
Storage
  -> Multiple MinIO/S3-compatible buckets and prefixes

## Proposed Data Model (Notebook DB)

1) storage_connections
- id (uuid)
- name (string)
- type (enum: s3_compat)
- endpoint (string)
- bucket (string)
- base_prefix (string, optional)
- region (string)
- use_ssl (boolean)
- path_style (boolean)
- access_key (encrypted)
- secret_key (encrypted)
- status (string)
- created_at, updated_at

2) catalogs
- id (uuid)
- connection_id (uuid, FK storage_connections)
- name (string) (catalog name to display)
- base_prefix (string) (prefix under bucket)
- is_default (boolean)
- created_at, updated_at

3) compute_profile_connections
- compute_profile_id (uuid, FK compute_profiles)
- connection_id (uuid, FK storage_connections)
- is_default (boolean)
- alias (string, optional)

Optional:
- secrets table (if you want key rotation and auditing separate from connections).

## Proposed API Surface

- POST /storage-connections
- GET /storage-connections
- GET /storage-connections/:id
- PUT /storage-connections/:id
- DELETE /storage-connections/:id
- POST /storage-connections/:id/test

- POST /catalogs
- GET /catalogs
- GET /catalogs/:id
- PUT /catalogs/:id
- DELETE /catalogs/:id
- POST /catalogs/refresh (discover tables per catalog)

- PUT /compute-profiles/:id/connections
  - Assign a set of storage connections to a compute profile.

- GET /catalog (existing) -> updated to return multiple catalogs from registry.

## Kernel Bundler Strategy (Recommended)

Goal: do not require notebook cells to embed credentials.

Recommended approach:
1) Create a small kernel-side bootstrap package (for example, fusion_kernel_bootstrap) built into the kernel gateway image.
2) On kernel start, backend sends a lightweight execute_request that imports the bootstrap module and passes a JSON payload (connection list, bucket-level configs).
3) The bootstrap module creates or updates the Spark session with per-bucket S3A configs:
   - spark.hadoop.fs.s3a.bucket.<bucket>.endpoint
   - spark.hadoop.fs.s3a.bucket.<bucket>.access.key
   - spark.hadoop.fs.s3a.bucket.<bucket>.secret.key
   - spark.hadoop.fs.s3a.bucket.<bucket>.path.style.access
   - spark.hadoop.fs.s3a.bucket.<bucket>.connection.ssl.enabled
   - spark.hadoop.fs.s3a.aws.credentials.provider
   - spark.delta.logStore.class
4) The bootstrap module also exposes helper utilities in the kernel namespace (optional):
   - list_catalogs(), list_tables(catalog), path_for(catalog, schema, table)
   - These helpers use connection metadata without exposing credentials in notebooks.

Why this works:
- Multiple connections can be configured concurrently per bucket.
- Changing a connection in the registry updates new kernels without editing notebooks.
- Notebooks are clean and do not hold secrets.

Alternate approach (future):
- Replace kernel gateway with a custom kernel provisioner that accepts env overrides per kernel, eliminating even the bootstrap execute request.

## Implementation Plan (Steps and Tasks)

1) Connection Registry (Backend)
- Add new module (for example: storage-connections) with controller, service, DTOs.
- Create DB tables in NotebookDatabaseService.initTables().
- Implement CRUD and testConnection for S3-compatible endpoints.
- Encrypt secrets at rest (use a master key from env or a KMS-backed provider).

2) Catalog Registry and Discovery
- Add catalogs module or extend CatalogService to read from the new catalog registry.
- Implement catalog discovery per connection (scan _delta_log in bucket/prefix).
- Update GET /catalog to aggregate catalogs across all connections.

3) Compute Profile Binding
- Add compute_profile_connections mapping table.
- Implement endpoints to assign connections to compute profiles.
- Update ComputeProfiles UI to allow selecting connections.

4) Kernel Bundler
- Add a KernelBundlerService that builds per-bucket S3A configs using assigned connections.
- Extend KernelAdapterService.startKernel() to fetch assigned connections and invoke the kernel bootstrap.
- Add a kernel bootstrap module in the kernel gateway image (Python package) to apply configs and optionally create helpers.

5) Frontend UI Updates
- Add Storage Connections page for CRUD and test (like Compute Profiles page).
- Update CatalogPage to show multiple catalogs and connection names.
- Update PostgresWizard destination step to allow selecting a target catalog from registry.
- Update Notebooks UI to show which catalogs are mounted for a compute profile.

6) Migration and Backward Compatibility
- Provide a migration step that seeds a default storage connection from current MINIO_* env.
- Keep DELTA_BASE_PATH fallback for single-connection deployments.
- Keep old /connections postgres endpoint for source DB setup.

7) Verification
- Kernel boot: verify Spark can read and write from multiple buckets without notebook credentials.
- Catalog API: verify multiple catalogs appear in UI.
- Credentials rotation: update a connection secret and confirm new kernels can read without notebook changes.

## Risks and Mitigations
- Risk: Secrets exposure in logs or responses.
  - Mitigation: Never return secrets from API; use encryption at rest and redaction in logs.
- Risk: Kernel bootstrap delay or failure.
  - Mitigation: Implement retries and fail fast with clear error messages in kernel status.
- Risk: Catalog discovery cost for large buckets.
  - Mitigation: Cache results and allow manual refresh.

## Decisions (Confirmed)
- Catalogs are explicit records tied to a connection and base prefix, with discovery scanning Delta tables under each catalog prefix. This gives stable catalog names and allows multiple connections without ambiguity.
- Connection selection is per compute profile (not per notebook). Notebooks inherit the profile's catalog bindings.
- Support both s3a:// and s3:// in API inputs and UI display, but normalize to s3a:// when configuring Spark.
- Keep a backward-compatible single-connection path (DELTA_BASE_PATH + MINIO_*) as a fallback, and auto-seed a default connection + catalog when registry is empty.

## Remaining Questions
- Encryption approach: master key via env, or optional KMS integration (future). For phase 1, use a single env-provided master key.
- Default catalog naming: use connection name or a fixed name (for example, fusion_catalog) when auto-seeding.

## Implementation Task List (Detailed)

### Phase 0 — Foundation and Documentation Guardrails
Task 0.1 — Define new config vars and validate them.
- Add METASTORE_ENCRYPTION_KEY (required for new connections), METASTORE_AUTOSEED (default true), METASTORE_DEFAULT_CATALOG_NAME (default fusion_catalog), METASTORE_DEFAULT_PREFIX (optional), and METASTORE_SCHEME_PREFERENCE (default s3a).
- Update [back/src/config/env.validation.ts](back/src/config/env.validation.ts) with validation and defaults.
- Documentation: update this plan with final config values and add a short runbook section describing how to set these env vars.

Task 0.2 — Add documentation standards for new modules.
- Require JSDoc blocks for each new service method and controller endpoint.
- Require DTO field descriptions for API payloads.
- Require a new docs/metastore.md (or docs/architecture/metastore.md) with API, data model, and operational notes.

### Phase 1 — Data Model and Persistence
Task 1.1 — Extend notebooks DB schema.
- Add tables: storage_connections, catalogs, compute_profile_connections.
- Add indexes on connection_id, catalog name, compute_profile_id.
- Add updated_at triggers or explicit updates in services.
- Documentation: document table schemas and indexes in docs/metastore.md.

Task 1.2 — Add encryption utility.
- Implement a small crypto helper (AES-GCM) for access_key and secret_key at rest.
- Keep plaintext out of logs and API responses.
- Documentation: document key rotation strategy and limitations.

### Phase 2 — Storage Connections Service
Task 2.1 — Create storage-connections module.
- New controller, service, DTOs, and module wiring in AppModule.
- CRUD endpoints with validation for S3-compatible settings.
- testConnection endpoint using S3 ListBuckets or ListObjectsV2 with bucket + prefix.
- Documentation: REST endpoint list with example payloads.

Task 2.2 — Seed default connection from env.
- On startup, if registry empty and METASTORE_AUTOSEED true, create a connection using MINIO_*.
- Create a default catalog row for that connection using METASTORE_DEFAULT_CATALOG_NAME and base prefix.
- Documentation: explain autoseed behavior and how to disable it.

### Phase 3 — Catalog Registry + Discovery
Task 3.1 — Create catalogs module (or extend CatalogService).
- Catalog CRUD for name, connection_id, base_prefix, is_default.
- Catalog discovery method: list prefixes and parse Delta _delta_log from S3.
- Cache catalog scan results with TTL to avoid repeated expensive scans.
- Documentation: describe how discovery works and refresh triggers.

Task 3.2 — Update GET /catalog.
- Aggregate catalogs across all connections that the caller is allowed to see.
- Include connection name/alias in catalog response for UI display.
- Documentation: update catalog response schema.

### Phase 4 — Compute Profile Binding
Task 4.1 — Add profile-to-connection mapping API.
- Endpoint to set a list of connections for a compute profile, with is_default and optional alias.
- Update ComputeProfileService to read and persist bindings.
- Documentation: compute profile binding model and API usage.

### Phase 5 — Kernel Bundler
Task 5.1 — KernelBundlerService.
- Build a per-profile payload describing allowed connections and catalog prefixes.
- Normalize any s3:// scheme to s3a:// for Spark configs.
- Ensure no secrets are returned to the frontend.
- Documentation: payload schema and security notes.

Task 5.2 — Kernel bootstrap package.
- Add a minimal Python bootstrap module in the kernel gateway image.
- On kernel start, execute bootstrap code to configure Spark S3A per bucket.
- Expose helper functions (list_catalogs, list_tables, path_for) without embedding credentials in notebooks.
- Documentation: helper API and expected environment variables.

Task 5.3 — Execution integration.
- Update KernelAdapterService / KernelSession to call bundler after kernel start.
- Ensure failure paths surface clear errors to the notebook UI.
- Documentation: kernel lifecycle diagram and failure behavior.

### Phase 6 — Frontend Integration
Task 6.1 — Storage Connections UI.
- New page for listing, creating, testing, and editing storage connections.
- Integrate into Sidebar and routing.
- Documentation: UI workflow screenshots or a short user guide section.

Task 6.2 — Compute profiles binding UI.
- Add connection selection UI in ComputeProfilesPage.
- Show which catalogs are attached to the profile.
- Documentation: how to bind a profile to multiple catalogs.

Task 6.3 — Catalog page updates.
- Display multiple catalogs with connection metadata.
- Optional filter by connection or catalog name.
- Documentation: catalog display rules and naming.

Task 6.4 — PostgresWizard destination integration.
- Replace raw path entry with catalog selector and schema/table fields.
- Generate destination using selected catalog base prefix.
- Documentation: destination mapping logic.

### Phase 7 — Pipelines Alignment (Optional but Recommended)
Task 7.1 — Extend pipeline destination schema.
- Add destination.catalog_id and schema/table fields for catalog-based paths.
- Keep path for backward compatibility.
- Documentation: pipeline destination precedence rules.

Task 7.2 — Ingestion path resolution.
- Update spark_ingest.py to accept catalog_id (if provided) and resolve to s3a paths via registry.
- Documentation: ingest resolution flow.

### Phase 8 — Backward Compatibility
Task 8.1 — Single-connection fallback.
- If no storage_connections exist, use DELTA_BASE_PATH + MINIO_* as a virtual connection.
- Document behavior in code and docs.

Task 8.2 — Migration plan.
- Migrate existing pipelines to catalog-based destination when possible.
- Provide a dry-run mode to show planned changes.
- Documentation: migration runbook.

### Phase 9 — Testing and Verification
Task 9.1 — Unit tests.
- Storage connection validation, encryption/decryption, catalog parsing, scheme normalization.

Task 9.2 — Integration tests.
- Multi-connection catalog discovery.
- Kernel bootstrap access to multiple buckets.
- Credential rotation: update a connection and confirm new kernel uses updated credentials.

Task 9.3 — Manual verification checklist.
- UI flows for creating connections, binding profiles, and running notebook cells without credentials.
- Catalog page shows multiple connections.
- Pipelines write to selected catalog.

### Phase 10 — Documentation Deliverables
Task 10.1 — Add docs/metastore.md (or docs/architecture/metastore.md).
- Include data model, API endpoints, kernel bundler, and operational guidance.

Task 10.2 — Update README.md.
- Add quickstart for adding a storage connection and running notebooks without credentials.

Task 10.3 — Update admin/runbook.
- Document credential rotation and troubleshooting steps.
## Suggested File-Level Changes (High Level)
- Add new backend modules and DTOs for storage connections and catalogs.
- Update [back/src/catalog/catalog.service.ts](back/src/catalog/catalog.service.ts) to iterate over registry connections.
- Update [back/src/compute-profiles/compute-profile.service.ts](back/src/compute-profiles/compute-profile.service.ts) to handle connection bindings.
- Update [back/src/execution/kernel-adapter.service.ts](back/src/execution/kernel-adapter.service.ts) to invoke KernelBundlerService.
- Update [front/src/pages/ComputeProfilesPage.jsx](front/src/pages/ComputeProfilesPage.jsx) to allow selecting connections.
- Add new frontend page for storage connections and extend Sidebar.
- Update [front/src/components/PostgresWizard.jsx](front/src/components/PostgresWizard.jsx) to select destination catalog from registry.

## Outcome
This plan delivers a metastore-like experience for multiple MinIO connections, dynamic credential updates, and zero-credential notebook cells, while aligning with the existing compute profile and notebook execution model.
