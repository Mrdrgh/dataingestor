# Data Ingestor Platform - Master Architecture Compendium

## Scope and sources
- Curated from: all_diagrams.md, architecture-deep-dive.md, backend-system-design-plan.md, master_class_diagram.md, part2.md, part3.md, part4.md, part5.md, scalable-architecture-master-plan.md, target-architecture-diagrams.md, back/README.md.
- Skipped: minio-metastore-plan.md and any metastore-only document per request.
- This document separates Current MVP (as-is) from Target Architecture (planned) to avoid mixing behaviors.

## Legend
- Current MVP: running behavior today with pipelines.json, static Airflow DAG files, and local Spark execution inside Airflow workers.
- Target Architecture: planned DDD refactor with dynamic DAGs, connector plugins, late-binding secrets, and Spark on Kubernetes.

## System overview
The platform is split across three planes plus a user-facing UI:
- User interface: React frontend for pipeline, notebook, and monitoring workflows.
- Control plane: NestJS API that owns state, validation, and orchestration abstractions.
- Orchestration plane: Airflow scheduler that triggers runs and monitors execution.
- Data plane: Spark execution environment that extracts data and writes Delta files.
- Storage: source databases and a Delta Lake in S3/MinIO.

### Macro system architecture (target macro)
```mermaid
flowchart TB
    subgraph UserSpace [User Interaction]
        UI[React Frontend UI]
    end

    subgraph ControlPlane [Control Plane: Orchestration & State]
        NestJS[NestJS Platform API]
        Airflow[Airflow Scheduler]
        PlatformDB[(Platform PostgreSQL)]
    end

    subgraph DataPlane [Data Plane: Kubernetes Execution]
        SparkOp[Spark K8s Operator]
        SparkDriver[Spark Driver Pod]
        SparkExec[Spark Executor Pods]
    end
  
    subgraph Storage [Data Ecosystem]
        Sources[(Source Databases)]
        DataLake[(Delta Lake - S3/MinIO)]
    end

    UI <-->|Manage Pipelines| NestJS
    NestJS <--> PlatformDB
    NestJS -->|1. Trigger / Poll| Airflow
    Airflow -->|2. Query Active Pipelines| NestJS
    Airflow -->|3. Submit SparkApplication| SparkOp
    SparkOp -->|4. Launch| SparkDriver
    SparkDriver -->|5. Dynamic Allocation| SparkExec
    SparkDriver <-->|6. Fetch Decrypted Secrets| NestJS
    SparkExec -->|7. Extract Rows| Sources
    SparkExec -->|8. Load Delta| DataLake
```

## Repository structure (top-level and key subtrees)
```text
dataingestor/
  all_diagrams.md
  architecture-deep-dive.md
  backend-system-design-plan.md
  master_class_diagram.md
  part2.md
  part3.md
  part4.md
  part5.md
  scalable-architecture-master-plan.md
  target-architecture-diagrams.md
  airflow/
    dags/
      dynamic_dag_builder.py
      main.py
      spark_ingest.py
      ingest_*.py
  airflow_spark_delta/
    docker-compose.yml
    Dockerfile
    Dockerfile.kernel-gateway
    delta/
    spark/
      jobs/
  back/
    README.md
    src/
      airflow/
      alerts/
      catalog/
      compute-profiles/
      connections/
      database/
      execution/
      health/
      ingestion/
      logs/
      notebook-database/
      notebooks/
      pipelines/
      schedules/
      sources/
  front/
    index.html
    vite.config.js
    src/
      api/
      components/
      hooks/
      pages/
      styles/
  delta/
  docs/
```

## Current MVP architecture (as-is)

### Runtime boundaries and external dependencies
- Airflow REST API for DAGs, runs, and logs.
- Postgres source database for schema discovery and data preview.
- Postgres notebooks database for notebook and compute profile state.
- MinIO/S3 for Delta Lake storage.
- Local filesystem for pipelines.json, Airflow DAG files, and Spark job configs.
- Jupyter Kernel Gateway for notebook execution.

### Module dependency graph (current MVP)
```mermaid
graph TD
  AppModule --> AirflowModule
  AppModule --> DatabaseModule
  AppModule --> SourcesModule
  AppModule --> PipelinesModule
  AppModule --> IngestionModule
  AppModule --> ConnectionsModule
  AppModule --> SchedulesModule
  AppModule --> AlertsModule
  AppModule --> HealthModule
  AppModule --> LogsModule
  AppModule --> CatalogModule
  AppModule --> NotebookDatabaseModule
  AppModule --> ComputeProfileModule
  AppModule --> NotebookModule
  AppModule --> ExecutionModule

  SourcesModule --> DatabaseModule
  PipelinesModule --> DatabaseModule
  IngestionModule --> AirflowModule
  IngestionModule --> PipelinesModule
  LogsModule --> AirflowModule
  LogsModule --> PipelinesModule
  SchedulesModule --> AirflowModule
  SchedulesModule --> PipelinesModule
  AlertsModule --> AirflowModule
  AlertsModule --> PipelinesModule
  HealthModule --> AirflowModule
  ConnectionsModule --> DatabaseModule
  ExecutionModule --> ComputeProfileModule
```

