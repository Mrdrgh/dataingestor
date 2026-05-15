# Enterprise Data Platform: System Diagrams

This document contains the complete set of architectural diagrams for the scalable, Domain-Driven data ingestion platform.

---

## Part 1: High-Level Architecture & State

### 1. Macro System Architecture

This flowchart illustrates the highest level of the platform. It separates the "Manager" (Control Plane) from the "Workers" (Data Plane) and maps out the complete interaction flow from the User UI down to the Data Ecosystem.

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

### 2. Platform Database ERD (Entity-Relationship Diagram)

This diagram maps out the internal state managed by the NestJS Control Plane. The polymorphic `jsonb` fields allow the platform to support any type of data source without altering the database schema.

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