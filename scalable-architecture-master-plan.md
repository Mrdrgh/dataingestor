# Scalable Architecture & Connector Framework Plan

## 1. Executive Summary & Goals
The current MVP architecture successfully orchestrates Spark-based data ingestion from PostgreSQL to Delta/MinIO using Airflow. However, it suffers from tight coupling: the orchestrator (Airflow) is tightly bound to the executor (Spark) and the data source (Postgres), making it difficult to scale horizontally or introduce new data sources securely.

### Objectives
- **Polymorphic Data Sources (Connector Pattern):** Abstract data sources so the platform can seamlessly ingest from Postgres, Salesforce, SAP, MongoDB, etc., without rewriting orchestration logic.
- **Domain-Driven Design (DDD):** Reorganize the NestJS backend to isolate plugins (connectors), core infrastructure, orchestration, and user-facing features.
- **Dynamic Orchestration:** Stop generating physical Python DAG files on disk. Use dynamic, database-driven DAG generation.
- **Late-Binding Configuration (Zero-Trust Execution):** Remove hardcoded passwords and `SOURCE_PG*` environment variables from DAGs. Executors should fetch temporary, encrypted credentials at runtime via an internal API.
- **Distributed Execution (Spark on K8s):** Move from running Spark locally in the Airflow container to native Kubernetes distributed execution, utilizing Spark Dynamic Allocation for cost-efficient resource usage.

## 2. Current vs. Target Architecture

### Current Architecture (MVP)
*   **Layout:** Flat feature modules (`back/src/database`, `back/src/sources`, `back/src/connections`).
*   **Source Coupling:** Everything assumes PostgreSQL. Connection settings live in a global `.env`.
*   **Orchestration:** `PipelinesService` physically writes `<dag_id>.py` and `<dag_id>.json` to the filesystem.
*   **Execution:** Airflow `BashOperator` triggers `spark_ingest.py` inside the Airflow worker container. If 10 pipelines run simultaneously, the container OOMs (Out of Memory).
*   **Security:** Credentials are baked into the generated DAG's environment variables.

### Target Architecture (Enterprise Scale)
*   **Layout:** Strict Domain-Driven Design (`core/`, `connectors/`, `orchestration/`, `features/`).
*   **Source Coupling:** Abstracted `IConnector` interface. A `ConnectorRegistry` dynamically loads plugins (Postgres, Salesforce).
*   **Orchestration:** Airflow runs a single `dynamic_dag_builder.py` that polls the NestJS database for active pipelines.
*   **Execution:** Airflow acts *only* as a trigger (`SparkKubernetesOperator`). It submits a `SparkApplication` to K8s. A Spark Driver pod boots, retrieves credentials via late-binding, and dynamically allocates Spark Executor pods based on data volume.
*   **Security:** The Spark Driver pod boots, calls a secure `GET /internal/runtime-config/:runId` NestJS endpoint, receives decrypted credentials in-memory, distributes them securely to executors, processes the data, and all pods die.

---

## 3. Directory Restructuring (Domain-Driven Design)

The codebase will be reorganized into four main pillars.

```text
back/src/
├── core/                           # System-wide infrastructure
│   ├── config/                     # Environment configuration
│   ├── platform-database/          # Renamed from notebook-database. Platform state.
│   └── crypto/                     # Utilities for encrypting connector credentials
│
├── orchestration/                  # Abstraction over Orchestration engines
│   ├── interfaces/                 # IOrchestratorService
│   └── providers/
│       └── airflow/                # Specific Airflow implementation
│
├── connectors/                     # The Plugin System
│   ├── connector.registry.ts       
│   ├── interfaces/                 # IConnector
│   └── plugins/
│       ├── postgres/               # Migrated from database/ & sources/
│       └── salesforce/             
│
└── features/                       # User-facing business logic
    ├── connections/                # CRUD for user credentials
    ├── pipelines/                  # Pipeline definitions & ingestion tracking
    ├── metastore/                  # Renamed from Catalog
    └── workspace/                  # Notebooks, profiles, execution gateways
```

---

## 4. The Data Model Refactor

We must migrate from single-source configurations to polymorphic, multi-tenant capable models.

### Table: `connections` (Replaces single `.env` PG connection)
- `id` (uuid, PK)
- `name` (string)
- `type` (enum: 'postgres', 'salesforce', 'mongodb', etc.)
- `config` (jsonb) -> e.g., `{ "host": "...", "port": 5432, "database": "..." }`
- `credentials` (text, AES-GCM encrypted) -> e.g., `{ "password": "..." }` or `{ "oauth_token": "..." }`
- `created_at`, `updated_at`

