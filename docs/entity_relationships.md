# Platform Entity-Relationship Diagram

This diagram illustrates the database entities of the platform, including the Multi-Tenancy model (`User` and `Workspace`) and how they secure and group the execution resources (`Pipelines`, `Notebooks`, `Connections`, etc.).

```mermaid
erDiagram
    %% ==== Identity & Access Management (IAM) ====
    USER {
        uuid id PK
        string email
        string full_name
        timestamp created_at
    }
    
    WORKSPACE {
        uuid id PK
        string name
        string description
        timestamp created_at
    }
    
    WORKSPACE_USER {
        uuid workspace_id PK, FK
        uuid user_id PK, FK
        string role "e.g., admin, editor, viewer"
    }

    %% ==== Core Platform Resources ====
    CONNECTION {
        uuid id PK
        uuid workspace_id FK
        string name
        string type "postgres, salesforce, s3"
        jsonb config
        string credentials "AES-GCM encrypted"
        uuid created_by FK
    }
    
    CATALOG {
        uuid id PK
        uuid workspace_id FK
        string name
        uuid storage_connection_id FK
        string base_prefix
        uuid created_by FK
    }

    PIPELINE {
        uuid id PK
        uuid workspace_id FK
        string name
        uuid source_connection_id FK
        uuid destination_catalog_id FK
        jsonb source_config
        string ingestion_mode
        string schedule_cron
        boolean is_active
        uuid created_by FK
    }

    COMPUTE_PROFILE {
        uuid id PK
        uuid workspace_id FK
        string name
        jsonb spark_config
    }

    NOTEBOOK {
        uuid id PK
        uuid workspace_id FK
        string name
        uuid compute_profile_id FK
        jsonb content
        uuid created_by FK
    }

    %% ==== Relationships ====
    
    %% IAM Relations
    USER ||--o{ WORKSPACE_USER : "Has access via"
    WORKSPACE ||--o{ WORKSPACE_USER : "Contains members"
    
    %% Workspace Ownership (Boundary isolation)
    WORKSPACE ||--o{ CONNECTION : "Owns"
    WORKSPACE ||--o{ CATALOG : "Owns"
    WORKSPACE ||--o{ PIPELINE : "Owns"
    WORKSPACE ||--o{ COMPUTE_PROFILE : "Owns"
    WORKSPACE ||--o{ NOTEBOOK : "Owns"
    
    %% Resource Relations
    CONNECTIONS ||--o{ PIPELINES : "Extracts from"
    CATALOGS ||--o{ PIPELINES : "Loads into"
    CONNECTIONS ||--o{ CATALOGS : "Provides Storage Keys for"
    COMPUTE_PROFILES ||--o{ NOTEBOOKS : "Provides Engine for"
    
    %% Audit Relations
    USER ||--o{ PIPELINE : "Creates/Updates"
    USER ||--o{ NOTEBOOK : "Creates/Updates"
```