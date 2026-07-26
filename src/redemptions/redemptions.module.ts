import { Module } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service.js';
import { RedemptionsController } from './redemptions.controller.js';
import { VenuesModule } from '../venues/venues.module.js';

@Module({
  imports: [VenuesModule],
  controllers: [RedemptionsController],
  providers: [RedemptionsService],
  exports: [RedemptionsService],
})
export class RedemptionsModule {}