### Table: `pipelines` (Migrating from `pipelines.json`)
- `id` (uuid, PK)
- `name` (string)
- `source_connection_id` (uuid, FK connections)
- `source_config` (jsonb) -> e.g., `{ "schema": "public", "table": "orders" }` or `{ "object": "Account" }`
- `destination_catalog_id` (uuid, FK catalogs)
- `destination_path` (string)
- `ingestion_mode` (enum: 'full', 'incremental')
- `watermark_column` (string, optional)
- `schedule_cron` (string, optional)
- `is_active` (boolean)

---

## 5. Phased Implementation Plan

This plan is designed to be executed sequentially. Each phase results in a deployable, testable increment.

### Phase 1: Foundation & Infrastructure Overhaul
**Goal:** Establish the DDD layout, generic database models, and the core cryptographic capabilities.

*   **Task 1.1: Folder Restructuring**
    *   Move `notebook-database` to `core/platform-database`.
    *   Move `config` to `core/config`.
    *   Rename `catalog` to `features/metastore`.
    *   Move `notebooks`, `compute-profiles`, and `execution` under `features/workspace/`.
    *   Fix all import paths across the application.
*   **Task 1.2: Cryptography Module**
    *   Create `core/crypto/crypto.service.ts`.
    *   Implement AES-256-GCM encryption/decryption using a `PLATFORM_SECRET_KEY` from `.env`.
    *   Write unit tests to guarantee credential safety.
*   **Task 1.3: Platform Database Migration**
    *   Update `PlatformDatabaseService.initTables()` to create the new `connections` and `pipelines` tables.
    *   Ensure an automated migration runs on startup to convert any existing data.

### Phase 2: The Connector Framework (Plugin System)
**Goal:** Abstract data sources so the system no longer assumes PostgreSQL everywhere.

*   **Task 2.1: Define Connector Interfaces**
    *   Create `connectors/interfaces/connector.interface.ts`.
    *   ```typescript
        export interface SchemaDef { name: string; tables: TableDef[]; }
        export interface IConnector {
           type: string;
           getExecutionImage(): string; // e.g., 'fusion/ingest-postgres:v1'
           testConnection(config: any, credentials: any): Promise<boolean>;
           discoverSchemas(config: any, credentials: any): Promise<SchemaDef[]>;
           previewData(config: any, credentials: any, sourceConfig: any): Promise<any[]>;
        }
        ```
*   **Task 2.2: Implement the Connector Registry**
    *   Create `ConnectorRegistryService` that acts as a factory. 
    *   It maintains a Map of `type -> IConnector`.
*   **Task 2.3: Migrate PostgreSQL Logic to Plugin**
    *   Create `connectors/plugins/postgres/postgres.connector.ts` implementing `IConnector`.
    *   Move the logic from the old `database/postgres-metadata.service.ts` into this plugin.
    *   Update `features/connections` and `features/sources` controllers to use the `ConnectorRegistry` instead of hardcoded Postgres services.

### Phase 3: Dynamic Pipeline State & API Migration
**Goal:** Move pipelines off the filesystem (`pipelines.json`) and into the Postgres database.

*   **Task 3.1: Database Pipelines**
    *   Update `PipelinesService` to perform CRUD operations against the `pipelines` Postgres table instead of reading/writing JSON files.
*   **Task 3.2: Polymorphic Validation**
    *   Update Pipeline validation. Instead of hardcoding SQL column checks, the pipeline service calls `connector.discoverSchemas()` to validate if the user's requested `source_config` is valid for the chosen connection type.
*   **Task 3.3: Deprecate DAG File Writing**
    *   Remove `writeDagFile()` and `writeSparkConfigFile()` from `PipelinesService`.
    *   We no longer generate physical `.py` files on the NestJS side.

### Phase 4: Dynamic Orchestration & Late-Binding API
**Goal:** Transition Airflow to a pull-based, dynamic DAG architecture and secure credential handoffs.

*   **Task 4.1: The Internal Runtime API**
    *   Create `features/pipelines/internal.controller.ts`.
    *   Endpoint: `GET /internal/pipelines/:runId/runtime-config`.
    *   Logic: Looks up the pipeline, fetches the associated connection, uses `CryptoService` to decrypt the credentials, dynamically formats the MinIO destination paths via the Metastore service, and returns a massive JSON payload with everything the executor needs to run *right now*.
    *   *Security Note:* This endpoint should be protected by an internal API key or network boundary (only callable by executor containers).
