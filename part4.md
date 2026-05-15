## Part 4: Behavioral Sequence Diagrams

### 6. End-to-End Execution Sequence Diagram

This traces the exact chronological execution flow of a scheduled pipeline, showing how dynamic DAGs are evaluated and how the Kubernetes Spark Driver secures its secrets.

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

---

### 7. Pipeline Creation & Validation Sequence

This diagram shows how the UI interacts with NestJS to create a pipeline, how the backend validates schemas via the Registry, and how it saves to the database without generating local files.

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

---

### 8. Notebook & Kernel Execution Sequence

This maps the interactive data science workflow. Notice the crucial "Kernel Bundler" step, which silently injects decrypted MinIO S3 credentials and Spark configurations into the Python kernel before the user is allowed to execute code.

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