### Service class diagram (current MVP)
```mermaid
classDiagram
  class AirflowService {
    +getHealth()
    +listDagRuns()
    +triggerDagRun()
    +listTaskInstances()
    +getTaskLog()
    +getDag()
  }

  class PostgresMetadataService {
    +listSchemas()
    +listTables()
    +listColumns()
    +previewRows()
    +testConnection()
  }

  class PipelinesService {
    +list()
    +create()
    +update()
    +delete()
    +validate()
  }

  class CatalogService {
    +getCatalog()
  }

  class NotebookDatabaseService {
    +query()
    +getPool()
  }

  class NotebookService {
    +findAll()
    +findOne()
    +create()
    +update()
    +remove()
  }

  class ComputeProfileService {
    +findAll()
    +findOne()
    +create()
    +update()
    +remove()
    +testConnection()
  }

  class KernelAdapterService {
    +startKernel()
    +executeCode()
    +interruptKernel()
    +restartKernel()
    +shutdownKernel()
  }

  class KernelSession {
    +start()
    +execute()
    +interrupt()
    +restart()
    +shutdown()
  }

  PipelinesService --> PostgresMetadataService
  ConnectionsService --> PostgresMetadataService
  SourcesController --> PostgresMetadataService
  IngestionController --> AirflowService
  LogsController --> AirflowService
  SchedulesController --> AirflowService
  AlertsController --> AirflowService
  HealthController --> AirflowService
  KernelAdapterService --> ComputeProfileService
  KernelAdapterService --> KernelSession
  ComputeProfileService --> NotebookDatabaseService
  NotebookService --> NotebookDatabaseService
```

### Service responsibilities (current MVP)
- AirflowService: DAG metadata, runs, task instances, and logs via Airflow REST; supports auth modes; retries retryable errors and normalizes failures.
- PostgresMetadataService: source DB schema, table, column metadata and preview rows; owns PG pool lifecycle; validates identifiers to prevent SQL injection.
- PipelinesService: CRUD and validation; writes pipelines.json, Airflow DAG files, and Spark job config JSON; validates against PostgresMetadataService; migrates legacy destination paths on module init.
- CatalogService: reads Delta Lake catalogs from filesystem or S3/MinIO; parses _delta_log JSON and aggregates table stats.
- ConnectionsService: displays/tests/stores Postgres connection settings; writes .env on success; uses PostgresMetadataService for connectivity testing.
- NotebookDatabaseService: global provider for notebooks DB pool; initializes tables on startup.
- NotebookService: CRUD for notebooks; validates compute_profile_id exists in compute_profiles.
- ComputeProfileService: CRUD and connectivity tests; calls Kernel Gateway /api/kernelspecs and updates status.
- KernelAdapterService: manages KernelSession per notebook; handles lifecycle, idle timeout, and routing of execute/interrupt/restart/shutdown.
- KernelSession: direct Kernel Gateway REST + WS client; translates Jupyter protocol to simplified execution events.

### API surface (current MVP)
All endpoints return JSON. Validation errors return 400. Airflow failures return 502 with a message.

#### Health
- GET /health
  - Checks Airflow API reachability.

#### Connections (Postgres source)
- GET /connections
  - Returns current Postgres connection with masked password.
- GET /connections/test
  - Tests the configured Postgres connection.
- POST /connections/postgres
  - Tests and persists Postgres credentials into .env.

#### Source discovery
- GET /sources/schemas
  - Returns available schemas.
- GET /sources/tables?schema=public&includeViews=true
  - Returns tables and views for a schema.
- GET /sources/tables/:table/columns?schema=public
  - Returns column metadata with types and primary key info.
- GET /sources/tables/:table/preview?schema=public&limit=20&columns=col1,col2
  - Returns preview rows.

#### Pipelines
Pipeline object shape:
```
{
  "id": "uuid",
  "name": "Orders incremental",
  "description": "Optional description",
  "createdAt": "2026-05-08T10:00:00.000Z",
  "updatedAt": "2026-05-08T10:00:00.000Z",
  "source": {
    "schema": "public",
    "table": "orders",
    "columns": ["id", "updated_at", "total"]
  },
  "ingestion": {
    "mode": "incremental",
    "watermarkColumn": "updated_at"
  },
  "destination": {
    "path": "../delta/orders_incremental",
    "mode": "append"
  },
  "schedule": {
    "cron": "0 * * * *"
  },
  "dag": {
    "dagId": "ingest_orders_incremental_ab12cd34",
    "filePath": "../airflow/dags/ingest_orders_incremental_ab12cd34.py"
  }
}
```

