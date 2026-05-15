# Master System Class Diagram

This diagram provides a fine-grained, 10,000-foot view of every core class in the Data Platform and how they interact across the network boundaries (Control Plane -> Orchestrator -> Data Plane).

```mermaid
classDiagram
    direction LR

    %% ==== UI / FRONTEND ====
    class ReactFrontend {
        <<User Interface>>
    }

    %% ==== CONTROL PLANE: NESTJS BACKEND ====
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

    %% ==== ORCHESTRATION PLANE: AIRFLOW ====
    class DynamicDagBuilder {
        <<Python DAG Factory>>
        +fetch_active_pipelines()
        +build_dags_in_memory()
    }

    %% ==== DATA PLANE: SPARK / KUBERNETES ====
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

    %% ==== RELATIONSHIPS ====

    ReactFrontend --> PipelinesController : HTTP POST
    ReactFrontend --> ExecutionGateway : WebSocket

    %% Backend Core
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

    %% Notebook Execution
    ExecutionGateway --> KernelAdapterService
    KernelAdapterService --> ComputeProfileService
    KernelAdapterService --> KernelBundlerService
    KernelAdapterService *-- KernelSession
    KernelBundlerService --> CryptoService
    KernelBundlerService --> KernelSession

    %% Internal API
    InternalRuntimeController --> CryptoService
    InternalRuntimeController --> PlatformDatabaseService
    InternalRuntimeController --> ConnectorRegistryService

    %% Orchestration Crossing
    DynamicDagBuilder --> InternalRuntimeController : Calls GET /active
    DynamicDagBuilder --> IngestionJob : Triggers via K8s Operator

    %% Data Plane Crossing
    IngestionJob --> LateBindingClient
    LateBindingClient --> InternalRuntimeController : Calls GET /runtime-config
    
    %% Data Plane Internals
    IngestionJob --> SparkSessionFactory
    IngestionJob --> ISourceReader
    IngestionJob --> DeltaDestinationWriter
    JDBCSourceReader ..|> ISourceReader
    SalesforceSourceReader ..|> ISourceReader
```