import { Module } from '@nestjs/common';
import { PerksService } from './perks.service.js';
import { PerksController } from './perks.controller.js';
import { VenuesModule } from '../venues/venues.module.js';

@Module({
  imports: [VenuesModule],
  controllers: [PerksController],
  providers: [PerksService],
  exports: [PerksService],
})
export class PerksModule {}