- GET /pipelines
- POST /pipelines
  - Validates schema and writes DAG and Spark job config files.
- POST /pipelines/validate
  - Validates a pipeline payload without persisting.
- GET /pipelines/:pipelineId
- PUT /pipelines/:pipelineId
- DELETE /pipelines/:pipelineId
  - Also removes the DAG file.

#### Schedules
- GET /schedules
  - Optionally accepts pipelineId to return a specific schedule.

#### Alerts
- GET /alerts
  - Optionally accepts pipelineId to compute alert level for a pipeline.

#### Ingestion runs (global DAG)
These endpoints use AIRFLOW_DAG_ID.
- GET /ingestion/runs
- POST /ingestion/runs
- GET /ingestion/runs/:runId
- GET /ingestion/runs/:runId/tasks

#### Ingestion runs (pipeline-specific)
These endpoints use per-pipeline DAG IDs.
- GET /ingestion/pipelines/:pipelineId/runs
- POST /ingestion/pipelines/:pipelineId/runs
- GET /ingestion/pipelines/:pipelineId/runs/:runId
- GET /ingestion/pipelines/:pipelineId/runs/:runId/tasks

#### Logs
- GET /logs/runs/:runId/tasks/:taskId?tryNumber=1
- GET /logs/pipelines/:pipelineId/runs/:runId/tasks/:taskId?tryNumber=1

#### Notebooks
- GET /notebooks
- GET /notebooks/:id
- POST /notebooks
- PUT /notebooks/:id
- DELETE /notebooks/:id

#### Compute profiles
- GET /compute-profiles
- GET /compute-profiles/:id
- POST /compute-profiles
- PUT /compute-profiles/:id
- DELETE /compute-profiles/:id
- POST /compute-profiles/:id/test

#### Notebook execution (WebSocket)
- ExecutionGateway routes kernel:start and cell:execute events to KernelAdapterService.

### State and file side effects (current MVP)
- Pipeline definitions stored in a JSON file (PIPELINES_FILE).
- Airflow DAG Python files written into AIRFLOW_DAGS_DIR.
- Spark job config JSON written into AIRFLOW_SPARK_JOBS_DIR.
- Postgres connection settings persisted into .env by ConnectionsService.
- Delta Lake paths use DELTA_BASE_PATH as default root.

### Current orchestration and execution
- Airflow runs per-pipeline DAGs generated by the backend.
- Spark ingestion runs inside the Airflow worker container via spark_ingest.py.
- Source DB credentials are injected as environment variables into Airflow tasks.

### Current behavioral sequences
#### Create pipeline (current MVP)
```mermaid
sequenceDiagram
  participant Client
  participant PipelinesController
  participant PipelinesService
  participant PostgresMetadataService
  participant FS as FileSystem

  Client->>PipelinesController: POST /pipelines
  PipelinesController->>PipelinesService: create(dto)
  PipelinesService->>PostgresMetadataService: listColumns(schema, table)
  PostgresMetadataService-->>PipelinesService: columns
  PipelinesService->>FS: write pipelines.json
  PipelinesService->>FS: write spark job json
  PipelinesService->>FS: write Airflow DAG py
  PipelinesService-->>PipelinesController: pipeline
  PipelinesController-->>Client: pipeline
```

#### Trigger pipeline run (current MVP)
```mermaid
sequenceDiagram
  participant Client
  participant IngestionController
  participant PipelinesService
  participant AirflowService

  Client->>IngestionController: POST /ingestion/pipelines/:id/runs
  IngestionController->>PipelinesService: getByIdOrThrow(id)
  PipelinesService-->>IngestionController: pipeline
  IngestionController->>AirflowService: triggerDagRun(dagId, conf)
  AirflowService-->>IngestionController: run
  IngestionController-->>Client: run
```

#### Notebook execution (current MVP)
```mermaid
sequenceDiagram
  participant Client
  participant ExecutionGateway
  participant KernelAdapterService
  participant ComputeProfileService
  participant KernelSession
  participant KernelGateway

  Client->>ExecutionGateway: WS kernel:start
  ExecutionGateway->>KernelAdapterService: startKernel(notebookId, profileId)
  KernelAdapterService->>ComputeProfileService: findOne(profileId)
  ComputeProfileService-->>KernelAdapterService: profile
  KernelAdapterService->>KernelSession: start(kernel)
  KernelSession->>KernelGateway: POST /api/kernels
  KernelGateway-->>KernelSession: kernel id
  KernelSession->>KernelGateway: WS /api/kernels/:id/channels
  KernelSession-->>ExecutionGateway: status + ready
  Client->>ExecutionGateway: cell:execute
  ExecutionGateway->>KernelAdapterService: executeCode
  KernelAdapterService->>KernelSession: execute(code)
  KernelSession->>KernelGateway: execute_request
  KernelGateway-->>KernelSession: iopub messages
  KernelSession-->>ExecutionGateway: cell:stream/result/error
  ExecutionGateway-->>Client: messages
```

