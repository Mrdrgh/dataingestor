# Architecture Deep Dive: Implementation Blueprints

This document provides the code-level blueprints for the three most complex mechanisms proposed in the scalable architecture plan.

---

## Deep Dive 1: The NestJS Connector Registry

Instead of hardcoding PostgreSQL logic into services, we use a Registry Pattern. This allows the core platform to remain completely ignorant of the underlying database technologies.

### 1. The Interface (`src/connectors/interfaces/connector.interface.ts`)
Every new source (Postgres, Salesforce, SAP) must implement this strict contract.

```typescript
export interface SchemaDef {
  name: string;
  tables: { name: string; type: 'table' | 'view' }[];
}

export interface IConnector {
  /** The unique identifier for this plugin (e.g., 'postgres', 'salesforce') */
  readonly type: string;

  /** Returns the specific Docker image required to execute ingestions for this source */
  getExecutionImage(): string;

  /** Validates if the provided JSON configuration is syntactically correct */
  validateConfig(config: any): boolean;

  /** Actively tests the connection to the source */
  testConnection(config: any, credentials: any): Promise<boolean>;

  /** Extracts the metadata required for the UI to build pipelines */
  discoverSchemas(config: any, credentials: any): Promise<SchemaDef[]>;
  
  /** Extracts column definitions for a specific table */
  discoverColumns(config: any, credentials: any, schema: string, table: string): Promise<any[]>;
}
```

### 2. The Registry (`src/connectors/connector.registry.ts`)
This service acts as the central hub. All plugins register themselves here upon startup.

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IConnector } from './interfaces/connector.interface';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors = new Map<string, IConnector>();

  register(connector: IConnector) {
    this.connectors.set(connector.type, connector);
  }

  getConnector(type: string): IConnector {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new NotFoundException(`Connector type '${type}' is not supported.`);
    }
    return connector;
  }

  getAvailableConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }
}
```

### 3. Usage in a Controller
When the frontend requests schemas, the backend no longer queries Postgres directly. It asks the registry for the right plugin.

```typescript
// features/pipelines/pipelines.service.ts
async getSchemasForPipeline(pipelineId: string) {
  const pipeline = await this.db.getPipeline(pipelineId);
  const connection = await this.db.getConnection(pipeline.source_connection_id);
  const credentials = await this.crypto.decrypt(connection.credentials);
  
  // Magic happens here: The core platform doesn't know what database it is talking to!
  const connector = this.registry.getConnector(connection.type);
  return connector.discoverSchemas(connection.config, credentials);
}
```

---

## Deep Dive 2: Dynamic Airflow DAG Factory

Currently, `PipelinesService.writeDagFile()` generates a physical `.py` file for every pipeline. This does not scale. Instead, we write **one** Python file in Airflow that dynamically generates DAGs based on the NestJS database.

### `airflow/dags/dynamic_dag_builder.py`

```python
import os
import requests
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

# 1. Fetch active pipelines from the NestJS Internal API
INTERNAL_API_URL = os.environ.get("INTERNAL_API_URL", "http://backend:3001/internal")
API_KEY = os.environ.get("INTERNAL_API_KEY", "super-secret-key")

try:
    response = requests.get(
        f"{INTERNAL_API_URL}/pipelines/active",
        headers={"x-api-key": API_KEY},
        timeout=10
    )
    response.raise_for_status()
    active_pipelines = response.json()
except Exception as e:
    print(f"Failed to fetch pipelines from backend: {e}")
    active_pipelines = []

# 2. Loop through the response and build DAG objects in memory
for pipeline in active_pipelines:
    dag_id = f"ingest_{pipeline['id']}"
    schedule = pipeline.get('schedule_cron')
    execution_image = pipeline.get('execution_image') # Provided by the ConnectorRegistry
    
    default_args = {
        'owner': 'fusion',
        'depends_on_past': False,
        'start_date': datetime(2024, 1, 1),
        'retries': 1,
        'retry_delay': timedelta(minutes=5),
    }

    # Create the DAG
    dag = DAG(
        dag_id=dag_id,
        default_args=default_args,
        schedule_interval=schedule,
        catchup=False,
        tags=['dynamic', pipeline['type']],
    )

    # 3. Create the decoupled Executor Pod
    # This spins up an isolated Docker container just for this run
    ingest_task = KubernetesPodOperator(
        task_id="run_ingestion",
        name=f"ingest-pod-{pipeline['id']}",
        namespace='data-platform',
        image=execution_image, # e.g., 'fusion/ingest-postgres:latest'
        cmds=["python", "main.py"],
        arguments=["--run-id", "{{ run_id }}", "--pipeline-id", pipeline['id']],
        env_vars={
            "INTERNAL_API_URL": INTERNAL_API_URL,
            "INTERNAL_API_KEY": API_KEY # Only used to fetch the real credentials
        },
        get_logs=True,
        is_delete_operator_pod=True, # Clean up the pod after success/failure
        dag=dag,
    )

    # 4. Airflow Magic: Register the DAG in the global namespace
    globals()[dag_id] = dag
