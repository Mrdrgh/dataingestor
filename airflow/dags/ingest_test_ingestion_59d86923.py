import base64
import json
import os
from datetime import datetime

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

PIPELINE_CONFIG_STR = base64.b64decode("eyJpZCI6IjU5ZDg2OTIzLWFkODEtNGQ1Yy1hODBjLTVlNTg5YzllMzQ1OCIsIm5hbWUiOiJ0ZXN0X2luZ2VzdGlvbiIsImRlc2NyaXB0aW9uIjpudWxsLCJjcmVhdGVkQXQiOiIyMDI2LTA1LTA4VDE0OjQ2OjU3LjE4NFoiLCJ1cGRhdGVkQXQiOiIyMDI2LTA1LTA4VDE0OjQ2OjU3LjE4NFoiLCJzb3VyY2UiOnsic2NoZW1hIjoicHVibGljIiwidGFibGUiOiJhY2hyYWZfZGF0YSIsImNvbHVtbnMiOltdfSwiaW5nZXN0aW9uIjp7Im1vZGUiOiJpbmNyZW1lbnRhbCIsIndhdGVybWFya0NvbHVtbiI6ImlkIn0sImRlc3RpbmF0aW9uIjp7InBhdGgiOiIuLi9kZWx0YS9mdXNpb25fY2F0YWxvZy9yYXcvYWNocmFmX2RhdGEiLCJtb2RlIjoiYXBwZW5kIn0sInNjaGVkdWxlIjp7ImNyb24iOm51bGx9LCJkYWciOnsiZGFnSWQiOiJpbmdlc3RfdGVzdF9pbmdlc3Rpb25fNTlkODY5MjMiLCJmaWxlUGF0aCI6Ii4uL2FpcmZsb3cvZGFncy9pbmdlc3RfdGVzdF9pbmdlc3Rpb25fNTlkODY5MjMucHkifX0=").decode("utf-8")

with DAG(
    dag_id="ingest_test_ingestion_59d86923",
    schedule_interval=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,
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
