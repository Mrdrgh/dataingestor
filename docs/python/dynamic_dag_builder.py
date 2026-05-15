import os
import time
import requests
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.spark_kubernetes import SparkKubernetesOperator

INTERNAL_API_URL = os.getenv("INTERNAL_API_URL", "http://backend:3001/internal")
AUTH_MODE = os.getenv("INTERNAL_API_AUTH_MODE", "api_key")
API_KEY = os.getenv("INTERNAL_API_KEY", "")
JWT = os.getenv("INTERNAL_API_JWT", "")
CACHE_TTL_SEC = int(os.getenv("PIPELINE_CACHE_TTL_SEC", "60"))
SPARK_NAMESPACE = os.getenv("SPARK_NAMESPACE", "data-platform")

_cached = []
_last_fetch = 0.0


def _headers():
    if AUTH_MODE == "jwt" and JWT:
        return {"authorization": f"Bearer {JWT}"}
    if API_KEY:
        return {"x-api-key": API_KEY}
    return {}


def fetch_active_pipelines():
    global _cached, _last_fetch
    now = time.time()
    if _cached and (now - _last_fetch) < CACHE_TTL_SEC:
        return _cached

    res = requests.get(
        f"{INTERNAL_API_URL}/pipelines/active",
        headers=_headers(),
        timeout=10,
    )
    res.raise_for_status()
    _cached = res.json()
    _last_fetch = now
    return _cached


def build_spark_application(pipeline, run_id_template):
    return {
        "apiVersion": "sparkoperator.k8s.io/v1beta2",
        "kind": "SparkApplication",
        "metadata": {
            "name": f"ingest-{pipeline['id']}-{run_id_template}",
            "namespace": SPARK_NAMESPACE,
        },
        "spec": {
            "type": "Python",
            "mode": "cluster",
            "image": pipeline.get("execution_image"),
            "mainApplicationFile": "local:///opt/spark/jobs/main.py",
            "arguments": ["--run-id", "{{ run_id }}", "--pipeline-id", pipeline["id"]],
            "dynamicAllocation": {
                "enabled": True,
                "initialExecutors": 1,
                "minExecutors": 0,
                "maxExecutors": 10,
            },
            "driver": {
                "cores": 1,
                "memory": "1024m",
                "env": [
                    {"name": "INTERNAL_API_URL", "value": INTERNAL_API_URL},
                    {"name": "INTERNAL_API_AUTH_MODE", "value": AUTH_MODE},
                    {"name": "INTERNAL_API_KEY", "value": API_KEY},
                    {"name": "INTERNAL_API_JWT", "value": JWT},
                ],
            },
            "executor": {
                "cores": 2,
                "memory": "4096m",
            },
        },
    }


def build_dags():
    run_id_template = "{{ run_id | lower | regex_replace('[^a-z0-9-]', '-') }}"
    for pipeline in fetch_active_pipelines():
        dag_id = f"ingest_{pipeline['id']}"
        schedule = pipeline.get("schedule_cron")

        default_args = {
            "owner": "platform",
            "depends_on_past": False,
            "start_date": datetime(2024, 1, 1),
            "retries": 1,
            "retry_delay": timedelta(minutes=5),
        }

        dag = DAG(
            dag_id=dag_id,
            default_args=default_args,
            schedule_interval=schedule,
            catchup=False,
            tags=["dynamic", pipeline.get("type", "unknown")],
        )

        spark_app = build_spark_application(pipeline, run_id_template)

        SparkKubernetesOperator(
            task_id="run_distributed_ingestion",
            namespace=SPARK_NAMESPACE,
            application_file=spark_app,
            do_xcom_push=True,
            dag=dag,
        )

        globals()[dag_id] = dag


build_dags()
