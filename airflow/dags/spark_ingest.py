import argparse
import json
import os
import sys
from pathlib import Path


def get_spark_session():
    import pyspark
    from delta import configure_spark_with_delta_pip

    packages = build_spark_packages()
    local_jars = build_local_jars()
    builder = (
        pyspark.sql.SparkSession.builder.appName("DataIngestion")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
    )

    if local_jars:
        builder = builder.config("spark.jars", ",".join(local_jars))

    if packages:
        builder = builder.config("spark.jars.packages", packages)

    for key, value in build_s3a_config().items():
        builder = builder.config(key, value)

    return configure_spark_with_delta_pip(builder).getOrCreate()


def parse_args():
    parser = argparse.ArgumentParser(description="Run Spark ingestion for a generated pipeline config.")
    parser.add_argument("inline_config", nargs="?", help="Inline JSON config (legacy mode).")
    parser.add_argument("--config", dest="config_path", help="Path to pipeline config file.")
    return parser.parse_args()


def load_config(args):
    if args.config_path:
        with open(args.config_path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    if args.inline_config:
        return json.loads(args.inline_config)

    print("Usage: python spark_ingest.py --config /opt/airflow/spark/jobs/<dag_id>.json")
    sys.exit(1)


def resolve_runtime_delta_path(raw_path):
    if not raw_path:
        raise ValueError("Destination path is required")

    if raw_path.startswith("s3a://"):
        return raw_path

    base_path = os.environ.get("DELTA_BASE_PATH")
    if base_path and base_path.startswith("s3a://"):
        relative = strip_delta_prefix(raw_path)
        return join_paths(base_path, relative)

    if raw_path.startswith("/opt/airflow/delta"):
        return raw_path

    if raw_path.startswith("../airflow_spark_delta/delta"):
        return raw_path.replace("../airflow_spark_delta/delta", "/opt/airflow/delta", 1)

    if raw_path.startswith("../delta"):
        return raw_path.replace("../delta", "/opt/airflow/delta", 1)

    return raw_path


def strip_delta_prefix(raw_path):
    for prefix in (
        "/opt/airflow/delta",
        "../airflow_spark_delta/delta",
        "../delta",
    ):
        if raw_path.startswith(prefix):
            return raw_path[len(prefix):]
    return raw_path


def join_paths(base_path, suffix):
    base = base_path.rstrip("/")
    tail = suffix.lstrip("/")
    if not tail:
        return base
    return f"{base}/{tail}"


def build_spark_packages():
    if os.environ.get("MINIO_ENDPOINT"):
        hadoop_aws = os.environ.get("HADOOP_AWS_VERSION", "3.3.4")
        aws_bundle = os.environ.get("AWS_SDK_BUNDLE_VERSION", "1.12.262")
        default_packages = (
            f"org.apache.hadoop:hadoop-aws:{hadoop_aws},"
            f"com.amazonaws:aws-java-sdk-bundle:{aws_bundle}"
        )
        packages = os.environ.get("SPARK_JARS_PACKAGES")
        if packages:
            if packages == default_packages and has_local_s3a_jars():
                return ""
            return packages
        if has_local_s3a_jars():
            return ""
        return default_packages

    packages = os.environ.get("SPARK_JARS_PACKAGES")
    if packages:
        return packages

    return ""


def build_local_jars():
    jars = []
    base_dir = Path("/opt/spark/jars")
    postgres_jar = base_dir / "postgresql-42.7.1.jar"
    if postgres_jar.exists():
        jars.append(str(postgres_jar))

    jars.extend(str(path) for path in base_dir.glob("hadoop-aws-*.jar"))
    jars.extend(str(path) for path in base_dir.glob("aws-java-sdk-bundle-*.jar"))

    return jars


def has_local_s3a_jars():
    jars_dir = Path("/opt/spark/jars")
    if not jars_dir.exists():
        return False

    has_hadoop = any(jars_dir.glob("hadoop-aws-*.jar"))
    has_aws_bundle = any(jars_dir.glob("aws-java-sdk-bundle-*.jar"))
    return has_hadoop and has_aws_bundle


def build_s3a_config():
    endpoint = os.environ.get("MINIO_ENDPOINT")
    access_key = os.environ.get("MINIO_ROOT_USER")
    secret_key = os.environ.get("MINIO_ROOT_PASSWORD")
    if not endpoint or not access_key or not secret_key:
        return {}

    use_ssl = os.environ.get("MINIO_USE_SSL", "false").lower() == "true"
    path_style = os.environ.get("MINIO_PATH_STYLE", "true").lower() == "true"
    region = os.environ.get("MINIO_REGION", "us-east-1")

    return {
        "spark.hadoop.fs.s3a.endpoint": endpoint,
        "spark.hadoop.fs.s3a.access.key": access_key,
        "spark.hadoop.fs.s3a.secret.key": secret_key,
        "spark.hadoop.fs.s3a.path.style.access": "true" if path_style else "false",
        "spark.hadoop.fs.s3a.connection.ssl.enabled": "true" if use_ssl else "false",
        "spark.hadoop.fs.s3a.aws.credentials.provider": "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider",
        "spark.hadoop.fs.s3a.endpoint.region": region,
        "spark.delta.logStore.class": "org.apache.spark.sql.delta.storage.S3SingleDriverLogStore",
    }


def build_source_config():
    host = os.environ.get("SOURCE_PGHOST") or os.environ.get("PGHOST", "localhost")
    port = os.environ.get("SOURCE_PGPORT") or os.environ.get("PGPORT", "5432")
    database = os.environ.get("SOURCE_PGDATABASE") or os.environ.get("PGDATABASE", "example_db")
    user = os.environ.get("SOURCE_PGUSER") or os.environ.get("PGUSER", "postgres")
    password = os.environ.get("SOURCE_PGPASSWORD") or os.environ.get("PGPASSWORD", "postgres")

    return {
        "url": f"jdbc:postgresql://{host}:{port}/{database}",
        "properties": {
            "user": user,
            "password": password,
            "driver": "org.postgresql.Driver",
        },
    }


def state_file_path(pipeline_id):
    safe_pipeline_id = pipeline_id.replace("/", "_")
    return Path("/opt/airflow/spark/state") / f"{safe_pipeline_id}.json"


def read_last_watermark(pipeline_id):
    file_path = state_file_path(pipeline_id)
    if not file_path.exists():
        return None

    with open(file_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("last_watermark")


def write_last_watermark(pipeline_id, watermark):
    if watermark is None:
        return

    file_path = state_file_path(pipeline_id)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as handle:
        json.dump({"last_watermark": str(watermark)}, handle, indent=2)


def main():
    args = parse_args()
    config = load_config(args)

    pipeline_id = config.get("pipelineId", "unknown_pipeline")
    source = config.get("source", {})
    ingestion = config.get("ingestion", {})
    destination = config.get("destination", {})

    schema = source.get("schema", "public")
    table = source.get("table")
    columns = source.get("columns") or []
    mode = ingestion.get("mode", "full")
    watermark_column = ingestion.get("watermarkColumn")
    dest_path = resolve_runtime_delta_path(destination.get("path"))
    write_mode = destination.get("mode", "overwrite")

    if not table:
        raise ValueError("Source table is required")

    source_cfg = build_source_config()
    spark = get_spark_session()

    table_expr = f"{schema}.{table}"
    if mode == "incremental" and watermark_column:
        last_watermark = read_last_watermark(pipeline_id)
        predicate = None
        if last_watermark:
            predicate = f"{watermark_column} > '{last_watermark}'"
            print(f"Applying incremental predicate: {predicate}")

        df = spark.read.jdbc(
            url=source_cfg["url"],
            table=table_expr,
            predicates=[predicate] if predicate else None,
            properties=source_cfg["properties"],
        )
    else:
        df = spark.read.jdbc(
            url=source_cfg["url"],
            table=table_expr,
            properties=source_cfg["properties"],
        )

    if columns:
        df = df.select(*columns)

    print(f"Writing to Delta at {dest_path} with mode {write_mode}")
    df.write.format("delta").mode(write_mode).save(dest_path)

    if mode == "incremental" and watermark_column:
        watermark_row = df.agg({watermark_column: "max"}).collect()[0]
        max_watermark = watermark_row[0]
        write_last_watermark(pipeline_id, max_watermark)

    print("Ingestion completed successfully.")


if __name__ == "__main__":
    main()
