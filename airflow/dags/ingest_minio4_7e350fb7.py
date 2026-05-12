import os
from datetime import datetime

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="ingest_minio4_7e350fb7",
    schedule_interval='0 * * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=False,
    tags=["ingestion"],
) as dag:
    start = EmptyOperator(task_id="start")

    env = os.environ.copy()
    env.update({
        "SOURCE_PGHOST": "6.tcp.eu.ngrok.io",
        "SOURCE_PGPORT": "29555",
        "SOURCE_PGDATABASE": "fusion_forge_db",
        "SOURCE_PGUSER": "postgres",
        "SOURCE_PGPASSWORD": "DevPassword123!",
    })

    ingest = BashOperator(
        task_id="ingest",
        bash_command="python /opt/airflow/dags/spark_ingest.py --config '/opt/airflow/spark/jobs/ingest_minio4_7e350fb7.json'",
        env=env,
    )

    finish = EmptyOperator(task_id="finish")

    start >> ingest >> finish