## Target architecture (planned DDD refactor)

### Objectives
- Polymorphic data sources via a connector plugin system.
- Domain-driven layout with clear separation of core, connectors, orchestration, and features.
- Dynamic DAG generation instead of filesystem writes.
- Late-binding configuration with zero-trust credentials at runtime.
- Distributed Spark on Kubernetes with dynamic allocation.

### DDD directory layout (target)
```text
back/src/
  core/
    config/
    platform-database/
    crypto/
  orchestration/
    interfaces/
    providers/
      airflow/
  connectors/
    connector.registry.ts
    interfaces/
    plugins/
      postgres/
      salesforce/
  features/
    connections/
    pipelines/
    metastore/
    workspace/
```

### Module dependency graph (target DDD)
```mermaid
graph TD
    subgraph Core [Core Infrastructure]
        ConfigModule
        PlatformDatabaseModule
        CryptoModule
    end

    subgraph Connectors [Connectors Plugin System]
        ConnectorsModule
    end

    subgraph Orchestration [Orchestration Abstraction]
        OrchestrationModule
    end

    subgraph Features [User Features]
        PipelinesModule
        ConnectionsModule
        MetastoreModule
        WorkspaceModule
    end

    Features --> Core
    ConnectorsModule --> Core
    PipelinesModule --> ConnectorsModule
    ConnectionsModule --> ConnectorsModule
    PipelinesModule --> OrchestrationModule
    MetastoreModule --> Core
    WorkspaceModule --> Core
```

### Control plane class diagram (target DDD)
```mermaid
classDiagram
    direction TB

    class CryptoService {
        +encrypt(text) Promise
        +decrypt(encryptedData) Promise
    }
    
    class PlatformDatabaseService {
        +query(sql, params) Promise
    }

    class ConnectorRegistryService {
        -connectors Map
        +register(connector)
        +getConnector(type) IConnector
    }
    
    class IConnector {
        <<interface>>
        +type string
        +getExecutionImage() string
        +validateConfig(config) Promise
        +discoverSchemas(config, credentials) Promise
    }
    
    class PostgresConnector {
        +type
        +getExecutionImage()
        +discoverSchemas()
    }
    
    class SalesforceConnector {
        +type
        +getExecutionImage()
        +discoverSchemas()
    }

    class IOrchestratorService {
        <<interface>>
        +triggerRun(pipelineId)
    }
    
    class AirflowProvider {
        +triggerRun()
    }

    class PipelinesService {
        +createPipeline()
        +validatePipeline()
    }
    
    class InternalRuntimeController {
        <<REST API>>
        +getRuntimeConfig(pipelineId, runId)
    }

    IConnector <|-- PostgresConnector : implements
    IConnector <|-- SalesforceConnector : implements
    IOrchestratorService <|-- AirflowProvider : implements

    ConnectorRegistryService o-- IConnector : manages
    
    PipelinesService --> ConnectorRegistryService : delegates metadata discovery
    PipelinesService --> IOrchestratorService : triggers jobs
    
    InternalRuntimeController --> CryptoService : decrypts payload
    InternalRuntimeController --> PlatformDatabaseService : loads state
```

### Core domain class diagram (typed signatures)
```mermaid
classDiagram
  direction TB

  namespace Infrastructure {
    class CryptoService {
      +encrypt(text: string): Promise~string~
      +decrypt(encryptedData: string): Promise~string~
    }
    class PlatformDatabaseService {
      +query(sql: string, params: any[])
    }
  }

  namespace Connectors {
    class ConnectorRegistryService {
      +register(connector: IConnector)
      +getConnector(type: string): IConnector
    }
    class IConnector {
      <<interface>>
      +type: string
      +getExecutionImage(): string
      +validateConfig(config: any): Promise~boolean~
      +discoverSchemas(config, credentials): Promise~SchemaDef[]~
    }
    class PostgresConnector {
      +type = 'postgres'
      +getExecutionImage() = 'fusion/ingest-postgres'
    }
    class SalesforceConnector {
      +type = 'salesforce'
      +getExecutionImage() = 'fusion/ingest-salesforce'
    }
  }

  namespace Pipelines {
    class PipelinesService {
      +createPipeline()
      +validatePipeline()
    }
    class InternalRuntimeController {
      +getRuntimeConfig(pipelineId, runId)
    }
  }

  IConnector <|-- PostgresConnector : implements
  IConnector <|-- SalesforceConnector : implements
  ConnectorRegistryService o-- IConnector : manages
  PipelinesService --> ConnectorRegistryService : delegates metadata discovery
  InternalRuntimeController --> CryptoService : decrypts late-binding payload
```

