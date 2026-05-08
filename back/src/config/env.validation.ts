import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_PORT: Joi.number().default(3001),

  AIRFLOW_BASE_URL: Joi.string().uri().required(),
  AIRFLOW_DAG_ID: Joi.string().min(1).required(),
  AIRFLOW_AUTH_TYPE: Joi.string()
    .valid('none', 'basic', 'bearer')
    .default('none'),
  AIRFLOW_USERNAME: Joi.when('AIRFLOW_AUTH_TYPE', {
    is: 'basic',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  AIRFLOW_PASSWORD: Joi.when('AIRFLOW_AUTH_TYPE', {
    is: 'basic',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  AIRFLOW_TOKEN: Joi.when('AIRFLOW_AUTH_TYPE', {
    is: 'bearer',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  AIRFLOW_TIMEOUT_MS: Joi.number().default(10000),
  AIRFLOW_DAGS_DIR: Joi.string().default('../airflow/dags'),

  PGHOST: Joi.string().required(),
  PGPORT: Joi.number().default(5432),
  PGDATABASE: Joi.string().required(),
  PGUSER: Joi.string().required(),
  PGPASSWORD: Joi.string().required(),

  PIPELINES_FILE: Joi.string().default('./data/pipelines.json'),
  PREVIEW_ROW_LIMIT: Joi.number().default(20),
  DELTA_BASE_PATH: Joi.string().default('../delta'),
});
