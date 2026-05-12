FROM apache/airflow:2.8.1-python3.10

ARG HADOOP_AWS_VERSION=3.3.4
ARG AWS_SDK_BUNDLE_VERSION=1.12.262

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

# Download Postgres JDBC driver and S3A dependencies
RUN mkdir -p /opt/spark/jars && \
    curl -L https://jdbc.postgresql.org/download/postgresql-42.7.1.jar \
      -o /opt/spark/jars/postgresql-42.7.1.jar && \
    curl -L https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/${HADOOP_AWS_VERSION}/hadoop-aws-${HADOOP_AWS_VERSION}.jar \
      -o /opt/spark/jars/hadoop-aws-${HADOOP_AWS_VERSION}.jar && \
    curl -L https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/${AWS_SDK_BUNDLE_VERSION}/aws-java-sdk-bundle-${AWS_SDK_BUNDLE_VERSION}.jar \
      -o /opt/spark/jars/aws-java-sdk-bundle-${AWS_SDK_BUNDLE_VERSION}.jar

USER airflow

# Install PySpark, Delta-Spark, and Postgres provider
RUN pip install --no-cache-dir \
    "pyspark==3.5.0" \
    "delta-spark==3.1.0" \
    "apache-airflow-providers-postgres" \
    "psycopg2-binary"
