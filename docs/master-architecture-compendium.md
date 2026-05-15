# Master Architecture Compendium

## Executive Summary
The current MVP delivers Airflow-orchestrated Spark ingestion and Kernel Gateway notebooks but is tightly coupled to Postgres and filesystem DAG generation. The target design introduces a DDD layout, connector plugins, dynamic DAGs, and Spark on Kubernetes with late-binding credentials to improve scalability and security. This compendium consolidates the architecture, domain model, and migration plan into a concrete, phased roadmap with runnable examples and diagrams. The recommended next steps are to scaffold the connector registry and crypto service, dual-write pipelines to the database, and stand up the internal runtime API for late-binding. Sources: scalable-architecture-master-plan.md; architecture-deep-dive.md; backend-system-design-plan.md; back/README.md.

## Scope and Sources
Included: all_diagrams.md, architecture-deep-dive.md, backend-system-design-plan.md, master_class_diagram.md, part2.md, part3.md, part4.md, part5.md, scalable-architecture-master-plan.md, target-architecture-diagrams.md, back/README.md. Skipped: minio-metastore-plan.md and any metastore-only docs as requested.

## Current MVP Snapshot
- Airflow schedules per-pipeline DAG files written to disk and runs Spark locally inside Airflow containers.
- Pipeline state stored in pipelines.json; writes DAG and Spark job JSON files as side effects.
- Postgres connection stored in .env; credentials injected into Airflow tasks via env vars.
- Jupyter Kernel Gateway provides notebook execution via WebSocket, with KernelAdapter managing sessions.

Sources: backend-system-design-plan.md; back/README.md.

## Target Architecture Overview
- DDD layout separating core, connectors, orchestration, and features.
- Connector plugin system via IConnector and ConnectorRegistryService.
- Dynamic DAG factory in Airflow that polls internal API for active pipelines.
- Spark on Kubernetes via Spark Operator and SparkApplication CRDs with dynamic allocation.
- Late-binding runtime-config endpoint returns decrypted credentials in-memory only.
- Notebook bootstrap injects decrypted S3/Spark config into kernel before user code.

Sources: scalable-architecture-master-plan.md; architecture-deep-dive.md; part2.md; part4.md; part5.md; target-architecture-diagrams.md; master_class_diagram.md.

## Canonical Domain Model (Target)
### Entities
Connection
- id: uuid
- name: string
- type: string
- config: jsonb
- credentials: string (AES-GCM encrypted)
- createdAt: timestamp
- updatedAt: timestamp
Sources: scalable-architecture-master-plan.md; all_diagrams.md.

Pipeline
- id: uuid
- name: string
- sourceConnectionId: uuid
- sourceConfig: jsonb
- destinationCatalogId: uuid
- destinationPath: string
- ingestionMode: "full" | "incremental"
- watermarkColumn?: string (inferred optional from incremental mode)
- scheduleCron?: string (inferred optional from scheduling)
- isActive: boolean
Sources: scalable-architecture-master-plan.md; all_diagrams.md.

Catalog
- id: uuid
- name: string
- storageConnectionId: uuid
- basePrefix: string
Sources: all_diagrams.md.

ComputeProfile
- id: uuid
- name: string
- kernelGatewayUrl: string
- sparkConfig: jsonb
Sources: all_diagrams.md; part5.md.

Notebook
- id: uuid
- name: string
- content: string (inferred; stored notebook JSON or text)
- computeProfileId: uuid
- createdAt: timestamp (inferred)
- updatedAt: timestamp (inferred)
Sources: backend-system-design-plan.md; part5.md.

### Relationships
- Connection 1..* Pipeline (source).
- Catalog 1..* Pipeline (destination).
- ComputeProfile 1..* Notebook.
Sources: all_diagrams.md; backend-system-design-plan.md.

## Core Services and Interfaces (Target DDD)
Key interfaces and services:
- IConnector (discoverSchemas, testConnection, getExecutionImage, discoverColumns).
- ConnectorRegistryService (register, getConnector, list).
- IOrchestratorService (triggerRun, getRunStatus, getLogs).
- PipelinesService (create, update, validate, list, getActive).
- InternalRuntimeController (getActivePipelines, getRuntimeConfig).
- KernelAdapterService + KernelBundlerService (kernel lifecycle and bootstrap).

Sources: architecture-deep-dive.md; master_class_diagram.md; part2.md; part5.md; backend-system-design-plan.md.

## Orchestration and Runtime Security
Dynamic DAGs:
- Airflow loads dynamic_dag_builder.py and builds DAGs in memory from /internal/pipelines/active.
- DAGs submit SparkApplication CRDs with connector-specific images.

Security options for runtime-config:
1) API key + network policy
   - Pros: simple, fast to implement.
   - Cons: static secret risk; rotation burden.
2) Short-lived JWT or nonce (preferred)
   - Pros: least privilege, time-bound, auditable.
   - Cons: requires token issuance and validation logic.

Recommendation: short-lived JWT or nonce with a tight NetworkPolicy to reduce blast radius while preserving usability.
Sources: architecture-deep-dive.md; scalable-architecture-master-plan.md; part4.md.

## Target Ingestion Flow
1. Airflow polls /internal/pipelines/active and builds DAGs in memory.
2. On schedule, Airflow submits SparkApplication with connector image.
3. Spark Driver calls /internal/pipelines/{id}/runtime-config to fetch decrypted creds.
4. Driver creates SparkSession, requests executors, extracts data, writes Delta.
5. Pods terminate; secrets only in memory.

