## Part 2: The Control Plane (NestJS Backend)

### 3. NestJS Module Dependency Graph

This diagram shows how the internal NestJS modules depend on each other, proving the strict Domain-Driven Design (DDD) boundaries where features do not tightly couple to specific data source implementations.

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

---

### 4. Control Plane Class Diagram (Domain-Driven Design)

This diagram details the core TypeScript interfaces and classes in the NestJS application. It highlights the `ConnectorRegistryService` (Plugin Pattern) and the Late-Binding internal API controller.

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