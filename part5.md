## Part 5: Workspace & Execution (Notebooks)

### 9. Notebooks & Execution Class Diagram

This diagram highlights how the NestJS backend manages the state of Notebooks and Compute Profiles, and how the `ExecutionGateway` proxies live code execution. Crucially, it includes the `KernelBundlerService` which silently injects zero-trust credentials.

```mermaid
classDiagram
    direction TB

    %% Persistence Layer
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

    %% Execution Layer
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

    %% Relationships
    ExecutionGateway --> KernelAdapterService : Routes UI Events
    KernelAdapterService --> ComputeProfileService : Fetches Gateway URL
    KernelAdapterService --> KernelBundlerService : Triggers bootstrap
    
    KernelBundlerService --> CryptoService : Decrypts S3 keys
    KernelBundlerService --> KernelSession : Sends silent execute_request
    
    KernelAdapterService *-- KernelSession : Owns & Manages (1 per Notebook)
```