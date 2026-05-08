import { Controller, Get } from '@nestjs/common';
import { AirflowService } from '../airflow/airflow.service';

@Controller('health')
export class HealthController {
  constructor(private readonly airflow: AirflowService) {}

  @Get()
  async getHealth(): Promise<Record<string, unknown>> {
    const airflow = await this.airflow.getHealth();
    return {
      status: 'ok',
      airflow,
    };
  }
}
