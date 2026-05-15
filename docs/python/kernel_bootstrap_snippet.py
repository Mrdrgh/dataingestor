def build_bootstrap_code(s3_keys, spark_conf):
    lines = [
        "import os",
        "# Inject S3 credentials into the kernel process",
        f"os.environ['AWS_ACCESS_KEY_ID'] = '{s3_keys.get('access_key', '')}'",
        f"os.environ['AWS_SECRET_ACCESS_KEY'] = '{s3_keys.get('secret_key', '')}'",
        f"os.environ['AWS_ENDPOINT_URL'] = '{s3_keys.get('endpoint', '')}'",
        "",
        "# Apply Spark configuration",
    ]
    for key, value in spark_conf.items():
        lines.append(f"os.environ['SPARK_CONF_{key.upper()}'] = '{value}'")
    return "\n".join(lines)


def bootstrap_kernel(session, s3_keys, spark_conf):
    code = build_bootstrap_code(s3_keys, spark_conf)
    # The session.execute method should support silent execution.
    return session.execute(code, silent=True)
