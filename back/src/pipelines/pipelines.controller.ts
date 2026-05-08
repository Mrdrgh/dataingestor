import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { ValidatePipelineDto } from './dto/validate-pipeline.dto';
import { PipelinesService } from './pipelines.service';

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Get()
  async listPipelines(): Promise<Record<string, unknown>> {
    const pipelines = await this.pipelines.list();
    return { pipelines };
  }

  @Post()
  async createPipeline(
    @Body() body: CreatePipelineDto,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.create(body);
    return { pipeline };
  }

  @Get(':pipelineId')
  async getPipeline(
    @Param('pipelineId') pipelineId: string,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    return { pipeline };
  }

  @Put(':pipelineId')
  async updatePipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() body: UpdatePipelineDto,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.update(pipelineId, body);
    return { pipeline };
  }

  @Delete(':pipelineId')
  async deletePipeline(
    @Param('pipelineId') pipelineId: string,
  ): Promise<Record<string, unknown>> {
    await this.pipelines.delete(pipelineId);
    return { status: 'deleted' };
  }

  @Post('validate')
  async validatePipeline(
    @Body() body: ValidatePipelineDto,
  ): Promise<Record<string, unknown>> {
    const result = await this.pipelines.validate(body);
    return result;
  }
}