### Connector framework (target)
- IConnector defines: type, getExecutionImage, validateConfig, testConnection, discoverSchemas, discoverColumns, previewData.
- ConnectorRegistryService registers plugins and returns the correct connector by type.
- PipelinesService validates pipeline schemas via connector metadata discovery.
- Airflow receives a per-connector execution image from the registry.

### Orchestration abstraction (target)
- IOrchestratorService defines triggerRun and other orchestration operations.
- AirflowProvider implements the interface and hides Airflow REST details.

### Internal runtime API and late binding (target)
- GET /internal/pipelines/active returns active pipelines with cron and execution image.
- Runtime config endpoint appears in design docs in two variants: GET /internal/pipelines/{pipelineId}/runtime-config with optional runId query, and GET /internal/pipelines/{runId}/runtime-config. Normalize to a single path in implementation to avoid ambiguity.
- CryptoService decrypts connector and storage credentials just-in-time.
- Access is protected by an internal API key or network boundary.

### Dynamic Airflow DAG factory (target)
- A single Airflow script builds DAGs in memory by polling active pipelines.
- Each DAG uses SparkKubernetesOperator with a SparkApplication spec.
- The driver pod receives INTERNAL_API_URL and INTERNAL_API_KEY to fetch late-binding config.
- Dynamic allocation is enabled to scale executors based on workload.

### Target execution flow example (Salesforce incremental ingestion)
1. Airflow parses dynamic_dag_builder.py and fetches active pipelines.
2. Airflow generates an in-memory DAG for the Salesforce pipeline.
3. Cron triggers a DAG run; Airflow submits a SparkApplication to the cluster.
4. Spark Driver pod starts and calls the internal runtime-config endpoint.
5. NestJS decrypts OAuth and S3 credentials and returns runtime config.
6. Spark Driver requests more executors based on data volume.
7. Executors complete tasks, scale down, and the driver exits cleanly.

### Data plane class diagram (target)
```mermaid
classDiagram
    direction TB

    class IngestionJob {
        -run_id str
        -pipeline_id str
        +execute()
    }

    class LateBindingClient {
        -api_url str
        -api_key str
        +fetch_runtime_config(pipeline_id, run_id) dict
    }

    class SparkSessionFactory {
        +create_session(s3_config) SparkSession
    }

    class ISourceReader {
        <<interface>>
        +read(spark, schema, table, watermark) DataFrame
    }

    class JDBCSourceReader {
        -credentials dict
        +read() DataFrame
    }
    
    class SalesforceSourceReader {
        -oauth_token dict
        +read() DataFrame
    }

    class DeltaDestinationWriter {
        -s3_keys dict
        +write(df, dest_path, mode)
    }

    IngestionJob --> LateBindingClient : 1. Fetches secrets
    IngestionJob --> SparkSessionFactory : 2. Starts Spark Engine
    IngestionJob --> ISourceReader : 3. Extracts data
    ISourceReader <|-- JDBCSourceReader : implements
    ISourceReader <|-- SalesforceSourceReader : implements
    IngestionJob --> DeltaDestinationWriter : 4. Saves data
```

### Workspace and notebook execution class diagram (target)
```mermaid
classDiagram
    direction TB

    class NotebookService {
        +findAll()
        +findOne(id)
        +create(dto)
        +update(id, dto)
    }

    class ComputeProfileService {
        +findAll()
        +findOne(id)
        +testConnection(id)
    }

    class ExecutionGateway {
        <<WebSocket>>
        +handleKernelStart(client, payload)
        +handleCellExecute(client, payload)
    }

    class KernelAdapterService {
        -sessions: Map
        +startKernel(notebookId, profileId)
        +executeCode(notebookId, cellId, code)
    }
    
    class KernelBundlerService {
        +bootstrapKernel(profileId, session) Promise
        -generatePySparkPayload(sparkConfig, s3Keys) string
    }

    class KernelSession {
        -gatewayUrl: string
        -kernelId: string
        -ws: WebSocket
        +start(language)
        +execute(cellId, code, silent)
    }
    
    class CryptoService {
        +decrypt(data)
    }

    ExecutionGateway --> KernelAdapterService : Routes UI Events
    KernelAdapterService --> ComputeProfileService : Fetches Gateway URL
    KernelAdapterService --> KernelBundlerService : Triggers bootstrap
    
    KernelBundlerService --> CryptoService : Decrypts S3 keys
    KernelBundlerService --> KernelSession : Sends silent execute_request
    
    KernelAdapterService *-- KernelSession : Owns & Manages (1 per Notebook)
```