*   **Task 4.2: Abstract Orchestration**
    *   Create `orchestration/interfaces/orchestrator.interface.ts`.
    *   Move `airflow.service.ts` into `orchestration/providers/airflow/`.
    *   Have it implement the interface (Trigger Run, Get Logs, Get Status).
*   **Task 4.3: Dynamic Airflow DAG Factory**
    *   In the Airflow container (`airflow/dags/`), write a single `dynamic_dag_builder.py`.
    *   This python script queries the NestJS database (e.g., `GET /api/pipelines/active`).
    *   It loops over the response and dynamically instantiates `DAG` objects in memory using the `schedule_cron` values.

### Phase 5: Decoupled Containerized Execution
**Goal:** Move Spark ingestion out of the Airflow worker container into a native, distributed Kubernetes cluster.

*   **Task 5.1: Native Spark Kubernetes Operator**
    *   Install the open-source Spark Operator on the Kubernetes cluster.
    *   Update `dynamic_dag_builder.py` to use `SparkKubernetesOperator`. Instead of running a single script, it submits a `SparkApplication` CRD with `spark.dynamicAllocation.enabled=true`.
*   **Task 5.2: The Universal Ingestion Bootstrapper**
    *   Modify `airflow/dags/spark_ingest.py` (which will now be baked into an isolated Docker image like `fusion/ingest-postgres:v1`).
    *   **New Flow:**
        1. Spark Driver Pod starts natively on K8s.
        2. Driver calls `http://backend:3001/internal/pipelines/123/runtime-config` to fetch credentials.
        3. Driver evaluates the data volume and requests Executor Pods from the K8s API.
        4. Distributed extraction occurs.
        5. Driver and Executors terminate automatically.

---

## 6. Execution Flow Example (Target Architecture)

Let's trace a scheduled incremental ingestion of a Salesforce Account object under the new architecture.

1.  **Polling (Airflow):** The Airflow scheduler parses `dynamic_dag_builder.py`, hits the NestJS API, sees the Salesforce pipeline, and creates an in-memory DAG.
2.  **Trigger (Airflow):** Cron hits 12:00 AM. Airflow triggers a DAG Run.
3.  **Job Submission (Airflow):** Airflow uses `SparkKubernetesOperator` to submit a `SparkApplication` to the cluster. Airflow defers and polls for completion.
4.  **Late-Binding (Driver):** The Spark Driver pod boots up. It sends a request to NestJS: `GET /internal/pipelines/uuid-888/runtime-config`.
5.  **Secure Handoff (NestJS):** NestJS authenticates the request, looks up the pipeline, decrypts the Salesforce OAuth token, retrieves the target MinIO credentials from the Metastore service, and returns them in a JSON response.
6.  **Dynamic Scaling (Spark):** The Spark Driver instantiates the SparkSession, notices it needs to pull 500GB of data, and requests 10 Executor Pods. 
7.  **Cleanup (Kubernetes):** As tasks finish, executors scale down to 0. The driver finishes and dies. Airflow marks the task green.

---

## 7. Migration & Rollout Strategy

Because this is a massive structural change, the rollout must be incremental.

1.  **Step 1: Structural Safe Refactor.** Implement Phase 1 (Folder restructure). This contains zero logic changes but aligns the mental model. Ensure all tests and docker containers still build.
2.  **Step 2: Dual-Writing Pipelines.** Implement Phase 3. When a pipeline is created, save it to the Database *and* generate the legacy `.py` file. This ensures Airflow doesn't break while we build out the dynamic builder.
3.  **Step 3: The Switchover.** Implement Phase 4 and 5 locally in docker-compose using `DockerOperator`. Once stable, delete the legacy physical DAG generation logic entirely.

## 8. Risks and Mitigations

*   **Risk:** `dynamic_dag_builder.py` hitting the NestJS API too frequently causes high database load and Airflow scheduler lag.
    *   **Mitigation:** The NestJS `/api/pipelines/active` endpoint must be fast, and the Airflow script should implement aggressive caching (e.g., polling every 60 seconds rather than every scheduler loop).
*   **Risk:** Securing the internal runtime API from unauthorized access.
    *   **Mitigation:** The executor container generates a unique, one-time-use JWT token signed by Airflow, or NestJS issues a one-time nonce when the DAG run is registered.
*   **Risk:** Dependency bloat if all connectors run in one image.
    *   **Mitigation:** Strict enforcement of Task 5.1 and 5.2. Each connector must have its own isolated Docker image (`ingest-postgres`, `ingest-salesforce`, `ingest-sap`). The generic `IConnector` tells Airflow which image to pull.