import base64
import json
import os
from datetime import datetime

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

PIPELINE_CONFIG_STR = base64.b64decode("eyJpZCI6IjJhZDg0MWQ1LTgzMDUtNDNlZS04MTg4LTY5OTY5MTZmNWVjNiIsIm5hbWUiOiJmdXNpb25fZm9yZ2VfZGJfaW5nZXN0aW9uIiwiZGVzY3JpcHRpb24iOm51bGwsImNyZWF0ZWRBdCI6IjIwMjYtMDUtMDhUMTU6MDE6MDEuNDI2WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDUtMDhUMTU6MDE6MDEuNDI2WiIsInNvdXJjZSI6eyJzY2hlbWEiOiJwdWJsaWMiLCJ0YWJsZSI6ImZvcmdlX3VzZXJzIiwiY29sdW1ucyI6W119LCJpbmdlc3Rpb24iOnsibW9kZSI6ImluY3JlbWVudGFsIiwid2F0ZXJtYXJrQ29sdW1uIjoiaWQifSwiZGVzdGluYXRpb24iOnsicGF0aCI6Ii4uL2RlbHRhL2Z1c2lvbl9jYXRhbG9nL3Jhdy9mb3JnZV91c2VycyIsIm1vZGUiOiJhcHBlbmQifSwic2NoZWR1bGUiOnsiY3JvbiI6IjAgKiAqICogKiJ9LCJkYWciOnsiZGFnSWQiOiJpbmdlc3RfZnVzaW9uX2ZvcmdlX2RiX2luZ2VzdGlvbl8yYWQ4NDFkNSIsImZpbGVQYXRoIjoiLi4vYWlyZmxvdy9kYWdzL2luZ2VzdF9mdXNpb25fZm9yZ2VfZGJfaW5nZXN0aW9uXzJhZDg0MWQ1LnB5In19").decode("utf-8")

with DAG(
    dag_id="ingest_fusion_forge_db_ingestion_2ad841d5",
    schedule_interval='0 * * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=False,
    tags=["ingestion"],
) as dag:
    start = EmptyOperator(task_id="start")
    
    env = os.environ.copy()
    env.update({
        "SOURCE_PGHOST": "4.tcp.eu.ngrok.io",
        "SOURCE_PGPORT": "23077",
        "SOURCE_PGDATABASE": "fusion_forge_db",
        "SOURCE_PGUSER": "postgres",
        "SOURCE_PGPASSWORD": "DevPassword123!",
    })

    ingest = BashOperator(
        task_id="ingest",
        bash_command=f"python /opt/airflow/dags/spark_ingest.py '{PIPELINE_CONFIG_STR}'",
    )
    
    finish = EmptyOperator(task_id="finish")

    start >> ingest >> finish
