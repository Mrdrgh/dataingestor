FROM apache/airflow:2.8.1-python3.10

USER root

# Install OpenJDK 17 and curl for Spark
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
         openjdk-17-jre-headless \
         curl \
  && apt-get autoremove -yqq --purge \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Download Postgres JDBC driver
RUN mkdir -p /opt/spark/jars && \
    curl -L https://jdbc.postgresql.org/download/postgresql-42.7.1.jar -o /opt/spark/jars/postgresql-42.7.1.jar

USER airflow

# Install PySpark, Delta-Spark, and Postgres provider
RUN pip install --no-cache-dir \
    "pyspark==3.5.0" \
    "delta-spark==3.1.0" \
    "apache-airflow-providers-postgres" \
    "psycopg2-binary"
