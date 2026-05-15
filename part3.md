## Part 3: The Data Plane (Spark/Python)

### 5. Data Plane Class Diagram

This diagram illustrates the Object-Oriented Python application running inside the isolated Kubernetes Spark Driver Pods. It enforces a modular plugin pattern for data extraction via `ISourceReader`.

```mermaid
classDiagram
    direction TB

    class IngestionJob {
        -run_id str
        -pipeline_id str
        +execute()
    }

    class LateBindingClient {
        -api_url str
        -api_key str
        +fetch_runtime_config(pipeline_id, run_id) dict
    }

    class SparkSessionFactory {
        +create_session(s3_config) SparkSession
    }

    class ISourceReader {
        <<interface>>
        +read(spark, schema, table, watermark) DataFrame
    }

    class JDBCSourceReader {
        -credentials dict
        +read() DataFrame
    }
    
    class SalesforceSourceReader {
        -oauth_token dict
        +read() DataFrame
    }

    class DeltaDestinationWriter {
        -s3_keys dict
        +write(df, dest_path, mode)
    }

    IngestionJob --> LateBindingClient : 1. Fetches secrets
    IngestionJob --> SparkSessionFactory : 2. Starts Spark Engine
    IngestionJob --> ISourceReader : 3. Extracts data
    ISourceReader <|-- JDBCSourceReader : implements
    ISourceReader <|-- SalesforceSourceReader : implements
    IngestionJob --> DeltaDestinationWriter : 4. Saves data
```