# Target Architecture: Directory Schema & UML Diagrams

## 1. Macro System Architecture (Control Plane vs Data Plane)

This diagram illustrates the absolute highest level of the platform. It separates the "Manager" (Control Plane) from the "Workers" (Data Plane) and shows where the storage layers fit in.

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

---

## 3. Core Domain Class Diagram

This diagram zooms into the NestJS application to map out the exact TypeScript interfaces and services driving the scalable Connector Pattern and dynamic execution.

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

---

## 4. Execution Sequence Diagram (Spark on K8s)

This diagram traces a full ingestion run, illustrating how Airflow creates DAGs dynamically, how Kubernetes spawns the Spark Driver, and how the Driver retrieves its zero-trust credentials.

```mermaid
sequenceDiagram
  autonumber
  participant Airflow as Airflow Scheduler
  participant NestAPI as NestJS Platform API
  participant SparkOp as K8s Spark Operator
  participant Driver as Spark Driver Pod
  participant Executors as Spark Executor Pods
  
  Airflow->>NestAPI: GET /internal/pipelines/active
  NestAPI-->>Airflow: Active Pipelines JSON
  Airflow->>Airflow: Generate In-Memory DAGs
  
  Note over Airflow, Executors: Scheduled Time Reached
  Airflow->>SparkOp: Submit SparkApplication CRD
  SparkOp->>Driver: Launch Driver Pod
  
  Note over Driver, NestAPI: Driver boots without database credentials
  Driver->>NestAPI: GET /internal/pipelines/{id}/runtime-config
  NestAPI->>NestAPI: Decrypt Source & S3 Credentials
  NestAPI-->>Driver: JSON Payload (Credentials + Config)
  
  Note over Driver, Executors: Dynamic Allocation Triggered
  Driver->>SparkOp: Request N Executor Pods
  SparkOp->>Executors: Launch Executor Pods
  Driver->>Executors: Distribute Tasks & Secrets via Broadcast
  
  Executors->>Executors: Extract from Source & Write to MinIO
  Executors-->>Driver: Tasks Complete
  Driver-->>SparkOp: Exit Code 0
  Note over Driver, Executors: Pods Destroyed. Memory and Secrets Wiped.
```