Sources: architecture-deep-dive.md; part4.md; target-architecture-diagrams.md.

## Target Notebook Execution Flow
1. UI starts kernel via ExecutionGateway.
2. KernelAdapterService creates KernelSession.
3. KernelBundlerService injects decrypted S3/Spark settings silently.
4. UI executes cells; results stream back via WebSocket.

Sources: backend-system-design-plan.md; part4.md; part5.md.

## Diagram Index
- Master class diagram (Mermaid): docs/diagrams/master_class_diagram.mmd
- Master class diagram (PlantUML): docs/diagrams/master_class_diagram.puml
- Sequence run pipeline: docs/diagrams/sequence_run_pipeline.mmd
- Excalidraw macro diagram: docs/diagrams/excalidraw/architecture.excalidraw.json

## Target Repo Skeleton (Selected Templates)
See docs/repo_skeleton.json for the full tree. Minimal starter templates:

core/crypto/crypto.service.ts
```ts
import { Injectable } from "@nestjs/common";
import crypto from "crypto";

@Injectable()
export class CryptoService {
  private readonly key = Buffer.from(process.env.PLATFORM_SECRET_KEY || "", "base64");

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }
}
```

connectors/interfaces/connector.interface.ts
```ts
export interface SchemaDef {
  name: string;
  tables: { name: string; type: "table" | "view" }[];
}

export interface IConnector {
  readonly type: string;
  getExecutionImage(): string;
  validateConfig(config: unknown): boolean;
  testConnection(config: unknown, credentials: unknown): Promise<boolean>;
  discoverSchemas(config: unknown, credentials: unknown): Promise<SchemaDef[]>;
  discoverColumns(config: unknown, credentials: unknown, schema: string, table: string): Promise<any[]>;
}
```

orchestration/interfaces/orchestrator.interface.ts
```ts
export interface IOrchestratorService {
  triggerRun(pipelineId: string, conf?: Record<string, unknown>): Promise<{ runId: string }>;
  getRunStatus(dagId: string, runId: string): Promise<{ state: string }>;
  getLogs(dagId: string, runId: string, taskId: string): Promise<string>;
}
```

features/pipelines/internal.controller.ts
```ts
@Controller("internal/pipelines")
export class InternalRuntimeController {
  constructor(
    private readonly crypto: CryptoService,
    private readonly db: PlatformDatabaseService,
    private readonly registry: ConnectorRegistryService
  ) {}

  @Get("active")
  getActivePipelines(): Promise<any[]> {
    return this.db.query("select * from pipelines where is_active = true", []);
  }

  @Get(":pipelineId/runtime-config")
  async getRuntimeConfig(@Param("pipelineId") pipelineId: string, @Query("runId") runId: string) {
    // Look up pipeline, connection, decrypt creds, return payload.
  }
}
```

Sources: scalable-architecture-master-plan.md; architecture-deep-dive.md; part2.md; part4.md; part5.md.

## Migration Plan Summary
- Phase 1: DDD refactor, crypto service, platform DB tables.
- Phase 2: Connector framework and registry with Postgres plugin.
- Phase 3: Pipeline state in DB with dual-write to legacy files.
- Phase 4: Internal runtime API + dynamic DAG factory.
- Phase 5: Spark Operator execution with connector images.

Sources: scalable-architecture-master-plan.md; architecture-deep-dive.md.

## Quick Wins (Prioritized)
1. Add CryptoService + tests and rotate PLATFORM_SECRET_KEY.
2. Scaffold ConnectorRegistryService and IConnector interfaces.
3. Dual-write pipelines to DB and legacy pipelines.json.
4. Add internal runtime API stub behind network policy.
5. Add dynamic DAG builder with 60s cache (no cutover yet).

## Blockers and Unknowns (Actionable)
- Secret storage provider (Vault vs KMS). Action: platform team decision and timeline.
- Spark Operator readiness in target clusters. Action: infra to install and validate CRDs.
- Network policy baseline for internal API. Action: define namespace policy set.
- Image registry strategy for connector images. Action: choose registry and retention policy.
- Notebook kernel isolation model. Action: confirm kernel gateway auth and namespace.
- Data lake access model (MinIO vs S3). Action: confirm production target and IAM model.
- Observability stack. Action: pick metrics/logs/trace stack for Spark and Airflow.

## Estimations and Staffing (Guidance)
- Phase 1-2: 1 backend lead, 1 backend dev, 0.5 QA for 3-4 weeks.
- Phase 3-4: 1 backend lead, 1 backend dev, 1 platform/infra for 4-6 weeks.
- Phase 5: 1 platform/infra, 1 data engineer, 0.5 backend for 4-6 weeks.
Rationale: refactor + connector framework first, then orchestration and infra heavy work.

## Operational Runbook Summary
- Env vars: INTERNAL_API_URL, INTERNAL_API_KEY or INTERNAL_API_JWT, PLATFORM_SECRET_KEY, AIRFLOW_BASE_URL, DELTA_BASE_PATH.
- Monitoring: SparkApplication status, Airflow DAG health, runtime-config latency, connector error rate.
- Security: network policies for internal endpoints, short-lived tokens, audit logs for runtime-config.
Sources: back/README.md; architecture-deep-dive.md.

## Validation and Review Checklist
- Diagrams render correctly and align with DDD modules.
- Internal runtime API returns full runtime-config payload.
- Dynamic DAG builder produces matching DAG IDs to legacy.
- SparkApplication executes end-to-end with late-binding creds.
- Notebook bootstrap injects S3/Spark config and remains silent.
