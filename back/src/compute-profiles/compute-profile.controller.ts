import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ComputeProfileService } from './compute-profile.service';
import { CreateComputeProfileDto } from './dto/create-compute-profile.dto';
import { UpdateComputeProfileDto } from './dto/update-compute-profile.dto';

@Controller('compute-profiles')
export class ComputeProfileController {
  constructor(private readonly service: ComputeProfileService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateComputeProfileDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComputeProfileDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { status: 'ok' };
  }

  @Post(':id/test')
  testConnection(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.testConnection(id);
  }
}
