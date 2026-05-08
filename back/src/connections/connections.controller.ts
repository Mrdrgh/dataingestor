import { Controller, Get, Post, Body } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { PostgresConnectionDto } from './dto/postgres-connection.dto';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  getConnections(): Record<string, unknown> {
    return {
      postgres: this.connections.getPostgresConnection(),
    };
  }

  @Get('test')
  async testConnection(): Promise<Record<string, unknown>> {
    await this.connections.testPostgresConnection();
    return { status: 'ok' };
  }

  @Post('postgres')
  async setupPostgresConnection(@Body() dto: PostgresConnectionDto): Promise<Record<string, unknown>> {
    await this.connections.setupPostgresConnection(dto);
    return { status: 'ok', message: 'Connection tested and saved successfully.' };
  }
}