### Target behavioral sequences
#### End-to-end execution sequence
```mermaid
sequenceDiagram
    autonumber
    participant Airflow as Airflow Scheduler
    participant NestAPI as NestJS API
    participant Crypto as NestJS Crypto
    participant SparkOp as Spark Operator
    participant Driver as Spark Driver Pod
    participant Executors as Spark Executor Pods
    participant SourceDB as Data Source
    
    Airflow->>NestAPI: GET /internal/pipelines/active
    NestAPI-->>Airflow: JSON [Active Pipelines + Crons + Images]
    Airflow->>Airflow: dynamically build DAGs in memory
    
    Note over Airflow, Executors: Cron Trigger Reached
    Airflow->>SparkOp: Submit SparkApplication CRD
    SparkOp->>Driver: Launch Driver Pod
    
    Note right of Driver: Pod boots securely with NO PASSWORDS
    Driver->>NestAPI: GET /internal/pipelines/{id}/runtime-config
    NestAPI->>Crypto: decrypt(credentials)
    Crypto-->>NestAPI: plaintext db_password & s3_keys
    NestAPI-->>Driver: JSON (Config + Passwords)
    
    Driver->>SparkOp: Data is large. Request Executors
    SparkOp->>Executors: Launch Executor Pods
    
    Driver->>Executors: Distribute partitions & in-memory secrets
    Executors->>SourceDB: Extract via JDBC
    SourceDB-->>Executors: Stream Rows
    Executors->>Executors: Write to MinIO in Delta Format
    
    Executors-->>Driver: Tasks Complete
    Driver-->>SparkOp: Exit Code 0
    Note over Driver, Executors: Kubernetes destroys Pods. Memory & secrets wiped!
```

#### Pipeline creation and validation (target)
```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI
    participant API as PipelinesController
    participant Svc as PipelinesService
    participant Reg as ConnectorRegistry
    participant DB as PlatformDatabase
    
    UI->>API: POST /pipelines (Source + Dest DTO)
    API->>Svc: validatePipeline(dto)
    Svc->>DB: getConnection(dto.source_connection_id)
    DB-->>Svc: Connection config & encrypted creds
    
    Svc->>Reg: getConnector(connection.type)
    Reg-->>Svc: IConnector Plugin
    Svc->>Reg: discoverSchemas(config, creds)
    Reg-->>Svc: Schema Metadata
    
    Svc->>Svc: Validate DTO against Schema
    Svc->>DB: INSERT INTO pipelines
    DB-->>Svc: Pipeline Entity
    Svc-->>API: Created Pipeline
    API-->>UI: 201 Created
```

#### Notebook and kernel execution (target)
```mermaid
sequenceDiagram
    autonumber
    participant UI as Notebook Editor
    participant WS as ExecutionGateway
    participant Adp as KernelAdapterService
    participant Bundler as KernelBundlerService
    participant Sess as KernelSession
    participant GW as Jupyter Kernel Gateway
    
    UI->>WS: WS Connect
    UI->>WS: kernel:start { compute_profile_id }
    WS->>Adp: startKernel(notebookId, profileId)
    Adp->>Sess: new KernelSession()
    
    Sess->>GW: POST /api/kernels
    GW-->>Sess: kernelId
    Sess->>GW: WS Connect to /api/kernels/{id}/channels
    
    Note over Adp, Bundler: Zero-Trust Bootstrap Phase
    Adp->>Bundler: bootstrapKernel(profileId, session)
    Bundler->>Bundler: Fetch Decrypted S3 Keys & Spark Config
    Bundler->>Sess: execute(hidden_bootstrap_code, silent=true)
    Sess->>GW: WS execute_request (silent)
    GW-->>Sess: ok
    Bundler-->>Adp: Success
    
    Sess-->>WS: status: ready
    WS-->>UI: kernel:ready
    
    UI->>WS: cell:execute { code }
    WS->>Adp: executeCode(code)
    Adp->>Sess: execute(code)
    Sess->>GW: WS execute_request
    GW-->>Sess: stream (stdout)
    Sess-->>WS: cell:stream
    WS-->>UI: cell:stream (print output)
```

