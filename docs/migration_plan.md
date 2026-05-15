# Migration Plan (MVP to Target Architecture)

## Phase 1: Foundation and DDD Restructure
Duration: 3-4 weeks
Dependencies: none

Tasks:
- P1-1: Restructure back/src into core, connectors, orchestration, features.
  - Est: med
  - Acceptance: app builds, all imports resolved, API smoke test passes.
  - Rollback: revert to previous directory layout branch.
- P1-2: Implement CryptoService with AES-256-GCM and unit tests.
  - Est: low
  - Acceptance: tests pass, encrypt/decrypt round-trip verified.
  - Rollback: feature flag to bypass encryption in non-prod.
- P1-3: Add platform DB migrations for connections and pipelines.
  - Est: med
  - Acceptance: tables created and basic CRUD works in dev.
  - Rollback: disable migrations and keep pipelines.json only.

## Phase 2: Connector Framework
Duration: 3-4 weeks
Dependencies: Phase 1

Tasks:
- P2-1: Define IConnector and SchemaDef interfaces.
  - Est: low
  - Acceptance: interfaces compiled and referenced by features.
  - Rollback: keep legacy PostgresMetadataService in parallel.
- P2-2: Implement ConnectorRegistryService and register PostgresConnector.
  - Est: med
  - Acceptance: registry returns connector type and schema discovery works.
  - Rollback: registry behind feature flag.
- P2-3: Route source discovery through connectors in pipelines and sources.
  - Est: med
  - Acceptance: /sources endpoints return same results as MVP.
  - Rollback: switch endpoints to legacy service.

## Phase 3: Pipeline State in DB + Dual Write
Duration: 3-5 weeks
Dependencies: Phase 1-2

Tasks:
- P3-1: PipelinesService CRUD against DB tables.
  - Est: med
  - Acceptance: create/update/delete pipeline in DB with schema validation.
  - Rollback: fall back to pipelines.json read/write.
- P3-2: Dual-write pipelines to DB and legacy DAG files.
  - Est: med
  - Acceptance: Airflow runs legacy DAGs while DB keeps authoritative state.
  - Rollback: disable DB write path and keep filesystem only.
- P3-3: Add /pipelines/active endpoint for dynamic DAG builder.
  - Est: low
  - Acceptance: endpoint returns active pipelines with schedule and execution image.
  - Rollback: keep endpoint returning empty list.
- P3-4: Automated smoke test: create pipeline, compare legacy vs DB run.
  - Est: low
  - Acceptance: both runs succeed and write identical Delta outputs.
  - Rollback: disable smoke test in CI.

## Phase 4: Dynamic DAGs + Runtime Config API
Duration: 4-6 weeks
Dependencies: Phase 3

Tasks:
- P4-1: Implement internal runtime-config endpoint.
  - Est: med
  - Acceptance: returns decrypted source and destination creds.
  - Rollback: restrict endpoint to dev only.
- P4-2: Add security for internal API (API key and JWT/nonce support).
  - Est: med
  - Acceptance: unauthorized calls rejected; valid calls succeed.
  - Rollback: allow only API key until JWT is ready.
- P4-3: Build dynamic_dag_builder.py with caching.
  - Est: med
  - Acceptance: Airflow shows dynamic DAGs and run triggers.
  - Rollback: keep legacy DAG files enabled.

## Phase 5: Spark on Kubernetes and Connector Images
Duration: 4-6 weeks
Dependencies: Phase 4, platform/infra coordination

Tasks:
- P5-1: Install Spark Operator and CRDs (coordination: platform/infra).
  - Est: high
  - Acceptance: SparkApplication runs a sample job.
  - Rollback: disable Spark Operator and use DockerOperator in dev.
- P5-2: Build connector images for Postgres and Salesforce.
  - Est: med
  - Acceptance: images pull and run main.py with runtime-config.
  - Rollback: use a single generic image temporarily.
- P5-3: Switch dynamic DAGs to SparkKubernetesOperator.
  - Est: med
  - Acceptance: end-to-end run completes with dynamic allocation.
  - Rollback: revert DAG operator to KubernetesPodOperator.

## Dual-Write Strategy
- Keep pipelines.json and DAG files in sync with DB until dynamic DAGs are validated.
- Maintain an automated smoke test that compares legacy and dynamic runs on the same pipeline.

## Acceptance Tests (Examples)
- Create pipeline -> validate -> trigger run -> verify Delta write.
- Call /internal/pipelines/{id}/runtime-config with valid auth -> 200.
- Airflow dynamic DAG appears within cache TTL and triggers SparkApplication.

## Rollback Plan
- Feature flags: dynamic_dag_enabled, runtime_config_enabled.
- Keep legacy DAG generation until Spark Operator path is stable.
- Maintain a last-known-good pipelines.json snapshot for restore.
