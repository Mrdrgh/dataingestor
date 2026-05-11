import { Module } from '@nestjs/common';
import { ComputeProfileController } from './compute-profile.controller';
import { ComputeProfileService } from './compute-profile.service';

@Module({
  controllers: [ComputeProfileController],
  providers: [ComputeProfileService],
  exports: [ComputeProfileService],
})
export class ComputeProfileModule {}
