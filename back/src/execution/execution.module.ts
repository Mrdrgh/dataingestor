import { Module } from '@nestjs/common';
import { ComputeProfileModule } from '../compute-profiles/compute-profile.module';
import { ExecutionGateway } from './execution.gateway';
import { KernelAdapterService } from './kernel-adapter.service';

@Module({
  imports: [ComputeProfileModule],
  providers: [ExecutionGateway, KernelAdapterService],
})
export class ExecutionModule {}