### Master system class diagram (cross-plane)
```mermaid
classDiagram
    direction LR

    class ReactFrontend {
        <<User Interface>>
    }

    class PipelinesController {
        +createPipeline()
        +updatePipeline()
    }
    
    class PipelinesService {
        +createPipeline()
        +validatePipeline()
    }

    class ConnectionService {
        +createConnection()
        +testConnection()
    }

    class InternalRuntimeController {
        <<REST API>>
        +getActivePipelines()
        +getRuntimeConfig(pipelineId, runId)
    }

    class IOrchestratorService {
        <<interface>>
        +triggerRun(pipelineId)
    }

    class AirflowProvider {
        +triggerRun()
    }

    class ConnectorRegistryService {
        -connectors Map
        +register(connector)
        +getConnector(type)
    }

    class IConnector {
        <<interface>>
        +type
        +getExecutionImage()
        +validateConfig()
        +discoverSchemas()
    }

    class PostgresConnector
    class SalesforceConnector

    class CryptoService {
        +encrypt(text)
        +decrypt(encryptedData)
    }

    class PlatformDatabaseService {
        +query(sql, params)
    }

    class ExecutionGateway {
        <<WebSocket>>
        +handleKernelStart()
        +handleCellExecute()
    }

    class KernelAdapterService {
        +startKernel()
        +executeCode()
    }

    class KernelBundlerService {
        +bootstrapKernel()
    }

    class KernelSession {
        +start()
        +execute(code)
    }

    class ComputeProfileService {
        +findOne()
    }

    class DynamicDagBuilder {
        <<Python DAG Factory>>
        +fetch_active_pipelines()
        +build_dags_in_memory()
    }

    class IngestionJob {
        <<Python Spark Exec>>
        -run_id
        -pipeline_id
        +execute()
    }

    class LateBindingClient {
        +fetch_runtime_config()
    }

    class SparkSessionFactory {
        +create_session(s3_config)
    }

    class ISourceReader {
        <<interface>>
        +read()
    }

    class JDBCSourceReader
    class SalesforceSourceReader

    class DeltaDestinationWriter {
        +write(df, dest_path, mode)
    }

    ReactFrontend --> PipelinesController : HTTP POST
    ReactFrontend --> ExecutionGateway : WebSocket

    PipelinesController --> PipelinesService
    PipelinesService --> IOrchestratorService
    PipelinesService --> ConnectorRegistryService
    PipelinesService --> PlatformDatabaseService
    
    ConnectionService --> ConnectorRegistryService
    ConnectionService --> CryptoService
    ConnectionService --> PlatformDatabaseService

    AirflowProvider ..|> IOrchestratorService
    PostgresConnector ..|> IConnector
    SalesforceConnector ..|> IConnector
    ConnectorRegistryService o-- IConnector

    ExecutionGateway --> KernelAdapterService
    KernelAdapterService --> ComputeProfileService
    KernelAdapterService --> KernelBundlerService
    KernelAdapterService *-- KernelSession
    KernelBundlerService --> CryptoService
    KernelBundlerService --> KernelSession

    InternalRuntimeController --> CryptoService
    InternalRuntimeController --> PlatformDatabaseService
    InternalRuntimeController --> ConnectorRegistryService

    DynamicDagBuilder --> InternalRuntimeController : Calls GET /active
    DynamicDagBuilder --> IngestionJob : Triggers via K8s Operator

    IngestionJob --> LateBindingClient
    LateBindingClient --> InternalRuntimeController : Calls GET /runtime-config
    
    IngestionJob --> SparkSessionFactory
    IngestionJob --> ISourceReader
    IngestionJob --> DeltaDestinationWriter
    JDBCSourceReader ..|> ISourceReader
    SalesforceSourceReader ..|> ISourceReader
```

## Data model (target)
```mermaid
erDiagram
    CONNECTIONS {
        uuid id PK
        string name
        string type
        jsonb config
        string credentials
        timestamp created_at
    }
    
    PIPELINES {
        uuid id PK
        string name
        uuid source_connection_id FK
        jsonb source_config
        uuid destination_catalog_id FK
        string destination_path
        string ingestion_mode
        string watermark_column
        string schedule_cron
        boolean is_active
    }

    CATALOGS {
        uuid id PK
        string name
        uuid storage_connection_id FK
        string base_prefix
    }

    COMPUTE_PROFILES {
        uuid id PK
        string name
        string kernel_gateway_url
        jsonb spark_config
    }

    CONNECTIONS ||--o{ PIPELINES : "Extracts from"
    CATALOGS ||--o{ PIPELINES : "Loads into"
    CONNECTIONS ||--o{ CATALOGS : "Storage Keys"
```

## Use case diagrams

### User-facing use cases
```mermaid
usecaseDiagram
  actor "Data Engineer" as DE
  actor "Data Analyst" as DA
  actor "Admin" as ADM

  rectangle "Data Ingestor Platform" {
    (Configure Connection) as UC1
    (Test Connection) as UC2
    (Discover Schemas and Tables) as UC3
    (Create Pipeline) as UC4
    (Validate Pipeline) as UC5
    (Schedule Pipeline) as UC6
    (Trigger Ingestion Run) as UC7
    (Monitor Runs) as UC8
    (View Logs) as UC9
    (Manage Alerts) as UC10
    (Manage Compute Profiles) as UC11
    (Create Notebook) as UC12
    (Execute Notebook Cells) as UC13
  }

  DE --> UC1
  DE --> UC2
  DE --> UC3
  DE --> UC4
  DE --> UC5
  DE --> UC6
  DE --> UC7
  DE --> UC8
  DE --> UC9

  DA --> UC12
  DA --> UC13
  DA --> UC8
  DA --> UC9

  ADM --> UC1
  ADM --> UC2
  ADM --> UC6
  ADM --> UC10
  ADM --> UC11
```