```

---

## Deep Dive 3: Zero-Trust Late Binding Security

If the Airflow DAG no longer has the `SOURCE_PGPASSWORD` injected into it, how does the `KubernetesPodOperator` actually connect to the database? 

It uses **Late-Binding**. The executor pod wakes up "dumb" and requests its configuration just-in-time.

### The Execution Bootstrapper (`main.py` inside the Executor Image)

```python
import argparse
import requests
import os
from your_specific_connector_logic import run_extraction

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args()

    # 1. Fetch the decrypted runtime configuration
    internal_api = os.environ["INTERNAL_API_URL"]
    api_key = os.environ["INTERNAL_API_KEY"]
    
    res = requests.get(
        f"{internal_api}/pipelines/{args.pipeline_id}/runtime-config?runId={args.run_id}",
        headers={"x-api-key": api_key}
    )
    config_payload = res.json()
    
    # Payload contains:
    # {
    #    "source_credentials": { "host": "...", "password": "decrypted_password" },
    #    "destination_credentials": { "s3_access_key": "...", "s3_secret_key": "..." },
    #    "pipeline_config": { "schema": "public", "table": "orders", "watermark": "2024-01-01" }
    # }

    # 2. Run the extraction using the temporary credentials in memory
    run_extraction(
        source=config_payload["source_credentials"],
        dest=config_payload["destination_credentials"],
        config=config_payload["pipeline_config"]
    )

if __name__ == "__main__":
    main()
```

### Why this is the ultimate security model:
1. Credentials are never written to disk (`.env` or `.json` files).
2. Credentials are never stored in Airflow Connections or Airflow Variables.
3. Credentials never appear in Airflow UI Logs or Environment Tabs.
4. The payload exists purely in the memory of the isolated Executor Pod for the duration of the run, and is destroyed when the pod completes.

---

## Deep Dive 4: Distributed Spark & Dynamic Allocation on Kubernetes

A standard `KubernetesPodOperator` limits Spark to running in Local Mode within a single pod. To process massive datasets, we must submit a `SparkApplication` custom resource to Kubernetes.

By enabling **Dynamic Allocation**, the Spark Driver pod will monitor task backlogs. If tasks queue up, it will ask the Kubernetes API to launch more Executor pods. When executors are idle for 60 seconds, they are destroyed, saving cloud compute costs.

### Modifying the Airflow DAG for Native Spark

```python
from airflow.providers.cncf.kubernetes.operators.spark_kubernetes import SparkKubernetesOperator

# ... Inside dynamic_dag_builder.py loop ...

spark_app_yaml = {
    "apiVersion": "sparkoperator.k8s.io/v1beta2",
    "kind": "SparkApplication",
    "metadata": {
        "name": f"ingest-{pipeline['id']}-{{{{ run_id | lower | regex_replace('[^a-z0-9-]', '-') }}}}",
        "namespace": "data-platform"
    },
    "spec": {
        "type": "Python",
        "mode": "cluster",
        "image": execution_image, # Provided by ConnectorRegistry (e.g., fusion/ingest-postgres:latest)
        "mainApplicationFile": "local:///opt/spark/jobs/main.py",
        "arguments": ["--run-id", "{{ run_id }}", "--pipeline-id", pipeline['id']],
        "dynamicAllocation": {
            "enabled": True,
            "initialExecutors": 1,
            "minExecutors": 0,
            "maxExecutors": 10 # Caps the scale-out to prevent runaway cluster costs
        },
        "driver": {
            "cores": 1,
            "memory": "1024m",
            "env": [
                {"name": "INTERNAL_API_URL", "value": INTERNAL_API_URL},
                {"name": "INTERNAL_API_KEY", "value": API_KEY}
            ]
        },
        "executor": {
            "cores": 2,
            "memory": "4096m"
        }
    }
}

ingest_task = SparkKubernetesOperator(
    task_id='run_distributed_ingestion',
    namespace='data-platform',
    application_file=spark_app_yaml,
    do_xcom_push=True,
    dag=dag,
)
```

This transforms the platform from running "Dockerized Scripts" into orchestrating true Big Data distributed processing environments on demand.