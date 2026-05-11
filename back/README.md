## Data Ingestor Platform

This repo hosts an MVP data ingestion platform that mirrors the data ingestion experience in Databricks, using Airflow to orchestrate Spark ingestion into Delta format.

### Backend (NestJS)

The backend lives in `back/` and exposes a REST API for connections, schedules, runs, logs, and alerts. It proxies execution to the Airflow REST API and reads the Postgres source from `.env`.

Pipeline creation writes a per-pipeline DAG file into `AIRFLOW_DAGS_DIR` and stores pipeline definitions in `PIPELINES_FILE`.

#### Environment variables

Create a `.env` at the workspace root (or inside `back/`). The backend validates these on startup:

```
APP_PORT=3001

AIRFLOW_BASE_URL=http://localhost:8080
AIRFLOW_DAG_ID=ingest_postgres_to_delta
AIRFLOW_AUTH_TYPE=basic
AIRFLOW_USERNAME=admin
AIRFLOW_PASSWORD=admin
AIRFLOW_TOKEN=
AIRFLOW_TIMEOUT_MS=10000
AIRFLOW_DAGS_DIR=../airflow/dags

PGHOST=localhost
PGPORT=5432
PGDATABASE=example_db
PGUSER=postgres
PGPASSWORD=postgres

PIPELINES_FILE=./data/pipelines.json
PREVIEW_ROW_LIMIT=20
DELTA_BASE_PATH=../delta
```

`AIRFLOW_AUTH_TYPE` supports `none`, `basic`, or `bearer`.

For local Airflow, the docker compose stack uses basic auth with `admin/admin`.

#### Install and run

```
cd back
npm install
npm run start:dev
```

#### Airflow + Spark (local docker compose)

Run the Airflow stack (including a local Postgres source for ingestion):

```
cd airflow_spark_delta
AIRFLOW_UID=$(id -u) AIRFLOW_GID=0 docker compose up -d
```

Notes:
- Airflow UI: `http://localhost:8080` (basic auth `admin/admin`).
- The compose stack includes `postgres-source` on `localhost:5432` for backend discovery.
- Airflow tasks read source DB settings from `SOURCE_PG*` env vars inside the Airflow containers.
- If `5432` is already taken, set `SOURCE_PG_HOST_PORT=5433` before running compose and update `PGPORT=5433` in the backend `.env`.

The Airflow compose file sets these by default:

```
SOURCE_PGHOST=postgres-source
SOURCE_PGPORT=5432
SOURCE_PGDATABASE=example_db
SOURCE_PGUSER=postgres
SOURCE_PGPASSWORD=postgres
```

#### API reference (detailed)

Base URL: `http://localhost:${APP_PORT}` (default `http://localhost:3001`)

All endpoints return JSON. On errors, the API returns a JSON body like:

```
{
	"message": "Airflow request failed",
	"status": 502
}
```

Validation errors return `400` with a readable message.

##### Health

**GET /health**

Checks Airflow API reachability.

Response:

```
{
	"status": "ok",
	"airflow": {
		"metadatabase": { "status": "healthy" },
		"scheduler": { "status": "healthy" }
	}
}
```

##### Connections

**GET /connections**

Returns the configured Postgres connection (password is masked).

Response:

```
{
	"postgres": {
		"type": "postgres",
		"host": "localhost",
		"port": 5432,
		"database": "example_db",
		"user": "postgres",
		"password": "***",
		"passwordSet": true,
		"status": "configured"
	}
}
```

**GET /connections/test**

Tests the Postgres connection.

Response:

```
{ "status": "ok" }
```

**POST /connections/postgres**

Tests the provided Postgres connection credentials and saves them to the `.env` file if successful.

Payload:

```json
{
	"host": "localhost",
	"port": 5432,
	"database": "example_db",
	"user": "postgres",
	"password": "my_password",
	"trustServerCertificate": true
}
```

Response:

```json
{
	"status": "ok",
	"message": "Connection tested and saved successfully."
}
```

##### Source discovery (schemas/tables/columns/preview)

**GET /sources/schemas**

Response:

```
{ "schemas": ["public", "sales"] }
```

**GET /sources/tables?schema=public&includeViews=true**

Query params:
- `schema` (optional, default `public`)
- `includeViews` (optional, default `true`)

Response:

```
{
	"schema": "public",
	"tables": [
		{ "schema": "public", "name": "customers", "type": "table" },
		{ "schema": "public", "name": "active_orders", "type": "view" }
	]
}
```

**GET /sources/tables/:table/columns?schema=public**

Query params:
- `schema` (optional, default `public`)

Response:

```
{
	"schema": "public",
	"table": "orders",
	"columns": [
		{
			"name": "id",
			"dataType": "uuid",
			"isNullable": false,
			"isPrimaryKey": true,
			"ordinalPosition": 1,
			"recommendedCursor": false
		},
		{
			"name": "updated_at",
			"dataType": "timestamp with time zone",
			"isNullable": false,
			"isPrimaryKey": false,
			"ordinalPosition": 7,
			"recommendedCursor": true
		}
	]
}
```

**GET /sources/tables/:table/preview?schema=public&limit=20&columns=col1,col2**

Query params:
- `schema` (optional, default `public`)
- `limit` (optional, default `PREVIEW_ROW_LIMIT`)
- `columns` (optional, comma-separated list)

Response:

```
{
	"schema": "public",
	"table": "orders",
	"columns": ["id", "updated_at"],
	"rows": [
		{ "id": "...", "updated_at": "2026-05-01T10:11:12Z" },
		{ "id": "...", "updated_at": "2026-05-01T10:12:02Z" }
	]
}
```