### System interaction use cases
```mermaid
usecaseDiagram
  actor "Airflow Scheduler" as Airflow
  actor "Spark Driver Pod" as Driver

  rectangle "Control Plane (NestJS Internal API)" {
    (List Active Pipelines) as UC1
    (Fetch Runtime Config) as UC2
  }

  Airflow --> UC1
  Driver --> UC2
```

## Implementation plan and phases

### Phase 1: Foundation and infrastructure overhaul
- Move notebook-database to core/platform-database.
- Move config to core/config.
- Rename catalog to features/metastore.
- Move notebooks, compute-profiles, execution under features/workspace.
- Add core/crypto/crypto.service.ts with AES-256-GCM.
- Add tests for CryptoService.
- Add platform database migrations for connections and pipelines tables.

### Phase 2: Connector framework (plugin system)
- Create connectors/interfaces/connector.interface.ts.
- Implement ConnectorRegistryService as a type-to-plugin map.
- Migrate Postgres logic into connectors/plugins/postgres/postgres.connector.ts.
- Update connections and sources features to use registry instead of hardcoded Postgres services.

### Phase 3: Dynamic pipeline state and API migration
- Store pipelines in the database instead of pipelines.json.
- Validate pipelines via connector.discoverSchemas.
- Remove writeDagFile and writeSparkConfigFile from PipelinesService.

### Phase 4: Dynamic orchestration and late-binding API
- Add features/pipelines/internal.controller.ts with runtime-config endpoint.
- Secure internal endpoints with an API key or network boundary.
- Move Airflow provider under orchestration/providers/airflow and implement interface.
- Replace static DAG generation with dynamic_dag_builder.py polling.

### Phase 5: Decoupled containerized execution
- Install Spark Operator in the cluster.
- Use SparkKubernetesOperator for SparkApplication submission.
- Build per-connector ingestion images (ingest-postgres, ingest-salesforce, ingest-sap).
- Spark Driver fetches runtime-config and scales executors dynamically.

## Migration and rollout strategy
1. Structural safe refactor (Phase 1) with no behavior change.
2. Dual-write pipelines (DB + legacy files) to keep Airflow stable.
3. Switchover to dynamic DAGs and Spark Operator, then remove legacy DAG generation.

## Risks and mitigations
- High load from Airflow polling NestJS too frequently.
  - Mitigate with caching and a fast /pipelines/active endpoint.
- Internal runtime API exposure.
  - Mitigate with internal API key or one-time JWT/nonce.
- Connector dependency bloat.
  - Mitigate with per-connector images and strict registry enforcement.

## Operational runbook (current MVP)

### Environment variables
| Key | Purpose | Default / Example |
| --- | --- | --- |
| APP_PORT | NestJS listen port | 3001 |
| AIRFLOW_BASE_URL | Airflow REST API base | http://localhost:8080 |
| AIRFLOW_DAG_ID | Default DAG id | ingest_postgres_to_delta |
| AIRFLOW_AUTH_TYPE | Auth type (none/basic/bearer) | basic |
| AIRFLOW_USERNAME | Airflow username | admin |
| AIRFLOW_PASSWORD | Airflow password | admin |
| AIRFLOW_TOKEN | Bearer token | empty |
| AIRFLOW_TIMEOUT_MS | Airflow request timeout | 10000 |
| AIRFLOW_DAGS_DIR | Airflow DAG output folder | ../airflow/dags |
| PGHOST | Source Postgres host | localhost |
| PGPORT | Source Postgres port | 5432 |
| PGDATABASE | Source Postgres DB | example_db |
| PGUSER | Source Postgres user | postgres |
| PGPASSWORD | Source Postgres password | postgres |
| PIPELINES_FILE | Pipeline JSON store | ./data/pipelines.json |
| PREVIEW_ROW_LIMIT | Row preview limit | 20 |
| DELTA_BASE_PATH | Delta base path | ../delta |

### Local backend
- cd back
- npm install
- npm run start:dev

### Local Airflow + Spark (docker compose)
- cd airflow_spark_delta
- AIRFLOW_UID=$(id -u) AIRFLOW_GID=0 docker compose up -d
- Airflow UI: http://localhost:8080 (admin/admin)
- Compose includes postgres-source for schema discovery and ingestion.

### Security posture (current vs target)
- Current MVP: source DB credentials are injected into Airflow tasks via env vars.
- Target: credentials are never stored in Airflow, and are late-bound in memory via internal runtime-config.