##### Pipelines

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

**GET /pipelines**

Response:

```
{ "pipelines": [/* pipeline objects */] }
```

**POST /pipelines**

Creates a pipeline and writes a DAG file.

Payload:

```
{
	"name": "Orders incremental",
	"description": "Ingest orders",
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
	}
}
```

Notes:
- `source.schema` defaults to `public`.
- `ingestion.mode` is `full` or `incremental`.
- For `incremental`, `watermarkColumn` is required and must exist in the table.
- If `source.columns` is set, the `watermarkColumn` must be included.
- `destination.path` defaults to `${DELTA_BASE_PATH}/{pipelineNameSlug}`.
- `destination.mode` defaults to `overwrite` for full and `append` for incremental.

Response:

```
{ "pipeline": { /* pipeline object */ } }
```

**POST /pipelines/validate**

Validates a pipeline payload (same schema as create). Returns `{ "valid": true }` on success.

**GET /pipelines/:pipelineId**

Response:

```
{ "pipeline": { /* pipeline object */ } }
```

**PUT /pipelines/:pipelineId**

Updates a pipeline. Any field is optional.

Payload example:

```
{
	"name": "Orders hourly",
	"ingestion": {
		"mode": "incremental",
		"watermarkColumn": "updated_at"
	},
	"schedule": { "cron": "0 * * * *" }
}
```

Response:

```
{ "pipeline": { /* updated pipeline object */ } }
```

**DELETE /pipelines/:pipelineId**

Deletes a pipeline and removes its DAG file.

Response:

```
{ "status": "deleted" }
```

##### Schedules

**GET /schedules**

Query params:
- `pipelineId` (optional) - return schedule for a specific pipeline

Response:

```
{
	"dagId": "ingest_orders_incremental_ab12cd34",
	"pipelineId": "uuid",
	"schedule": "0 * * * *",
	"isPaused": false,
	"nextDagrun": "2026-05-08T11:00:00Z",
	"timetableSummary": "CRON: 0 * * * *"
}
```

##### Alerts

**GET /alerts**

Query params:
- `pipelineId` (optional) - return alerts for a specific pipeline

Response:

```
{
	"dagId": "ingest_orders_incremental_ab12cd34",
	"pipelineId": "uuid",
	"alertLevel": "ok",
	"failedRuns": [],
	"totalFailed": 0
}
```

##### Ingestion runs (global DAG)

These endpoints use `AIRFLOW_DAG_ID`.

**GET /ingestion/runs**

Query params:
- `limit` (optional)
- `offset` (optional)
- `orderBy` (optional) - e.g. `-execution_date`
- `state` (optional)

Response:

```
{
	"dagId": "ingest_postgres_to_delta",
	"totalEntries": 1,
	"runs": [
		{
			"runId": "manual__2026-05-08T10:00:00+00:00",
			"state": "success",
			"runType": "manual",
			"executionDate": "2026-05-08T10:00:00+00:00",
			"startDate": "2026-05-08T10:00:02+00:00",
			"endDate": "2026-05-08T10:00:20+00:00",
			"dataIntervalStart": null,
			"dataIntervalEnd": null,
			"conf": null
		}
	]
}
```

**POST /ingestion/runs**

Payload:

```
{
	"dagRunId": "optional_run_id",
	"conf": {
		"key": "value"
	}
}
```

Response is the raw Airflow DAG run object.

**GET /ingestion/runs/:runId**

Response:

```
{
	"runId": "manual__2026-05-08T10:00:00+00:00",
	"state": "running",
	"runType": "manual",
	"executionDate": "2026-05-08T10:00:00+00:00",
	"startDate": "2026-05-08T10:00:02+00:00",
	"endDate": null,
	"dataIntervalStart": null,
	"dataIntervalEnd": null,
	"conf": { "key": "value" }
}
```

**GET /ingestion/runs/:runId/tasks**

Response:

```
{
	"dagId": "ingest_postgres_to_delta",
	"runId": "manual__2026-05-08T10:00:00+00:00",
	"tasks": [
		{
			"taskId": "ingest",
			"state": "success",
			"tryNumber": 1,
			"startDate": "2026-05-08T10:00:02+00:00",
			"endDate": "2026-05-08T10:00:20+00:00",
			"duration": 18.0
		}
	]
}
```

##### Ingestion runs (pipeline-specific)

These endpoints use the per-pipeline DAG created at pipeline creation time.

**GET /ingestion/pipelines/:pipelineId/runs**

Same query params and response structure as `GET /ingestion/runs`, with `pipelineId` and the pipeline DAG id.

**POST /ingestion/pipelines/:pipelineId/runs**

Payload (same as global):

```
{
	"dagRunId": "optional_run_id",
	"conf": { "key": "value" }
}
```

The backend automatically injects `pipelineId` into the DAG run `conf`.

**GET /ingestion/pipelines/:pipelineId/runs/:runId**

Response includes `pipelineId` and the same run fields as the global endpoint.

**GET /ingestion/pipelines/:pipelineId/runs/:runId/tasks**

Response includes `pipelineId` and the task list.

##### Logs

**GET /logs/runs/:runId/tasks/:taskId?tryNumber=1**

Response:

```
{
	"dagId": "ingest_postgres_to_delta",
	"runId": "manual__2026-05-08T10:00:00+00:00",
	"taskId": "ingest",
	"tryNumber": 1,
	"content": "... log output ..."
}
```

**GET /logs/pipelines/:pipelineId/runs/:runId/tasks/:taskId?tryNumber=1**

Same response as above, with `pipelineId` and the pipeline DAG id.
